import { supabase } from '../../core/supabase.js';

/* =========================================================
   F-009 · kit_max_armable
   ========================================================= */
export function calcularMaxArmables(componentes) {
  if (!Array.isArray(componentes) || componentes.length === 0) return null;

  let min = Infinity;
  for (const c of componentes) {
    if (!(c.cantidad > 0)) return null;
    if (c.stock_actual <= 0) return 0;
    const r = Math.floor(c.stock_actual / c.cantidad);
    if (r < min) min = r;
  }
  return Number.isFinite(min) ? min : null;
}

/* =========================================================
   F-010 · costo y precio del kit (Margen Real)
   costo_unitario de un LIQUIDO_DIL = precio_concentrado / factor_dilucion
   costo_base = suma(costo_unitario × cantidad) de todos los componentes
   precio_venta = costo_base / (1 - margen)   [margen real, no markup]
   Redondeo a la centena.
   ========================================================= */
export const REDONDEO = 100;

export function calcularCostoUnitario(componente) {
  const tipo = componente.tipo;
  const cantidad = Number(componente.cantidad ?? 0);
  if (!(cantidad > 0)) return 0;

  // Diluido: usar precio del concentrado relacionado ÷ factor
  if (tipo === 'LIQUIDO_DIL') {
    const precioConc = Number(componente.precio_concentrado ?? 0);
    const factor = Number(componente.factor_dilucion ?? 0);
    if (precioConc > 0 && factor > 1) {
      return (precioConc / factor) * cantidad;
    }
    // Fallback: si no hay concentrado relacionado, usar precio_unit directo
    return Number(componente.precio_unit ?? 0) * cantidad;
  }

  // Packaging, concentrado u otro: precio_unit directo
  return Number(componente.precio_unit ?? 0) * cantidad;
}

export function calcularCostoBase(componentes) {
  if (!Array.isArray(componentes) || componentes.length === 0) return 0;
  return componentes.reduce((acc, c) => acc + calcularCostoUnitario(c), 0);
}

export function calcularPrecioKit(componentes, margen = 0, redondeo = REDONDEO) {
  const costoBase = calcularCostoBase(componentes);
  if (costoBase <= 0) return 0;

  const m = Number(margen);
  let precio;
  if (!Number.isFinite(m) || m <= 0 || m >= 1) {
    // Sin margen: el precio es igual al costo
    precio = costoBase;
  } else {
    precio = costoBase / (1 - m);
  }

  if (redondeo <= 0) return Number(precio.toFixed(2));
  return Math.round(precio / redondeo) * redondeo;
}

/* Normaliza error de Supabase */
function tiparError(err) {
  if (!err) return null;
  const msg = err.message || '';
  if (err.code === '23505' || msg.includes('duplicate key')) {
    return { code: 'PK_DUPLICADA', detalle: msg };
  }
  if (msg.startsWith('KIT_SIN_ITEMS'))       return { code: 'KIT_SIN_ITEMS', detalle: msg };
  if (msg.startsWith('KIT_NO_EXISTE'))       return { code: 'KIT_NO_EXISTE', detalle: msg };
  if (msg.includes('violates foreign key'))  return { code: 'FK_INVALIDA', detalle: msg };
  if (msg.includes('violates check'))        return { code: 'CHECK_VIOLADO', detalle: msg };
  return { code: 'ERROR_SUPABASE', detalle: msg, raw: err };
}

