import { supabase } from '../../core/supabase.js';

function tiparError(err) {
  if (!err) return null;
  const msg = err.message || '';
  if (msg.startsWith('OC_NO_EXISTE'))     return { code: 'OC_NO_EXISTE', detalle: msg };
  if (msg.startsWith('OC_SIN_ITEMS'))     return { code: 'OC_SIN_ITEMS', detalle: msg };
  if (msg.startsWith('PROVEEDOR_NO_EXISTE')) return { code: 'PROVEEDOR_NO_EXISTE', detalle: msg };
  if (msg.startsWith('ESTADO_INVALIDO'))  return { code: 'ESTADO_INVALIDO', detalle: msg };
  if (msg.startsWith('STOCK_NEGATIVO'))   return { code: 'STOCK_NEGATIVO', detalle: msg };
  if (msg.startsWith('INPUT_INVALIDO'))   return { code: 'INPUT_INVALIDO', detalle: msg };
  if (err.code === '23505' || msg.includes('duplicate key')) {
    if (msg.includes('cuit')) return { code: 'CUIT_DUPLICADO', detalle: msg };
    return { code: 'PK_DUPLICADA', detalle: msg };
  }
  if (msg.includes('violates check'))       return { code: 'CHECK_VIOLADO', detalle: msg };
  if (msg.includes('violates foreign key')) return { code: 'FK_INVALIDA', detalle: msg };
  return { code: 'ERROR_SUPABASE', detalle: msg, raw: err };
}

/* =========================================================
   Proveedores
   ========================================================= */

export async function crearProveedor({ razon_social, cuit = null, email = null, telefono = null, direccion = null }) {
  if (!razon_social || razon_social.trim().length === 0) {
    throw { code: 'INPUT_INVALIDO', detalle: 'razon_social requerida' };
  }

  const { data, error } = await supabase
    .from('proveedores')
    .insert({
      razon_social: razon_social.trim(),
      cuit: cuit || null,
      email, telefono, direccion
    })
    .select('*')
    .single();

  if (error) throw tiparError(error);
  return data;
}

export async function listarProveedores({ soloActivos = true, search = '' } = {}) {
  let q = supabase
    .from('proveedores')
    .select('id, razon_social, cuit, email, telefono, direccion, activo, creado_en');

  if (soloActivos) q = q.eq('activo', true);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`razon_social.ilike.${s},cuit.ilike.${s}`);
  }

  const { data, error } = await q.order('razon_social');
  if (error) throw tiparError(error);
  return data ?? [];
}

/* =========================================================
   Órdenes de compra
   ========================================================= */

export async function crearOrdenCompra({
  proveedor_id,
  items,
  obs = null,
  usuario_id = null
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { code: 'OC_SIN_ITEMS', detalle: 'items no puede estar vacío' };
  }
  for (const it of items) {
    if (!it.item_cod)                throw { code: 'INPUT_INVALIDO', detalle: 'item_cod requerido' };
    if (!(it.cantidad > 0))          throw { code: 'INPUT_INVALIDO', detalle: 'cantidad debe ser > 0' };
    if (it.costo_unit == null || it.costo_unit < 0)
                                     throw { code: 'INPUT_INVALIDO', detalle: 'costo_unit debe ser >= 0' };
  }

  const { data: id, error } = await supabase.rpc('crear_orden_compra', {
    p_proveedor_id: proveedor_id,
    p_items:        items.map(i => ({
      item_cod:   i.item_cod,
      cantidad:   i.cantidad,
      costo_unit: i.costo_unit
    })),
    p_obs:        obs,
    p_usuario_id: usuario_id
  });

  if (error) throw tiparError(error);
  return obtenerOrdenCompra(id);
}

export async function enviarOrdenCompra(orden_id) {
  const { error } = await supabase.rpc('enviar_orden_compra', { p_orden_id: orden_id });
  if (error) throw tiparError(error);
  return true;
}

export async function recibirOrdenCompra(orden_id, usuario_id = null) {
  const { data, error } = await supabase.rpc('recibir_orden_compra', {
    p_orden_id:   orden_id,
    p_usuario_id: usuario_id
  });
  if (error) throw tiparError(error);
  return data;  // { orden_id, estado, items_recibidos }
}

export async function cancelarOrdenCompra(orden_id) {
  const { error } = await supabase.rpc('cancelar_orden_compra', { p_orden_id: orden_id });
  if (error) throw tiparError(error);
  return true;
}

export async function obtenerOrdenCompra(orden_id) {
  const { data: orden, error: errO } = await supabase
    .from('ordenes_compra')
    .select(`
      id, proveedor_id, estado, monto_total, obs,
      creado_en, enviado_en, recibido_en, cancelado_en,
      proveedores:proveedor_id ( id, razon_social )
    `)
    .eq('id', orden_id)
    .maybeSingle();

  if (errO) throw tiparError(errO);
  if (!orden) return null;

  const { data: items, error: errI } = await supabase
    .from('orden_compra_items')
    .select('id, item_cod, cantidad, costo_unit')
    .eq('orden_id', orden_id)
    .order('item_cod', { ascending: true });

  if (errI) throw tiparError(errI);

  return {
    ...orden,
    proveedor: orden.proveedores ?? null,
    proveedores: undefined,
    items: items ?? []
  };
}

export async function listarOrdenesCompra({ estado, proveedor_id } = {}) {
  let q = supabase
    .from('ordenes_compra')
    .select(`
      id, proveedor_id, estado, monto_total, creado_en, enviado_en, recibido_en, cancelado_en,
      proveedores:proveedor_id ( id, razon_social )
    `);

  if (estado)       q = q.eq('estado', estado);
  if (proveedor_id) q = q.eq('proveedor_id', proveedor_id);

  const { data, error } = await q.order('creado_en', { ascending: false });
  if (error) throw tiparError(error);

  return (data ?? []).map(o => ({
    ...o,
    proveedor: o.proveedores ?? null,
    proveedores: undefined
  }));
}