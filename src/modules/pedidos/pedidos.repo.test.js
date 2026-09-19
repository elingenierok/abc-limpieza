import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  crearPedido,
  despacharPedido,
  cancelarPedido,
  obtenerPedido
} from './pedidos.repo.js';

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
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (res, rej) => Promise.resolve(result).then(res, rej)
  };
  return obj;
}

beforeEach(() => { mock.from.mockReset(); mock.rpc.mockReset(); });

/* =========================================================
   crearPedido
   ========================================================= */
describe('crearPedido', () => {
  it('sin items → PEDIDO_SIN_ITEMS (no llama RPC)', async () => {
    await expect(crearPedido({ cliente_id:'c1', items: [] }))
      .rejects.toMatchObject({ code: 'PEDIDO_SIN_ITEMS' });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('tipo inválido → INPUT_INVALIDO', async () => {
    await expect(crearPedido({
      cliente_id:'c1',
      items: [{ tipo:'OTRO', item_cod:'X', cantidad:1 }]
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });

  it('cantidad <= 0 → INPUT_INVALIDO', async () => {
    await expect(crearPedido({
      cliente_id:'c1',
      items: [{ tipo:'INSUMO', item_cod:'X', cantidad:0 }]
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });
});

/* =========================================================
   despacharPedido · STOCK_INSUFICIENTE
   ========================================================= */
describe('despacharPedido', () => {
  it('stock insuficiente → propaga faltantes parseados', async () => {
    const json = JSON.stringify([
      { cod:'LIM-004', requerido: 5, disponible: 2 },
      { cod:'LIM-006', requerido: 3, disponible: 0 }
    ]);
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: `STOCK_INSUFICIENTE: ${json}` }
    });

    const err = await despacharPedido('p1').catch(e => e);
    expect(err.code).toBe('STOCK_INSUFICIENTE');
    expect(err.faltantes).toHaveLength(2);
    expect(err.faltantes[0]).toMatchObject({ cod:'LIM-004', requerido:5, disponible:2 });
  });

  it('estado inválido → ESTADO_INVALIDO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ESTADO_INVALIDO: pedido en ENTREGADO, no PENDIENTE' }
    });
    await expect(despacharPedido('p1'))
      .rejects.toMatchObject({ code: 'ESTADO_INVALIDO' });
  });

  it('despacho OK → devuelve resultado del RPC', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: { pedido_id:'p1', estado:'ENTREGADO', items_movidos: 4 },
      error: null
    });
    const r = await despacharPedido('p1');
    expect(r.estado).toBe('ENTREGADO');
    expect(r.items_movidos).toBe(4);
  });
});

/* =========================================================
   cancelarPedido
   ========================================================= */
describe('cancelarPedido', () => {
  it('cancelado OK', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(cancelarPedido('p1')).resolves.toBe(true);
  });

  it('pedido ya ENTREGADO → ESTADO_INVALIDO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ESTADO_INVALIDO: no se puede cancelar un pedido ENTREGADO' }
    });
    await expect(cancelarPedido('p1'))
      .rejects.toMatchObject({ code: 'ESTADO_INVALIDO' });
  });
});

/* =========================================================
   obtenerPedido
   ========================================================= */
describe('obtenerPedido', () => {
  it('hidrata cliente + items', async () => {
    mock.from
      .mockReturnValueOnce(chain({
        data: {
          id:'p1', cliente_id:'c1', estado:'PENDIENTE', prioridad:'MEDIA',
          fecha_compromiso:null, monto:100, obs:null,
          creado_en:'2026-09-18', despachado_en:null, cancelado_en:null,
          clientes: { id:'c1', razon_social:'Hotel Costa Norte' }
        },
        error: null
      }))
      .mockReturnValueOnce(chain({
        data: [{ id:'i1', tipo:'KIT', item_cod:'hogar-basico', cantidad:2, precio_unit:50 }],
        error: null
      }));

    const r = await obtenerPedido('p1');
    expect(r.cliente.razon_social).toBe('Hotel Costa Norte');
    expect(r.items).toHaveLength(1);
    expect(r.clientes).toBeUndefined();
  });

  it('pedido inexistente → null', async () => {
    mock.from.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(obtenerPedido('nope')).resolves.toBeNull();
  });
});