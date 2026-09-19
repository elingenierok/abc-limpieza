-- =========================================================
-- T-004 · Módulo Clientes · Ampliación + direcciones
-- Depende de: 003_pedidos.sql (que creó el stub de clientes)
-- Estrategia: ALTER TABLE + migración de datos + DROP de columnas obsoletas
-- =========================================================

-- 1. Ampliación de clientes
alter table public.clientes
  add column if not exists nombre_fantasia text,
  add column if not exists condicion_iva   text,
  add column if not exists limite_credito  numeric not null default 0;

-- 2. Constraint de condicion_iva (después de crear la columna)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_condicion_iva_check'
  ) then
    alter table public.clientes
      add constraint clientes_condicion_iva_check
      check (condicion_iva in (
        'RESPONSABLE_INSCRIPTO','MONOTRIBUTO','EXENTO','CONSUMIDOR_FINAL'
      ));
  end if;
end $$;

-- Default para filas nuevas y existentes sin valor
update public.clientes set condicion_iva = 'CONSUMIDOR_FINAL' where condicion_iva is null;
alter table public.clientes alter column condicion_iva set default 'CONSUMIDOR_FINAL';

-- 3. UNIQUE en cuit (permitiendo múltiples NULL)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_cuit_unique'
  ) then
    alter table public.clientes
      add constraint clientes_cuit_unique unique (cuit);
  end if;
end $$;

-- 4. Tabla de direcciones
create table if not exists public.cliente_direcciones (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  etiqueta      text not null,
  direccion     text not null,
  localidad     text not null,
  provincia     text not null,
  es_principal  boolean not null default false,
  creado_en     timestamptz not null default now()
);

create index if not exists idx_cli_dir_cliente on public.cliente_direcciones(cliente_id);

-- 5. Migración: direccion existente → cliente_direcciones
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clientes' and column_name='direccion'
  ) then
    insert into public.cliente_direcciones
      (cliente_id, etiqueta, direccion, localidad, provincia, es_principal)
    select id, 'Principal', direccion, '—', '—', true
    from public.clientes
    where direccion is not null and direccion <> ''
      and not exists (
        select 1 from public.cliente_direcciones cd where cd.cliente_id = clientes.id
      );

    alter table public.clientes drop column direccion;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clientes' and column_name='contacto'
  ) then
    alter table public.clientes drop column contacto;
  end if;
end $$;

-- 6. Trigger: única dirección principal por cliente
create or replace function public.asegurar_una_principal()
returns trigger
language plpgsql
as $$
begin
  if new.es_principal = true then
    update public.cliente_direcciones
      set es_principal = false
      where cliente_id = new.cliente_id
        and id <> new.id
        and es_principal = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dir_principal on public.cliente_direcciones;
create trigger trg_dir_principal
  before insert or update on public.cliente_direcciones
  for each row execute function public.asegurar_una_principal();

-- =========================================================
-- RLS
-- =========================================================
alter table public.cliente_direcciones enable row level security;

-- clientes: refuerza política (ya existía de T-003)
drop policy if exists cli_select on public.clientes;
create policy cli_select on public.clientes for select to authenticated using (true);

drop policy if exists cli_write on public.clientes;
create policy cli_write on public.clientes for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- cliente_direcciones
drop policy if exists cd_select on public.cliente_direcciones;
create policy cd_select on public.cliente_direcciones for select to authenticated using (true);

