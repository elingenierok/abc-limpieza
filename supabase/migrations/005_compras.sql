-- =========================================================
-- T-005 · Módulo Compras y Proveedores
-- Depende de: 001_stock.sql (registrar_movimiento)
-- =========================================================

create table if not exists public.proveedores (
  id            uuid primary key default gen_random_uuid(),
  razon_social  text not null,
  cuit          text unique,
  email         text,
  telefono      text,
  direccion     text,
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

create index if not exists idx_proveedores_activo on public.proveedores(activo);

create table if not exists public.ordenes_compra (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references public.proveedores(id) on delete restrict,
  estado        text not null
                check (estado in ('BORRADOR','ENVIADA','RECIBIDA','CANCELADA'))
                default 'BORRADOR',
  monto_total   numeric not null default 0 check (monto_total >= 0),
  obs           text,
  creado_en     timestamptz not null default now(),
  creado_por    uuid references auth.users(id) on delete set null,
  enviado_en    timestamptz,
  recibido_en   timestamptz,
  cancelado_en  timestamptz
);

create index if not exists idx_oc_proveedor on public.ordenes_compra(proveedor_id);
create index if not exists idx_oc_estado    on public.ordenes_compra(estado);

create table if not exists public.orden_compra_items (
  id         uuid primary key default gen_random_uuid(),
  orden_id   uuid not null references public.ordenes_compra(id) on delete cascade,
  item_cod   text not null references public.stock_insumos(cod) on delete restrict,
  cantidad   numeric not null check (cantidad > 0),
  costo_unit numeric not null check (costo_unit >= 0)
);

create index if not exists idx_oci_orden on public.orden_compra_items(orden_id);
create index if not exists idx_oci_item  on public.orden_compra_items(item_cod);

-- =========================================================
-- RLS
-- =========================================================
alter table public.proveedores        enable row level security;
alter table public.ordenes_compra     enable row level security;
alter table public.orden_compra_items enable row level security;

drop policy if exists prov_select on public.proveedores;
create policy prov_select on public.proveedores for select to authenticated using (true);

drop policy if exists prov_write on public.proveedores;
create policy prov_write on public.proveedores for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

drop policy if exists oc_select on public.ordenes_compra;
create policy oc_select on public.ordenes_compra for select to authenticated using (true);

drop policy if exists oc_write on public.ordenes_compra;
create policy oc_write on public.ordenes_compra for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

drop policy if exists oci_select on public.orden_compra_items;
create policy oci_select on public.orden_compra_items for select to authenticated using (true);

drop policy if exists oci_write on public.orden_compra_items;
create policy oci_write on public.orden_compra_items for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- =========================================================
-- RPC: crear orden de compra (OC + items + monto, atómico)
-- =========================================================
create or replace function public.crear_orden_compra(
  p_proveedor_id uuid,
  p_items        jsonb,     -- [{ item_cod, cantidad, costo_unit }]
  p_obs          text default null,
  p_usuario_id   uuid default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_orden_id uuid;
  v_item     jsonb;
  v_monto    numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'OC_SIN_ITEMS' using errcode='P0040';
  end if;

  if not exists (select 1 from public.proveedores where id = p_proveedor_id) then
    raise exception 'PROVEEDOR_NO_EXISTE: %', p_proveedor_id using errcode='P0041';
  end if;

  insert into public.ordenes_compra (proveedor_id, estado, obs, creado_por)
  values (p_proveedor_id, 'BORRADOR', p_obs, p_usuario_id)
  returning id into v_orden_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.orden_compra_items (orden_id, item_cod, cantidad, costo_unit)
    values (
      v_orden_id,
      v_item->>'item_cod',
      (v_item->>'cantidad')::numeric,
      (v_item->>'costo_unit')::numeric
    );
    v_monto := v_monto
             + (v_item->>'cantidad')::numeric * (v_item->>'costo_unit')::numeric;
  end loop;

  update public.ordenes_compra set monto_total = v_monto where id = v_orden_id;
  return v_orden_id;
end;
$$;

grant execute on function public.crear_orden_compra(uuid,jsonb,text,uuid) to authenticated;

-- =========================================================
-- RPC: enviar orden de compra (BORRADOR → ENVIADA)
-- =========================================================
create or replace function public.enviar_orden_compra(p_orden_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_estado text;
begin
  select estado into v_estado
  from public.ordenes_compra
  where id = p_orden_id
  for update;

  if not found then
    raise exception 'OC_NO_EXISTE: %', p_orden_id using errcode='P0042';
  end if;
  if v_estado <> 'BORRADOR' then
    raise exception 'ESTADO_INVALIDO: orden en %, no BORRADOR', v_estado using errcode='P0043';
  end if;

  update public.ordenes_compra
    set estado = 'ENVIADA', enviado_en = now()
    where id = p_orden_id;
end;
$$;

grant execute on function public.enviar_orden_compra(uuid) to authenticated;

-- =========================================================
-- RPC: recibir orden de compra (atómico)
-- Reutiliza registrar_movimiento (T-001)
-- Ordena por item_cod ASC para evitar deadlocks (mismo patrón que T-003 P7)
-- =========================================================
create or replace function public.recibir_orden_compra(
  p_orden_id   uuid,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_estado  text;
  v_item    record;
  v_count   int := 0;
begin
  select estado into v_estado
  from public.ordenes_compra
  where id = p_orden_id
  for update;

  if not found then
    raise exception 'OC_NO_EXISTE: %', p_orden_id using errcode='P0042';
  end if;
  if v_estado not in ('BORRADOR','ENVIADA') then
    raise exception 'ESTADO_INVALIDO: orden en %, no BORRADOR ni ENVIADA', v_estado
      using errcode='P0043';
  end if;

  for v_item in
    select item_cod, cantidad
    from public.orden_compra_items
    where orden_id = p_orden_id
    order by item_cod asc
  loop
    perform public.registrar_movimiento(
      v_item.item_cod,
      'entrada',
      v_item.cantidad,
      'oc:' || p_orden_id::text,
      p_usuario_id
    );
    v_count := v_count + 1;
  end loop;

  update public.ordenes_compra
    set estado = 'RECIBIDA', recibido_en = now()
    where id = p_orden_id;

  return jsonb_build_object(
    'orden_id',       p_orden_id,
    'estado',         'RECIBIDA',
    'items_recibidos', v_count
  );
end;
$$;

grant execute on function public.recibir_orden_compra(uuid,uuid) to authenticated;

-- =========================================================
-- RPC: cancelar orden de compra
-- =========================================================
create or replace function public.cancelar_orden_compra(p_orden_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_estado text;
begin
  select estado into v_estado
  from public.ordenes_compra
  where id = p_orden_id
  for update;

  if not found then
    raise exception 'OC_NO_EXISTE: %', p_orden_id using errcode='P0042';
  end if;

  if v_estado in ('RECIBIDA','CANCELADA') then
    raise exception 'ESTADO_INVALIDO: no se puede cancelar una orden %', v_estado
      using errcode='P0043';
  end if;

  update public.ordenes_compra
    set estado = 'CANCELADA', cancelado_en = now()
    where id = p_orden_id;
end;
$$;

grant execute on function public.cancelar_orden_compra(uuid) to authenticated;