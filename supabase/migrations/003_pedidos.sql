-- =========================================================
-- T-003 · Módulo Pedidos · Tablas base y RPC de despacho
-- Depende de: 001_stock.sql, 002_kits.sql
-- NO crea stock_movimientos: usa la tabla movimientos de T-001
-- =========================================================

-- Stub mínimo de clientes (si no existe de tareas anteriores)
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  razon_social  text not null,
  cuit          text,
  contacto      text,
  telefono      text,
  email         text,
  direccion     text,
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- Ajuste del CHECK de movimientos para no romper compatibilidad:
-- no se toca. Se sigue usando 'salida' con motivo 'pedido:<uuid>'.

create table if not exists public.pedidos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete restrict,
  estado         text not null
                 check (estado in (
                   'BORRADOR','PENDIENTE','PREPARADO','EN_CAMINO','ENTREGADO','CANCELADO'
                 ))
                 default 'BORRADOR',
  prioridad      text not null default 'MEDIA'
                 check (prioridad in ('ALTA','MEDIA','BAJA')),
  fecha_compromiso date,
  monto          numeric not null default 0 check (monto >= 0),
  obs            text,
  creado_en      timestamptz not null default now(),
  creado_por     uuid references auth.users(id) on delete set null,
  despachado_en  timestamptz,
  cancelado_en   timestamptz
);

create index if not exists idx_pedidos_estado   on public.pedidos(estado);
create index if not exists idx_pedidos_cliente  on public.pedidos(cliente_id);
create index if not exists idx_pedidos_fecha    on public.pedidos(fecha_compromiso);

create table if not exists public.pedido_items (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references public.pedidos(id) on delete cascade,
  tipo       text not null check (tipo in ('INSUMO','KIT')),
  item_cod   text not null,   -- cod de insumo o id de kit (ver constraint abajo)
  cantidad   numeric not null check (cantidad > 0),
  precio_unit numeric not null default 0 check (precio_unit >= 0)
);

create index if not exists idx_pedido_items_pedido on public.pedido_items(pedido_id);

-- Validación de FK "polimórfica" por trigger:
-- si tipo = INSUMO, item_cod debe existir en stock_insumos
-- si tipo = KIT,    item_cod debe existir en kits
create or replace function public.validar_pedido_item()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'INSUMO' then
    if not exists (select 1 from public.stock_insumos where cod = new.item_cod) then
      raise exception 'ITEM_INEXISTENTE: insumo %', new.item_cod using errcode='P0020';
    end if;
  elsif new.tipo = 'KIT' then
    if not exists (select 1 from public.kits where id = new.item_cod) then
      raise exception 'ITEM_INEXISTENTE: kit %', new.item_cod using errcode='P0020';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_pedido_item on public.pedido_items;
create trigger trg_validar_pedido_item
  before insert or update on public.pedido_items
  for each row execute function public.validar_pedido_item();

-- =========================================================
-- RLS
-- =========================================================
alter table public.clientes     enable row level security;
alter table public.pedidos      enable row level security;
alter table public.pedido_items enable row level security;

-- clientes
drop policy if exists cli_select on public.clientes;
create policy cli_select on public.clientes for select to authenticated using (true);

drop policy if exists cli_write on public.clientes;
create policy cli_write on public.clientes for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- pedidos
drop policy if exists ped_select on public.pedidos;
create policy ped_select on public.pedidos for select to authenticated using (true);

drop policy if exists ped_write on public.pedidos;
create policy ped_write on public.pedidos for all to authenticated
  using (public.rol_actual() in ('admin','operador','repartidor'))
  with check (public.rol_actual() in ('admin','operador','repartidor'));

-- pedido_items
drop policy if exists pi_select on public.pedido_items;
create policy pi_select on public.pedido_items for select to authenticated using (true);