drop policy if exists cd_write on public.cliente_direcciones;
create policy cd_write on public.cliente_direcciones for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- =========================================================
-- RPC: crear cliente completo (cliente + direcciones)
-- =========================================================
create or replace function public.crear_cliente_completo(
  p_razon_social    text,
  p_cuit            text default null,
  p_condicion_iva   text default 'CONSUMIDOR_FINAL',
  p_email           text default null,
  p_telefono        text default null,
  p_nombre_fantasia text default null,
  p_limite_credito  numeric default 0,
  p_direcciones     jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_cliente_id uuid;
  v_dir        jsonb;
  v_hay_principal boolean := false;
begin
  if p_razon_social is null or length(trim(p_razon_social)) = 0 then
    raise exception 'INPUT_INVALIDO: razon_social requerida' using errcode='P0030';
  end if;

  insert into public.clientes
    (razon_social, nombre_fantasia, cuit, condicion_iva, email, telefono, limite_credito, activo)
  values
    (p_razon_social, p_nombre_fantasia, nullif(p_cuit,''), p_condicion_iva,
     p_email, p_telefono, coalesce(p_limite_credito, 0), true)
  returning id into v_cliente_id;

  if p_direcciones is not null and jsonb_array_length(p_direcciones) > 0 then
    for v_dir in select * from jsonb_array_elements(p_direcciones) loop
      if (v_dir->>'es_principal')::boolean = true then
        v_hay_principal := true;
      end if;
      insert into public.cliente_direcciones
        (cliente_id, etiqueta, direccion, localidad, provincia, es_principal)
      values (
        v_cliente_id,
        v_dir->>'etiqueta',
        v_dir->>'direccion',
        v_dir->>'localidad',
        v_dir->>'provincia',
        coalesce((v_dir->>'es_principal')::boolean, false)
      );
    end loop;

    -- Si no se marcó ninguna principal, marcar la primera
    if not v_hay_principal then
      update public.cliente_direcciones
        set es_principal = true
        where id = (
          select id from public.cliente_direcciones
          where cliente_id = v_cliente_id
          order by creado_en asc
          limit 1
        );
    end if;
  end if;

  return v_cliente_id;
end;
$$;

grant execute on function public.crear_cliente_completo(text,text,text,text,text,text,numeric,jsonb)
  to authenticated;

-- =========================================================
-- RPC: actualizar cliente completo
-- =========================================================
create or replace function public.actualizar_cliente_completo(
  p_cliente_id     uuid,
  p_datos          jsonb,     -- columnas a actualizar en clientes
  p_direcciones    jsonb default null  -- si null, no se tocan; si [], se borran todas
)
returns void
language plpgsql
security invoker
as $$
declare
  v_dir jsonb;
  v_hay_principal boolean := false;
begin
  if not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'CLIENTE_NO_EXISTE: %', p_cliente_id using errcode='P0031';
  end if;

  -- Actualizar sólo columnas conocidas
  update public.clientes set
    razon_social    = coalesce(p_datos->>'razon_social', razon_social),
    nombre_fantasia = coalesce(p_datos->>'nombre_fantasia', nombre_fantasia),
    cuit            = coalesce(nullif(p_datos->>'cuit',''), cuit),
    condicion_iva   = coalesce(p_datos->>'condicion_iva', condicion_iva),
    email           = coalesce(p_datos->>'email', email),
    telefono        = coalesce(p_datos->>'telefono', telefono),
    limite_credito  = coalesce((p_datos->>'limite_credito')::numeric, limite_credito),
    activo          = coalesce((p_datos->>'activo')::boolean, activo)
  where id = p_cliente_id;

  -- Reemplazo de direcciones si viene el array
  if p_direcciones is not null then
    delete from public.cliente_direcciones where cliente_id = p_cliente_id;

    if jsonb_array_length(p_direcciones) > 0 then
      for v_dir in select * from jsonb_array_elements(p_direcciones) loop
        if (v_dir->>'es_principal')::boolean = true then
          v_hay_principal := true;
        end if;
        insert into public.cliente_direcciones
          (cliente_id, etiqueta, direccion, localidad, provincia, es_principal)
        values (
          p_cliente_id,
          v_dir->>'etiqueta',
          v_dir->>'direccion',
          v_dir->>'localidad',
          v_dir->>'provincia',
          coalesce((v_dir->>'es_principal')::boolean, false)
        );
      end loop;

      if not v_hay_principal then
        update public.cliente_direcciones
          set es_principal = true
          where id = (
            select id from public.cliente_direcciones
            where cliente_id = p_cliente_id
            order by creado_en asc
            limit 1
          );
      end if;
    end if;
  end if;
end;
$$;

grant execute on function public.actualizar_cliente_completo(uuid,jsonb,jsonb) to authenticated;