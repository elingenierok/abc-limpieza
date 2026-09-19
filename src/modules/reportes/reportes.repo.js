import { supabase } from '../../core/supabase.js';

function tiparError(err) {
  if (!err) return null;
  const msg = err.message || '';
  if (msg.startsWith('PERMISO_DENEGADO'))  return { code: 'PERMISO_DENEGADO', detalle: msg };
  if (msg.startsWith('INPUT_INVALIDO'))    return { code: 'INPUT_INVALIDO', detalle: msg };
  if (msg.startsWith('PEDIDO_NO_EXISTE'))  return { code: 'PEDIDO_NO_EXISTE', detalle: msg };
  return { code: 'ERROR_SUPABASE', detalle: msg, raw: err };
}

/* =========================================================
   API PÚBLICA
   ========================================================= */

export async function obtenerValorizacionStock() {
  const { data, error } = await supabase.rpc('reportes_valorizacion_stock');
  if (error) throw tiparError(error);
  return data;  // { total_valorizado, items_con_stock, items_sin_costo_real, detalle: [...] }
}

export async function obtenerRankingVentas({ fechaInicio, fechaFin, top = 20 }) {
  if (!fechaInicio || !fechaFin) {
    throw { code: 'INPUT_INVALIDO', detalle: 'fechaInicio y fechaFin requeridos' };
  }
  if (new Date(fechaFin) < new Date(fechaInicio)) {
    throw { code: 'INPUT_INVALIDO', detalle: 'fechaFin < fechaInicio' };
  }
  if (!Number.isInteger(top) || top <= 0 || top > 500) {
    throw { code: 'INPUT_INVALIDO', detalle: 'top fuera de rango' };
  }

  const { data, error } = await supabase.rpc('reportes_ranking_ventas', {
    p_fecha_inicio: fechaInicio,
    p_fecha_fin:    fechaFin,
    p_top:          top
  });

  if (error) throw tiparError(error);
  return data;
}

export async function obtenerResumenOperativo() {
  const { data, error } = await supabase.rpc('reportes_resumen_operativo');
  if (error) throw tiparError(error);
  return data;
}