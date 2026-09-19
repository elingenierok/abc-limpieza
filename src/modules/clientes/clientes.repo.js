import { supabase } from '../../core/supabase.js';

function tiparError(err) {
  if (!err) return null;
  const msg = err.message || '';
  if (msg.startsWith('CLIENTE_NO_EXISTE'))  return { code: 'CLIENTE_NO_EXISTE', detalle: msg };
  if (msg.startsWith('INPUT_INVALIDO'))     return { code: 'INPUT_INVALIDO', detalle: msg };
  if (err.code === '23505' || msg.includes('duplicate key')) {
    if (msg.includes('cuit')) return { code: 'CUIT_DUPLICADO', detalle: msg };
    return { code: 'PK_DUPLICADA', detalle: msg };
  }
  if (msg.includes('violates check'))       return { code: 'CHECK_VIOLADO', detalle: msg };
  if (msg.includes('violates foreign key')) return { code: 'FK_INVALIDA', detalle: msg };
  return { code: 'ERROR_SUPABASE', detalle: msg, raw: err };
}

/* Trae direcciones de un cliente */
async function hidratarDirecciones(cliente_id) {
  const { data, error } = await supabase
    .from('cliente_direcciones')
    .select('id, etiqueta, direccion, localidad, provincia, es_principal, creado_en')
    .eq('cliente_id', cliente_id)
    .order('es_principal', { ascending: false })
    .order('creado_en', { ascending: true });

  if (error) throw tiparError(error);
  return data ?? [];
}

/* =========================================================
   API PÚBLICA
   ========================================================= */

export async function listarClientes({ soloActivos = true, search = '' } = {}) {
  let q = supabase
    .from('clientes')
    .select('id, razon_social, nombre_fantasia, cuit, condicion_iva, email, telefono, limite_credito, activo, creado_en');

  if (soloActivos) q = q.eq('activo', true);

  if (search && search.trim().length > 0) {
    const s = `%${search.trim()}%`;
    q = q.or(`razon_social.ilike.${s},nombre_fantasia.ilike.${s},cuit.ilike.${s}`);
  }

  const { data, error } = await q.order('razon_social', { ascending: true });
  if (error) throw tiparError(error);
  return data ?? [];
}

export async function obtenerCliente(id) {
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('id, razon_social, nombre_fantasia, cuit, condicion_iva, email, telefono, limite_credito, activo, creado_en')
    .eq('id', id)
    .maybeSingle();

  if (error) throw tiparError(error);
  if (!cliente) return null;

  const direcciones = await hidratarDirecciones(id);
  return { ...cliente, direcciones };
}

export async function crearCliente({
  razon_social,
  cuit = null,
  condicion_iva = 'CONSUMIDOR_FINAL',
  email = null,
  telefono = null,
  nombre_fantasia = null,
  limite_credito = 0,
  direcciones = []
}) {
  if (!razon_social || razon_social.trim().length === 0) {
    throw { code: 'INPUT_INVALIDO', detalle: 'razon_social requerida' };
  }
  for (const d of direcciones) {
    if (!d.etiqueta || !d.direccion || !d.localidad || !d.provincia) {
      throw { code: 'INPUT_INVALIDO', detalle: 'dirección requiere etiqueta, direccion, localidad, provincia' };
    }
  }

  const { data: id, error } = await supabase.rpc('crear_cliente_completo', {
    p_razon_social:    razon_social.trim(),
    p_cuit:            cuit,
    p_condicion_iva:   condicion_iva,
    p_email:           email,
    p_telefono:        telefono,
    p_nombre_fantasia: nombre_fantasia,
    p_limite_credito:  limite_credito,
    p_direcciones:     direcciones
  });

  if (error) throw tiparError(error);
  return obtenerCliente(id);
}

export async function actualizarCliente(id, datos) {
  const { direcciones, ...resto } = datos ?? {};

  const { error } = await supabase.rpc('actualizar_cliente_completo', {
    p_cliente_id:  id,
    p_datos:       resto,
    p_direcciones: direcciones === undefined ? null : direcciones
  });

  if (error) throw tiparError(error);
  return obtenerCliente(id);
}

export async function eliminarCliente(id) {
  // Cuenta pedidos asociados
  const { count, error: errC } = await supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id);

  if (errC) throw tiparError(errC);

  if ((count ?? 0) > 0) {
    // Soft-delete
    const { error } = await supabase
      .from('clientes')
      .update({ activo: false })
      .eq('id', id);
    if (error) throw tiparError(error);
    return { modo: 'soft', pedidos_asociados: count };
  }

  // Hard delete (cascade borra direcciones)
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) throw tiparError(error);
  return { modo: 'hard', pedidos_asociados: 0 };
}