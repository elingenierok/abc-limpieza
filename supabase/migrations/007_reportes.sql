-- =========================================================
-- T-007 · Módulo Reportes · RPC de analítica
-- Depende de: 001_stock, 002_kits (kit_items), 003_pedidos,
--             004_clientes, 005_compras
-- Todas las funciones son STABLE + SECURITY INVOKER + check de rol
-- =========================================================

-- Helper de validación de rol (reutilizable)
create or replace function public.solo_admin_operador()
returns void
language plpgsql
stable
as $$
begin
  if public.rol_actual() not in ('admin','operador') then
    raise exception 'PERMISO_DENEGADO' using errcode='P0050';
  end if;
end;
$$;

grant execute on function public.solo_admin_operador() to authenticated;

-- =========================================================
-- Índices de soporte para reportes
-- =========================================================
create index if not exists idx_pedidos_despachado_en on public.pedidos(despachado_en)
  where despachado_en is not null;

create index if not exists idx_oci_item_costo on public.orden_compra_items(item_cod);

-- =========================================================
-- RPC 1: valorización de stock
-- Costo preferido: último costo_unit de OC recibida (D1)
-- Fallback: precio_unit de stock_insumos
-- =========================================================
create or replace function public.reportes_valorizacion_stock()
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_result jsonb;
begin
  perform public.solo_admin_operador();

  with ultimo_costo as (
    select distinct on (oci.item_cod)
      oci.item_cod,
      oci.costo_unit
    from public.orden_compra_items oci
    join public.ordenes_compra oc on oc.id = oci.orden_id
    where oc.estado = 'RECIBIDA'
    order by oci.item_cod, oc.recibido_en desc nulls last
  ),
  valorizado as (
    select
      si.cod,
      si.nom,
      si.unidad,
      si.stock,
      coalesce(uc.costo_unit, si.precio_unit) as costo_unit,
      si.stock * coalesce(uc.costo_unit, si.precio_unit) as valor_total,
      case
        when uc.costo_unit is null then 'precio_venta_fallback'
        else 'ultimo_costo_oc'
      end as fuente_costo
    from public.stock_insumos si
    left join ultimo_costo uc on uc.item_cod = si.cod
  )
  select jsonb_build_object(
    'total_valorizado', (select coalesce(sum(valor_total), 0) from valorizado),
    'items_con_stock',  (select count(*) from valorizado where stock > 0),
    'items_sin_costo_real', (select count(*) from valorizado where fuente_costo = 'precio_venta_fallback'),
    'detalle', (select coalesce(jsonb_agg(row_to_json(v) order by cod), '[]'::jsonb) from valorizado v)
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.reportes_valorizacion_stock() to authenticated;

-- =========================================================
-- RPC 2: ranking de ventas por rango de fechas (D2, D3, D4)
-- Sólo pedidos ENTREGADOS, filtrados por despachado_en
-- =========================================================
create or replace function public.reportes_ranking_ventas(
  p_fecha_inicio date,
  p_fecha_fin    date,
  p_top          int default 20
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_result jsonb;
begin
  perform public.solo_admin_operador();

  if p_fecha_inicio is null or p_fecha_fin is null then
    raise exception 'INPUT_INVALIDO: fechas requeridas' using errcode='P0051';
  end if;
  if p_fecha_fin < p_fecha_inicio then
    raise exception 'INPUT_INVALIDO: fecha_fin < fecha_inicio' using errcode='P0051';
  end if;
  if p_top is null or p_top <= 0 or p_top > 500 then
    raise exception 'INPUT_INVALIDO: top fuera de rango' using errcode='P0051';
  end if;

  with ventas as (
    select
      pi.tipo,
      pi.item_cod,
      pi.cantidad,
      pi.precio_unit,
      pi.cantidad * pi.precio_unit as facturado
    from public.pedido_items pi
    join public.pedidos p on p.id = pi.pedido_id
    where p.estado = 'ENTREGADO'
      and p.despachado_en is not null
      and p.despachado_en >= p_fecha_inicio::timestamptz
      and p.despachado_en <  (p_fecha_fin::timestamptz + interval '1 day')
  ),
  agrupado as (
    select
      v.tipo,
      v.item_cod,
      case
        when v.tipo = 'INSUMO' then (select nom   from public.stock_insumos where cod = v.item_cod)
        when v.tipo = 'KIT'    then (select nombre from public.kits         where id  = v.item_cod)
      end as nombre,
      sum(v.cantidad)   as cantidad_total,
      sum(v.facturado)  as facturado_total
    from ventas v
    group by v.tipo, v.item_cod
  )
  select jsonb_build_object(
    'fecha_inicio',     p_fecha_inicio,
    'fecha_fin',        p_fecha_fin,
    'total_items',      (select count(*) from agrupado),
    'facturado_total',  (select coalesce(sum(facturado_total), 0) from agrupado),
    'por_cantidad',     (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select * from agrupado order by cantidad_total desc, item_cod asc limit p_top
      ) t
    ),
    'por_facturacion',  (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select * from agrupado order by facturado_total desc, item_cod asc limit p_top
      ) t
    )
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.reportes_ranking_ventas(date,date,int) to authenticated;

-- =========================================================
-- RPC 3: resumen operativo (con F-007 recalculado)
-- =========================================================
create or replace function public.reportes_resumen_operativo()
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_result jsonb;
begin
  perform public.solo_admin_operador();

  with stock_clasificado as (
    select
      cod,
      case
        when minimo > 0 and stock < minimo * 0.5  then 'CRITICO'
        when minimo > 0 and stock < minimo        then 'BAJO'
        when minimo > 0 and stock < minimo * 1.25 then 'ATENCION'
        else 'OK'
      end as estado_stock
    from public.stock_insumos
  ),
  pedidos_por_estado as (
    select estado, count(*) as n
    from public.pedidos
    group by estado
  )
  select jsonb_build_object(
    'clientes_activos',     (select count(*) from public.clientes   where activo),
    'proveedores_activos',  (select count(*) from public.proveedores where activo),
    'pedidos_pendientes',   (select coalesce(n,0) from pedidos_por_estado where estado = 'PENDIENTE'),
    'pedidos_preparados',   (select coalesce(n,0) from pedidos_por_estado where estado = 'PREPARADO'),
    'pedidos_en_camino',    (select coalesce(n,0) from pedidos_por_estado where estado = 'EN_CAMINO'),
    'pedidos_entregados',   (select coalesce(n,0) from pedidos_por_estado where estado = 'ENTREGADO'),
    'stock_critico',        (select count(*) from stock_clasificado where estado_stock = 'CRITICO'),
    'stock_bajo',           (select count(*) from stock_clasificado where estado_stock = 'BAJO'),
    'stock_atencion',       (select count(*) from stock_clasificado where estado_stock = 'ATENCION'),
    'stock_ok',             (select count(*) from stock_clasificado where estado_stock = 'OK')
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.reportes_resumen_operativo() to authenticated;