/* Trae un kit con sus items + datos completos del insumo + concentrado relacionado */
async function hidratarKit(kitRow) {
  if (!kitRow) return null;

  // 1. Traer items + datos del insumo
  const { data: items, error } = await supabase
    .from('kit_items')
    .select(`
      item_cod,
      cantidad,
      stock_insumos:item_cod (
        cod, nom, unidad, stock, precio_unit, tipo, factor_dilucion, insumo_conc_relacionado
      )
    `)
    .eq('kit_id', kitRow.id);

  if (error) throw tiparError(error);

  // 2. Recolectar códigos de concentrados relacionados
  const codigosConcentrados = (items ?? [])
    .map(i => i.stock_insumos?.insumo_conc_relacionado)
    .filter(Boolean);

  // 3. Traer concentrados con precio Y factor
  let mapaConcentrados = {};
  if (codigosConcentrados.length > 0) {
    const { data: concs, error: errConc } = await supabase
      .from('stock_insumos')
      .select('cod, precio_unit, factor_dilucion')
      .in('cod', codigosConcentrados);

    if (errConc) throw tiparError(errConc);

    mapaConcentrados = Object.fromEntries(
      (concs ?? []).map(c => [c.cod, c])
    );
  }

  // 4. Armar componentes con datos del concentrado resueltos
  const componentes = (items ?? []).map(i => {
    const si = i.stock_insumos;
    const codConc = si?.insumo_conc_relacionado;
    const conc = codConc ? mapaConcentrados[codConc] : null;

    return {
      cod:                i.item_cod,
      nom:                si?.nom ?? null,
      unidad:             si?.unidad ?? null,
      cantidad:           Number(i.cantidad),
      stock_actual:       Number(si?.stock ?? 0),
      precio_unit:        Number(si?.precio_unit ?? 0),
      tipo:               si?.tipo ?? null,
      factor_dilucion:    Number(conc?.factor_dilucion ?? 0) || null,
      precio_concentrado: Number(conc?.precio_unit ?? 0) || null
    };
  });

  const max_armables     = calcularMaxArmables(componentes);
  const costo_base       = calcularCostoBase(componentes);
  const margen           = Number(kitRow.margen ?? 0);
  const precio_calculado = calcularPrecioKit(componentes, margen);

  return {
    id:            kitRow.id,
    nombre:        kitRow.nombre,
    categoria:     kitRow.categoria,
    descripcion:   kitRow.descripcion,
    activo:        kitRow.activo,
    margen:        margen,
    costo_base,
    componentes,
    max_armables,
    precio_calculado,
    total_componentes: componentes.length
  };
}

/* =========================================================
   API PÚBLICA
   ========================================================= */

export async function listarKits({ categoria, soloActivos = true } = {}) {
  let q = supabase.from('kits').select('*');
  if (categoria)   q = q.eq('categoria', categoria);
  if (soloActivos) q = q.eq('activo', true);

  const { data, error } = await q;
  if (error) throw tiparError(error);

  return Promise.all((data ?? []).map(hidratarKit));
}

export async function obtenerKit(id) {
  const { data, error } = await supabase
    .from('kits')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw tiparError(error);
  return hidratarKit(data);
}

export async function crearKit({ id, nombre, categoria, descripcion = null, margen = 0.5, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { code: 'KIT_SIN_ITEMS', detalle: 'un kit debe tener al menos 1 componente' };
  }

  const { error: errKit } = await supabase
    .from('kits')
    .insert({ id, nombre, categoria, descripcion, margen });

  if (errKit) throw tiparError(errKit);

  const { error: errRpc } = await supabase.rpc('reemplazar_kit_items', {
    p_kit_id: id,
    p_items:  items.map(i => ({ cod: i.cod, cantidad: i.cantidad }))
  });

  if (errRpc) {
    await supabase.from('kits').delete().eq('id', id);
    throw tiparError(errRpc);
  }

  return obtenerKit(id);
}

export async function actualizarKitItems(kit_id, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { code: 'KIT_SIN_ITEMS', detalle: 'un kit debe tener al menos 1 componente' };
  }

  const { error } = await supabase.rpc('reemplazar_kit_items', {
    p_kit_id: kit_id,
    p_items:  items.map(i => ({ cod: i.cod, cantidad: i.cantidad }))
  });

  if (error) throw tiparError(error);
  return obtenerKit(kit_id);
}

export async function actualizarKit(id, datos) {
  if (!id) throw { code: 'KIT_NO_EXISTE', detalle: 'id requerido' };

  const permitidos = ['nombre', 'categoria', 'descripcion', 'activo', 'margen'];
  const limpio = Object.fromEntries(
    Object.entries(datos ?? {}).filter(([k, v]) =>
      permitidos.includes(k) && v !== undefined
    )
  );

  if (Object.keys(limpio).length === 0) {
    return obtenerKit(id);
  }

  const { error } = await supabase
    .from('kits')
    .update(limpio)
    .eq('id', id);

  if (error) throw tiparError(error);
  return obtenerKit(id);
}

export async function eliminarKit(id) {
  const { error } = await supabase.from('kits').delete().eq('id', id);
  if (error) throw tiparError(error);
  return true;
}