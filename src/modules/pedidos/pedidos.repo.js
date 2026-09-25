import { supabase } from '../../core/supabase.js';

function tiparError(err) {
  if (!err) return null;
  const msg = err.message || '';

  if (msg.startsWith('PEDIDO_NO_EXISTE'))  return { code: 'PEDIDO_NO_EXISTE', detalle: msg };
  if (msg.startsWith('ESTADO_INVALIDO'))   return { code: 'ESTADO_INVALIDO', detalle: msg };
  if (msg.startsWith('PEDIDO_SIN_ITEMS'))  return { code: 'PEDIDO_SIN_ITEMS', detalle: msg };
  if (msg.startsWith('ITEM_INEXISTENTE'))  return { code: 'ITEM_INEXISTENTE', detalle: msg };
  if (msg.startsWith('INPUT_INVALIDO'))    return { code: 'INPUT_INVALIDO', detalle: msg };

  if (msg.startsWith('STOCK_INSUFICIENTE')) {
    const idx = msg.indexOf('[');
    const faltantes = idx >= 0 ? JSON.parse(msg.slice(idx)) : [];
    return { code: 'STOCK_INSUFICIENTE', faltantes, detalle: msg };
  }

  if (err.code === '23505' || msg.includes('duplicate key'))
    return { code: 'PK_DUPLICADA', detalle: msg };
  if (msg.includes('violates foreign key'))
    return { code: 'FK_INVALIDA', detalle: msg };

  return { code: 'ERROR_SUPABASE', detalle: msg, raw: err };
}

/* =========================================================
   Obtener parámetros de negocio
   ========================================================= */
export async function obtenerParametrosNegocio() {
  const { data, error } = await supabase
    .from('parametros_negocio')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw tiparError(error);
  return data;
}

/* =========================================================
   API PÚBLICA
   ========================================================= */

export async function crearPedido({
  cliente_id,
  items,
  prioridad = 'MEDIA',
  fecha_compromiso = null,
  obs = null,
  usuario_id = null,
  devuelve_envases = false,
  flete = 0,
  descuento_devolucion = 0
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { code: 'PEDIDO_SIN_ITEMS', detalle: 'items no puede estar vacío' };
  }
  for (const it of items) {
    if (!['INSUMO','KIT'].includes(it.tipo))
      throw { code: 'INPUT_INVALIDO', detalle: `tipo inválido: ${it.tipo}` };
    if (!(it.cantidad > 0))
      throw { code: 'INPUT_INVALIDO', detalle: 'cantidad debe ser > 0' };
  }

  const { data, error } = await supabase.rpc('crear_pedido', {
    p_cliente_id:           cliente_id,
    p_items:                items.map(i => ({
      tipo:               i.tipo,
      item_cod:           i.item_cod,
      cantidad:           i.cantidad,
      precio_unit:        i.precio_unit ?? 0,
      devuelve_envases:   i.devuelve_envases ?? false
    })),
    p_prioridad:            prioridad,
    p_fecha_compromiso:     fecha_compromiso,
    p_obs:                  obs,
    p_creado_por:           usuario_id,
    p_devuelve_envases:     devuelve_envases,
    p_flete:                flete,
    p_descuento_devolucion: descuento_devolucion
  });

  if (error) throw tiparError(error);
  return obtenerPedido(data);
}

export async function despacharPedido(pedido_id, usuario_id = null) {
  const { data, error } = await supabase.rpc('despachar_pedido', {
    p_pedido_id:  pedido_id,
    p_usuario_id: usuario_id
  });

  if (error) throw tiparError(error);
  return data;
}

export async function cancelarPedido(pedido_id) {
  const { error } = await supabase.rpc('cancelar_pedido', {
    p_pedido_id: pedido_id
  });
  if (error) throw tiparError(error);
  return true;
}

export async function obtenerPedido(pedido_id) {
  const { data: pedido, error: errP } = await supabase
    .from('pedidos')
    .select(`
      id, cliente_id, estado, prioridad, fecha_compromiso,
      monto, obs, creado_en, despachado_en, cancelado_en,
      devuelve_envases, flete, descuento_devolucion,
      clientes:cliente_id ( id, razon_social )
    `)
    .eq('id', pedido_id)
    .maybeSingle();

  if (errP) throw tiparError(errP);
  if (!pedido) return null;

  const { data: items, error: errI } = await supabase
    .from('pedido_items')
    .select('id, tipo, item_cod, cantidad, precio_unit, devuelve_envases')
    .eq('pedido_id', pedido_id);

  if (errI) throw tiparError(errI);

  return {
    ...pedido,
    cliente: pedido.clientes ?? null,
    clientes: undefined,
    items: items ?? []
  };
}

export async function listarPedidos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id, cliente_id, estado, prioridad, fecha_compromiso,
      monto, obs, creado_en, despachado_en, cancelado_en,
      devuelve_envases, flete, descuento_devolucion,
      clientes:cliente_id ( id, razon_social )
    `)
    .order('creado_en', { ascending: false });

  if (error) throw tiparError(error);

  return (data || []).map(p => ({
    ...p,
    cliente: p.clientes ?? null,
    clientes: undefined
  }));
}

export async function actualizarPedido({
  pedido_id,
  items,
  prioridad = 'MEDIA',
  fecha_compromiso = null,
  obs = null,
  devuelve_envases = false,
  flete = 0,
  descuento_devolucion = 0
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { code: 'PEDIDO_SIN_ITEMS', detalle: 'items no puede estar vacío' };
  }
  for (const it of items) {
    if (!['INSUMO','KIT'].includes(it.tipo))
      throw { code: 'INPUT_INVALIDO', detalle: `tipo inválido: ${it.tipo}` };
    if (!(it.cantidad > 0))
      throw { code: 'INPUT_INVALIDO', detalle: 'cantidad debe ser > 0' };
  }

  const { error } = await supabase.rpc('actualizar_pedido', {
    p_pedido_id:            pedido_id,
    p_items:                items.map(i => ({
      tipo:               i.tipo,
      item_cod:           i.item_cod,
      cantidad:           i.cantidad,
      precio_unit:        i.precio_unit ?? 0,
      devuelve_envases:   i.devuelve_envases ?? false
    })),
    p_prioridad:            prioridad,
    p_fecha_compromiso:     fecha_compromiso,
    p_obs:                  obs,
    p_devuelve_envases:     devuelve_envases,
    p_flete:                flete,
    p_descuento_devolucion: descuento_devolucion
  });

  if (error) throw tiparError(error);
  return obtenerPedido(pedido_id);
}