import { supabase } from '../../core/supabase.js';

/* =========================================================
   F-001 · cobertura_dias
   ========================================================= */
export function calcularCobertura(stock, consumo_diario) {
  if (consumo_diario == null || consumo_diario <= 0) return null;
  return Number((stock / consumo_diario).toFixed(2));
}

/* =========================================================
   F-007 · estado_stock
   ========================================================= */
export function calcularEstado(stock, minimo) {
  if (stock < minimo * 0.5)  return 'CRITICO';
  if (stock < minimo)        return 'BAJO';
  if (stock < minimo * 1.25) return 'ATENCION';
  return 'OK';
}

/* Aplica derivados a una fila cruda */
function conDerivados(row) {
  if (!row) return null;
  const cobertura_dias = calcularCobertura(row.stock, row.consumo_diario);
  const estado_stock   = calcularEstado(row.stock, row.minimo);
  return { ...row, cobertura_dias, estado_stock };
}

/* Normaliza errores de Supabase a códigos tipados */
function tiparError(err) {
  if (!err) return null;
  const msg = err.message || '';
  if (err.code === '23505' || msg.includes('duplicate key')) {
    return { code: 'PK_DUPLICADA', detalle: msg };
  }
  if (msg.startsWith('STOCK_NEGATIVO')) {
    const m = msg.match(/disponible=([\d.]+),\s*solicitado=([\d.]+)/);
    return {
      code: 'STOCK_NEGATIVO',
      disponible: m ? Number(m[1]) : null,
      solicitado: m ? Number(m[2]) : null
    };
  }
  if (msg.startsWith('INPUT_INVALIDO')) return { code: 'INPUT_INVALIDO', detalle: msg };
  if (msg.startsWith('INSUMO_NO_EXISTE')) return { code: 'INSUMO_NO_EXISTE', detalle: msg };
  return { code: 'ERROR_SUPABASE', detalle: msg, raw: err };
}

/* =========================================================
   API PÚBLICA
   ========================================================= */

export async function listarInsumos({ filtroEstado, ordenarPor } = {}) {
  const { data, error } = await supabase
    .from('stock_insumos')
    .select('*');

  if (error) throw tiparError(error);

  let rows = (data ?? []).map(conDerivados);

  if (filtroEstado) {
    rows = rows.filter(r => r.estado_stock === filtroEstado);
  }

  if (ordenarPor) {
    const dir = ordenarPor.startsWith('-') ? -1 : 1;
    const campo = ordenarPor.replace(/^-/, '');
    rows.sort((a, b) => {
      const av = a[campo], bv = b[campo];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  return rows;
}

export async function obtenerInsumo(cod) {
  const { data, error } = await supabase
    .from('stock_insumos')
    .select('*')
    .eq('cod', cod)
    .maybeSingle();

  if (error) throw tiparError(error);
  return conDerivados(data);
}

export async function crearInsumo({
  cod, nom, unidad, minimo = 0, consumo_diario = 0, precio_unit = 0,
  stock_inicial = 0, usuario_id = null
}) {
  const { data, error } = await supabase
    .from('stock_insumos')
    .insert({ cod, nom, unidad, stock: 0, minimo, consumo_diario, precio_unit })
    .select('*')
    .single();

  if (error) throw tiparError(error);

  if (stock_inicial > 0) {
    await registrarMovimiento({
      cod,
      tipo: 'ajuste',
      cantidad: stock_inicial,
      motivo: 'Stock inicial al crear insumo',
      usuario_id
    });
    return obtenerInsumo(cod);
  }

  return conDerivados(data);
}

export async function actualizarFicha(cod, payload) {
  const { stock, ...resto } = payload ?? {};
  if (stock !== undefined) {
    console.warn('[stock.repo] actualizarFicha recibió "stock" — ignorado (R2)');
  }

  const permitidos = ['nom','unidad','minimo','consumo_diario','precio_unit'];
  const limpio = Object.fromEntries(
    Object.entries(resto).filter(([k]) => permitidos.includes(k))
  );

  if (Object.keys(limpio).length === 0) {
    return obtenerInsumo(cod);
  }

  const { data, error } = await supabase
    .from('stock_insumos')
    .update(limpio)
    .eq('cod', cod)
    .select('*')
    .single();

  if (error) throw tiparError(error);
  return conDerivados(data);
}

export async function registrarMovimiento({ cod, tipo, cantidad, motivo = null, usuario_id = null }) {
  if (!['entrada','salida','ajuste'].includes(tipo)) {
    throw { code: 'INPUT_INVALIDO', detalle: `tipo inválido: ${tipo}` };
  }
  if (!(cantidad > 0)) {
    throw { code: 'INPUT_INVALIDO', detalle: 'cantidad debe ser > 0' };
  }

  const { data, error } = await supabase.rpc('registrar_movimiento', {
    p_cod:        cod,
    p_tipo:       tipo,
    p_cantidad:   cantidad,
    p_motivo:     motivo,
    p_usuario_id: usuario_id
  });

  if (error) throw tiparError(error);

  const insumo = await obtenerInsumo(cod);
  return {
    insumo,
    movimiento: {
      id: data.movimiento_id,
      tipo,
      item_cod: cod,
      cantidad,
      motivo,
      usuario_id,
      stock_previo: data.stock_previo,
      stock_nuevo:  data.stock_nuevo
    }
  };
}

export async function listarMovimientos({ cod, limite = 50 } = {}) {
  let q = supabase
    .from('movimientos')
    .select(`
      id,
      fecha,
      tipo,
      item_cod,
      cantidad,
      motivo,
      usuario_id
    `)
    .order('fecha', { ascending: false })
    .limit(limite);

  if (cod) {
    q = q.eq('item_cod', cod);
  }

  const { data, error } = await q;
  if (error) throw tiparError(error);
  return data ?? [];
}

export async function eliminarInsumo(cod) {
  const { count, error: errCount } = await supabase
    .from('movimientos')
    .select('id', { count: 'exact', head: true })
    .eq('item_cod', cod);

  if (errCount) throw tiparError(errCount);

  if ((count ?? 0) > 0) {
    throw { code: 'TIENE_MOVIMIENTOS', cantidad: count };
  }

  const { error } = await supabase
    .from('stock_insumos')
    .delete()
    .eq('cod', cod);

  if (error) throw tiparError(error);
  return true;
}