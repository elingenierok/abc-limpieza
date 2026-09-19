import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  crearProveedor,
  crearOrdenCompra,
  enviarOrdenCompra,
  recibirOrdenCompra,
  cancelarOrdenCompra,
  obtenerOrdenCompra,
  listarOrdenesCompra
} from './compras.repo.js';

const mock = { from: vi.fn(), rpc: vi.fn() };

vi.mock('../../core/supabase.js', () => ({
  supabase: {
    from: (...a) => mock.from(...a),
    rpc:  (...a) => mock.rpc(...a)
  }
}));

function chain(result) {
  const obj = {
    select: vi.fn(() => obj),
    insert: vi.fn(() => obj),
    update: vi.fn(() => obj),
    delete: vi.fn(() => obj),
    eq:     vi.fn(() => obj),
    or:     vi.fn(() => obj),
    order:  vi.fn(() => obj),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (res, rej) => Promise.resolve(result).then(res, rej)
  };
  return obj;
}

beforeEach(() => { mock.from.mockReset(); mock.rpc.mockReset(); });

/* =========================================================
   Proveedores
   ========================================================= */
describe('crearProveedor', () => {
  it('sin razon_social → INPUT_INVALIDO (no llama Supabase)', async () => {
    await expect(crearProveedor({ razon_social: '   ' }))
      .rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('cuit duplicado → CUIT_DUPLICADO', async () => {
    mock.from.mockReturnValueOnce(chain({
      data: null,
      error: { code:'23505', message:'duplicate key value violates unique constraint "proveedores_cuit_key"' }
    }));
    await expect(crearProveedor({ razon_social:'X', cuit:'20-1-2' }))
      .rejects.toMatchObject({ code: 'CUIT_DUPLICADO' });
  });

  it('creación OK devuelve fila', async () => {
    mock.from.mockReturnValueOnce(chain({
      data: { id:'p1', razon_social:'Distribuidora X', cuit:null, email:null, telefono:null, direccion:null, activo:true, creado_en:'2026-09-18' },
      error: null
    }));
    const r = await crearProveedor({ razon_social: 'Distribuidora X' });
    expect(r.id).toBe('p1');
  });
});

/* =========================================================
   crearOrdenCompra
   ========================================================= */
describe('crearOrdenCompra', () => {
  it('sin items → OC_SIN_ITEMS (no llama RPC)', async () => {
    await expect(crearOrdenCompra({ proveedor_id:'pv1', items: [] }))
      .rejects.toMatchObject({ code: 'OC_SIN_ITEMS' });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('cantidad <= 0 → INPUT_INVALIDO', async () => {
    await expect(crearOrdenCompra({
      proveedor_id:'pv1',
      items: [{ item_cod:'LIM-001', cantidad: 0, costo_unit: 1 }]
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });

  it('costo_unit negativo → INPUT_INVALIDO', async () => {
    await expect(crearOrdenCompra({
      proveedor_id:'pv1',
      items: [{ item_cod:'LIM-001', cantidad: 1, costo_unit: -0.5 }]
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });

  it('proveedor inexistente → PROVEEDOR_NO_EXISTE', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message:'PROVEEDOR_NO_EXISTE: pv-x' }
    });
    await expect(crearOrdenCompra({
      proveedor_id:'pv-x',
      items: [{ item_cod:'LIM-001', cantidad: 10, costo_unit: 2.5 }]
    })).rejects.toMatchObject({ code: 'PROVEEDOR_NO_EXISTE' });
  });

  it('creación OK → devuelve orden hidratada', async () => {
    mock.rpc.mockResolvedValueOnce({ data: 'oc-1', error: null });
    mock.from
      .mockReturnValueOnce(chain({
        data: {
          id:'oc-1', proveedor_id:'pv1', estado:'BORRADOR', monto_total:25,
          obs:null, creado_en:'2026-09-18', enviado_en:null, recibido_en:null, cancelado_en:null,
          proveedores: { id:'pv1', razon_social:'Distribuidora X' }
        },
        error: null
      }))
      .mockReturnValueOnce(chain({
        data: [{ id:'i1', item_cod:'LIM-001', cantidad:10, costo_unit:2.5 }],
        error: null
      }));

    const r = await crearOrdenCompra({
      proveedor_id:'pv1',
      items: [{ item_cod:'LIM-001', cantidad:10, costo_unit:2.5 }]
    });
    expect(r.id).toBe('oc-1');
    expect(r.proveedor.razon_social).toBe('Distribuidora X');
    expect(r.items).toHaveLength(1);
  });
});

/* =========================================================
   enviarOrdenCompra
   ========================================================= */
describe('enviarOrdenCompra', () => {
  it('OK', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(enviarOrdenCompra('oc-1')).resolves.toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith('enviar_orden_compra', { p_orden_id: 'oc-1' });
  });

  it('estado inválido → ESTADO_INVALIDO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message:'ESTADO_INVALIDO: orden en RECIBIDA, no BORRADOR' }
    });
    await expect(enviarOrdenCompra('oc-1'))
      .rejects.toMatchObject({ code: 'ESTADO_INVALIDO' });
  });
});

/* =========================================================
   recibirOrdenCompra
   ========================================================= */
describe('recibirOrdenCompra', () => {
  it('OK devuelve items_recibidos', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: { orden_id:'oc-1', estado:'RECIBIDA', items_recibidos: 3 },
      error: null
    });
    const r = await recibirOrdenCompra('oc-1', 'u1');
    expect(r.estado).toBe('RECIBIDA');
    expect(r.items_recibidos).toBe(3);
    expect(mock.rpc).toHaveBeenCalledWith('recibir_orden_compra', {
      p_orden_id: 'oc-1',
      p_usuario_id: 'u1'
    });
  });

  it('estado inválido → ESTADO_INVALIDO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message:'ESTADO_INVALIDO: orden en CANCELADA, no BORRADOR ni ENVIADA' }
    });
    await expect(recibirOrdenCompra('oc-1'))
      .rejects.toMatchObject({ code: 'ESTADO_INVALIDO' });
  });

  it('OC inexistente → OC_NO_EXISTE', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message:'OC_NO_EXISTE: oc-x' }
    });
    await expect(recibirOrdenCompra('oc-x'))
      .rejects.toMatchObject({ code: 'OC_NO_EXISTE' });
  });
});

