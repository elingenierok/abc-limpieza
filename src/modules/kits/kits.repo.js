import { supabase } from '../../core/supabase.js';

/* =========================================================
   F-009 · kit_max_armable
   Réplica en JS de la lógica de kits_con_stock_virtual
   ========================================================= */
export function calcularMaxArmables(componentes) {
  if (!Array.isArray(componentes) || componentes.length === 0) return null;

  let min = Infinity;
  for (const c of componentes) {
    if (!(c.cantidad > 0)) return null;         // componente inválido → kit no armable
    if (c.stock_actual <= 0) return 0;          // stock 0 → 0
    const r = Math.floor(c.stock_actual / c.cantidad);
    if (r < min) min = r;
  }
  return Number.isFinite(min) ? min : null;
}

/* =========================================================
   F-010 · precio del kit (calculado + redondeo)
   Redondeo a la centena. Configurable en REDONDEO.
   ========================================================= */
export const REDONDEO = 100;

export function calcularPrecioKit(componentes, redondeo = REDONDEO) {
  if (!Array.isArray(componentes) || componentes.length === 0) return 0;

  const bruto = componentes.reduce((acc, c) => {
    const precio = Number(c.precio_unit ?? 0);
    const cant   = Number(c.cantidad ?? 0);
    return acc + (precio * cant);
  }, 0);

  if (redondeo <= 0) return Number(bruto.toFixed(2));
  return Math.round(bruto / redondeo) * redondeo;
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

/* Trae un kit con sus items + stock y precio de cada insumo + max_armables + precio calculado */
async function hidratarKit(kitRow) {
  if (!kitRow) return null;

  const { data: items, error } = await supabase
    .from('kit_items')
    .select(`
      item_cod,
      cantidad,
      stock_insumos:item_cod ( cod, nom, unidad, stock, precio_unit )
    `)
    .eq('kit_id', kitRow.id);

  if (error) throw tiparError(error);

  const componentes = (items ?? []).map(i => ({
    cod:          i.item_cod,
    nom:          i.stock_insumos?.nom ?? null,
    unidad:       i.stock_insumos?.unidad ?? null,
    cantidad:     Number(i.cantidad),
    stock_actual: Number(i.stock_insumos?.stock ?? 0),
    precio_unit:  Number(i.stock_insumos?.precio_unit ?? 0)
  }));

  const max_armables     = calcularMaxArmables(componentes);
  const precio_calculado = calcularPrecioKit(componentes);

  return {
    id:            kitRow.id,
    nombre:        kitRow.nombre,
    categoria:     kitRow.categoria,
    descripcion:   kitRow.descripcion,
    activo:        kitRow.activo,
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

export async function crearKit({ id, nombre, categoria, descripcion = null, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { code: 'KIT_SIN_ITEMS', detalle: 'un kit debe tener al menos 1 componente' };
  }

  const { error: errKit } = await supabase
    .from('kits')
    .insert({ id, nombre, categoria, descripcion });

  if (errKit) throw tiparError(errKit);

  const { error: errRpc } = await supabase.rpc('reemplazar_kit_items', {
    p_kit_id: id,
    p_items:  items.map(i => ({ cod: i.cod, cantidad: i.cantidad }))
  });

  if (errRpc) {
    // Rollback manual del kit huérfano
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

/* NUEVA: actualiza datos básicos del kit (nombre, categoría, descripción, activo) */
export async function actualizarKit(id, datos) {
  if (!id) throw { code: 'KIT_NO_EXISTE', detalle: 'id requerido' };

  const permitidos = ['nombre', 'categoria', 'descripcion', 'activo'];
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