drop policy if exists pi_write on public.pedido_items;
create policy pi_write on public.pedido_items for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- =========================================================
-- RPC: crear pedido con items (transacción)
-- =========================================================
create or replace function public.crear_pedido(
  p_cliente_id      uuid,
  p_items           jsonb,     -- [{ tipo, item_cod, cantidad, precio_unit }]
  p_prioridad       text default 'MEDIA',
  p_fecha_compromiso date default null,
  p_obs             text default null,
  p_creado_por      uuid default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_pedido_id uuid;
  v_item      jsonb;
  v_monto     numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'PEDIDO_SIN_ITEMS' using errcode='P0021';
  end if;

  insert into public.pedidos (cliente_id, estado, prioridad, fecha_compromiso, obs, creado_por)
  values (p_cliente_id, 'PENDIENTE', p_prioridad, p_fecha_compromiso, p_obs, p_creado_por)
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.pedido_items (pedido_id, tipo, item_cod, cantidad, precio_unit)
    values (
      v_pedido_id,
      v_item->>'tipo',
      v_item->>'item_cod',
      (v_item->>'cantidad')::numeric,
      coalesce((v_item->>'precio_unit')::numeric, 0)
    );
    v_monto := v_monto + (v_item->>'cantidad')::numeric * coalesce((v_item->>'precio_unit')::numeric, 0);
  end loop;

  update public.pedidos set monto = v_monto where id = v_pedido_id;
  return v_pedido_id;
end;
$$;

grant execute on function public.crear_pedido(uuid,jsonb,text,date,text,uuid) to authenticated;

-- =========================================================
-- RPC: despachar pedido (atómico)
-- Reutiliza registrar_movimiento de T-001
-- =========================================================
create or replace function public.despachar_pedido(
  p_pedido_id  uuid,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_estado       text;
  v_faltantes    jsonb := '[]'::jsonb;
  v_req          record;
  v_stock        numeric;
  v_mov          jsonb;
begin
  -- 1. Bloqueo de pedido
  select estado into v_estado
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    raise exception 'PEDIDO_NO_EXISTE: %', p_pedido_id using errcode='P0022';
  end if;
  if v_estado <> 'PENDIENTE' then
    raise exception 'ESTADO_INVALIDO: pedido en %, no PENDIENTE', v_estado using errcode='P0023';
  end if;

  -- 2. Consolidar requerimientos (insumos directos + explosión de kits)
  create temp table _req on commit drop as
  with directos as (
    select item_cod, cantidad
    from public.pedido_items
    where pedido_id = p_pedido_id and tipo = 'INSUMO'
  ),
  kits_explotados as (
    select ki.item_cod, (ki.cantidad * pi.cantidad) as cantidad
    from public.pedido_items pi
    join public.kit_items ki on ki.kit_id = pi.item_cod
    where pi.pedido_id = p_pedido_id and pi.tipo = 'KIT'
  )
  select item_cod, sum(cantidad) as cantidad
  from (select * from directos union all select * from kits_explotados) t
  group by item_cod;

  -- 3. Verificar stock disponible con lock por insumo
  for v_req in select item_cod, cantidad from _req loop
    select stock into v_stock
    from public.stock_insumos
    where cod = v_req.item_cod
    for update;

    if not found then
      v_faltantes := v_faltantes || jsonb_build_object(
        'cod', v_req.item_cod, 'motivo', 'INSUMO_NO_EXISTE'
      );
    elsif v_stock < v_req.cantidad then
      v_faltantes := v_faltantes || jsonb_build_object(
        'cod', v_req.item_cod,
        'requerido', v_req.cantidad,
        'disponible', v_stock
      );
    end if;
  end loop;

  if jsonb_array_length(v_faltantes) > 0 then
    raise exception 'STOCK_INSUFICIENTE: %', v_faltantes::text using errcode='P0024';
  end if;

  -- 4. Descontar stock reutilizando registrar_movimiento
  for v_req in select item_cod, cantidad from _req loop
    v_mov := public.registrar_movimiento(
      v_req.item_cod,
      'salida',
      v_req.cantidad,
      'pedido:' || p_pedido_id::text,
      p_usuario_id
    );
  end loop;

  -- 5. Cambiar estado
  update public.pedidos
    set estado = 'ENTREGADO', despachado_en = now()
    where id = p_pedido_id;

  return jsonb_build_object(
    'pedido_id',    p_pedido_id,
    'estado',       'ENTREGADO',
    'items_movidos', (select count(*) from _req)
  );
end;
$$;

grant execute on function public.despachar_pedido(uuid,uuid) to authenticated;

-- =========================================================
-- RPC: cancelar pedido
-- =========================================================
create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_estado text;
begin
  select estado into v_estado
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    raise exception 'PEDIDO_NO_EXISTE: %', p_pedido_id using errcode='P0022';
  end if;

  if v_estado in ('ENTREGADO','CANCELADO') then
    raise exception 'ESTADO_INVALIDO: no se puede cancelar un pedido %', v_estado using errcode='P0023';
  end if;

  update public.pedidos set estado = 'CANCELADO', cancelado_en = now() where id = p_pedido_id;
end;
$$;

grant execute on function public.cancelar_pedido(uuid) to authenticated;