/* =========================================================
   cancelarOrdenCompra
   ========================================================= */
describe('cancelarOrdenCompra', () => {
  it('OK', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(cancelarOrdenCompra('oc-1')).resolves.toBe(true);
  });

  it('orden ya RECIBIDA → ESTADO_INVALIDO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message:'ESTADO_INVALIDO: no se puede cancelar una orden RECIBIDA' }
    });
    await expect(cancelarOrdenCompra('oc-1'))
      .rejects.toMatchObject({ code: 'ESTADO_INVALIDO' });
  });
});

/* =========================================================
   obtenerOrdenCompra
   ========================================================= */
describe('obtenerOrdenCompra', () => {
  it('inexistente → null', async () => {
    mock.from.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(obtenerOrdenCompra('nope')).resolves.toBeNull();
  });

  it('hidrata proveedor + items ordenados', async () => {
    mock.from
      .mockReturnValueOnce(chain({
        data: {
          id:'oc-1', proveedor_id:'pv1', estado:'RECIBIDA', monto_total:25,
          obs:null, creado_en:'2026-09-18', enviado_en:'2026-09-18', recibido_en:'2026-09-19', cancelado_en:null,
          proveedores: { id:'pv1', razon_social:'Distribuidora X' }
        },
        error: null
      }))
      .mockReturnValueOnce(chain({
        data: [
          { id:'i1', item_cod:'LIM-001', cantidad:10, costo_unit:2.5 }
        ],
        error: null
      }));

    const r = await obtenerOrdenCompra('oc-1');
    expect(r.proveedor.razon_social).toBe('Distribuidora X');
    expect(r.proveedores).toBeUndefined();
    expect(r.items[0].item_cod).toBe('LIM-001');
  });
});

/* =========================================================
   listarOrdenesCompra
   ========================================================= */
describe('listarOrdenesCompra', () => {
  it('sin filtros no aplica eq', async () => {
    const c = chain({ data: [], error: null });
    mock.from.mockReturnValueOnce(c);
    await listarOrdenesCompra({});
    expect(c.eq).not.toHaveBeenCalled();
  });

  it('con estado y proveedor aplica ambos eq', async () => {
    const c = chain({ data: [], error: null });
    mock.from.mockReturnValueOnce(c);
    await listarOrdenesCompra({ estado: 'ENVIADA', proveedor_id: 'pv1' });
    expect(c.eq).toHaveBeenCalledWith('estado', 'ENVIADA');
    expect(c.eq).toHaveBeenCalledWith('proveedor_id', 'pv1');
  });
});