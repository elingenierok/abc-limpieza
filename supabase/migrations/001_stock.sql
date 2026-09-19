-- =========================================================
-- T-001 · Módulo Stock · Tablas base y RLS
-- Requiere: tabla usuarios(id uuid) ya existente (auth.users)
-- =========================================================

create table if not exists public.stock_insumos (
  cod             text primary key,
  nom             text not null,
  unidad          text not null check (unidad in ('L','U','PAR','KG')),
  stock           numeric not null default 0 check (stock >= 0),
  minimo          numeric not null default 0 check (minimo >= 0),
  consumo_diario  numeric not null default 0 check (consumo_diario >= 0),
  precio_unit     numeric not null default 0 check (precio_unit >= 0)
);

create index if not exists idx_stock_insumos_unidad on public.stock_insumos(unidad);

create table if not exists public.movimientos (
  id          bigserial primary key,
  fecha       timestamptz not null default now(),
  tipo        text not null check (tipo in ('entrada','salida','ajuste')),
  item_cod    text not null references public.stock_insumos(cod) on delete restrict,
  cantidad    numeric not null check (cantidad > 0),
  motivo      text,
  usuario_id  uuid references auth.users(id) on delete set null
);

create index if not exists idx_movimientos_item on public.movimientos(item_cod);
create index if not exists idx_movimientos_fecha on public.movimientos(fecha desc);

-- =========================================================
-- RLS
-- =========================================================
alter table public.stock_insumos enable row level security;
alter table public.movimientos  enable row level security;

-- Helper: lee el rol del usuario desde su metadata en auth
create or replace function public.rol_actual()
returns text
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'rol'),
    'anon'
  );
$$;

-- Políticas stock_insumos
drop policy if exists si_select on public.stock_insumos;
create policy si_select on public.stock_insumos
  for select to authenticated using (true);

drop policy if exists si_write on public.stock_insumos;
create policy si_write on public.stock_insumos
  for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- Políticas movimientos
drop policy if exists mv_select on public.movimientos;
create policy mv_select on public.movimientos
  for select to authenticated using (true);

drop policy if exists mv_insert on public.movimientos;
create policy mv_insert on public.movimientos
  for insert to authenticated
  with check (public.rol_actual() in ('admin','operador'));

-- movimientos no se actualizan ni se borran (auditoría)
drop policy if exists mv_no_update on public.movimientos;
create policy mv_no_update on public.movimientos
  for update to authenticated using (false);

drop policy if exists mv_no_delete on public.movimientos;
create policy mv_no_delete on public.movimientos
  for delete to authenticated using (false);

-- =========================================================
-- RPC atómica para registrar movimiento (R3)
-- =========================================================
create or replace function public.registrar_movimiento(
  p_cod        text,
  p_tipo       text,
  p_cantidad   numeric,
  p_motivo     text default null,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_stock_actual numeric;
  v_delta        numeric;
  v_nuevo_stock  numeric;
  v_mov_id       bigint;
begin
  -- Validación básica (R1, B6)
  if p_tipo not in ('entrada','salida','ajuste') then
    raise exception 'INPUT_INVALIDO: tipo=%', p_tipo
      using errcode = 'P0001';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'INPUT_INVALIDO: cantidad debe ser > 0'
      using errcode = 'P0001';
  end if;

  -- Lock de la fila para evitar concurrencia
  select stock into v_stock_actual
  from public.stock_insumos
  where cod = p_cod
  for update;

  if not found then
    raise exception 'INSUMO_NO_EXISTE: %', p_cod
      using errcode = 'P0002';
  end if;

  -- Signo según tipo (B5)
  v_delta := case p_tipo
    when 'entrada' then p_cantidad
    when 'salida'  then -p_cantidad
    when 'ajuste'  then p_cantidad   -- ajuste positivo; para negativos, usar 'salida' o migrar regla
  end;

  v_nuevo_stock := v_stock_actual + v_delta;

  if v_nuevo_stock < 0 then
    raise exception 'STOCK_NEGATIVO: disponible=%, solicitado=%',
      v_stock_actual, p_cantidad
      using errcode = 'P0003';
  end if;

  insert into public.movimientos (tipo, item_cod, cantidad, motivo, usuario_id)
  values (p_tipo, p_cod, p_cantidad, p_motivo, p_usuario_id)
  returning id into v_mov_id;

  update public.stock_insumos
    set stock = v_nuevo_stock
    where cod = p_cod;

  return jsonb_build_object(
    'movimiento_id', v_mov_id,
    'cod',           p_cod,
    'stock_previo',  v_stock_actual,
    'stock_nuevo',   v_nuevo_stock
  );
end;
$$;

grant execute on function public.registrar_movimiento(text,text,numeric,text,uuid)
  to authenticated;