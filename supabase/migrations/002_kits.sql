-- =========================================================
-- T-002 · Módulo Kits · Tablas base y RLS
-- Requiere: stock_insumos (T-001)
-- Modelo: VIRTUAL — los kits NO tienen stock propio
-- =========================================================

create table if not exists public.kits (
  id          text primary key,
  nombre      text not null,
  categoria   text not null check (categoria in ('Hogar','Cocina','Bano')),
  descripcion text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_kits_categoria on public.kits(categoria);

create table if not exists public.kit_items (
  kit_id   text not null references public.kits(id) on delete cascade,
  item_cod text not null references public.stock_insumos(cod) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  primary key (kit_id, item_cod)
);

create index if not exists idx_kit_items_item on public.kit_items(item_cod);

-- =========================================================
-- RLS
-- =========================================================
alter table public.kits      enable row level security;
alter table public.kit_items enable row level security;

-- Reutiliza public.rol_actual() de la migración 001
drop policy if exists kits_select on public.kits;
create policy kits_select on public.kits
  for select to authenticated using (true);

drop policy if exists kits_write on public.kits;
create policy kits_write on public.kits
  for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

drop policy if exists kit_items_select on public.kit_items;
create policy kit_items_select on public.kit_items
  for select to authenticated using (true);

drop policy if exists kit_items_write on public.kit_items;
create policy kit_items_write on public.kit_items
  for all to authenticated
  using (public.rol_actual() in ('admin','operador'))
  with check (public.rol_actual() in ('admin','operador'));

-- =========================================================
-- Vista: stock virtual por kit
-- F-009 · kit_max_armable = floor( min( stock_insumo / cantidad_en_kit ) )
-- Si algún componente tiene stock 0 → 0
-- Si el kit no tiene componentes → null (no armable)
-- =========================================================
create or replace view public.kits_con_stock_virtual as
select
  k.id,
  k.nombre,
  k.categoria,
  k.descripcion,
  k.activo,
  coalesce(
    floor(
      min(si.stock / ki.cantidad) filter (where ki.item_cod is not null)
    ),
    null
  )::int as max_armables,
  count(ki.item_cod) as total_componentes
from public.kits k
left join public.kit_items ki     on ki.kit_id = k.id
left join public.stock_insumos si on si.cod    = ki.item_cod
group by k.id, k.nombre, k.categoria, k.descripcion, k.activo;

grant select on public.kits_con_stock_virtual to authenticated;

-- =========================================================
-- RPC atómico: reemplaza todos los items de un kit
-- (delete + insert en una sola transacción)
-- =========================================================
create or replace function public.reemplazar_kit_items(
  p_kit_id text,
  p_items  jsonb  -- [{ "cod": "...", "cantidad": 1.5 }, ...]
)
returns void
language plpgsql
security invoker
as $$
declare
  v_item jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'KIT_SIN_ITEMS'
      using errcode = 'P0010';
  end if;

  if not exists (select 1 from public.kits where id = p_kit_id) then
    raise exception 'KIT_NO_EXISTE: %', p_kit_id
      using errcode = 'P0011';
  end if;

  delete from public.kit_items where kit_id = p_kit_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.kit_items (kit_id, item_cod, cantidad)
    values (
      p_kit_id,
      v_item->>'cod',
      (v_item->>'cantidad')::numeric
    );
  end loop;
end;
$$;

grant execute on function public.reemplazar_kit_items(text, jsonb)
  to authenticated;