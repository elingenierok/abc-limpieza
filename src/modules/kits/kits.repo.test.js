import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calcularMaxArmables,
  listarKits,
  obtenerKit,
  crearKit,
  actualizarKitItems,
  eliminarKit
} from './kits.repo.js';

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
   F-009 · cálculo puro
   ========================================================= */
describe('F-009 kit_max_armable', () => {
  it('componente limitante determina el máximo', () => {
    // A: 48/1.0 = 48 ; B: 8/0.5 = 16 ; C: 30/2.0 = 15 → 15
    const r = calcularMaxArmables([
      { cantidad: 1.0, stock_actual: 48 },
      { cantidad: 0.5, stock_actual: 8  },
      { cantidad: 2.0, stock_actual: 30 }
    ]);
    expect(r).toBe(15);
  });

  it('un componente con stock 0 → 0', () => {
    const r = calcularMaxArmables([
      { cantidad: 1.0, stock_actual: 48 },
      { cantidad: 1.0, stock_actual: 0  }
    ]);
    expect(r).toBe(0);
  });

  it('kit sin componentes → null', () => {
    expect(calcularMaxArmables([])).toBeNull();
    expect(calcularMaxArmables(null)).toBeNull();
  });

  it('componente con cantidad 0 → null (inválido)', () => {
    expect(calcularMaxArmables([
      { cantidad: 0, stock_actual: 10 }
    ])).toBeNull();
  });

  it('floor, no round', () => {
    // 5/1.5 = 3.33 → 3
    expect(calcularMaxArmables([
      { cantidad: 1.5, stock_actual: 5 }
    ])).toBe(3);
  });

  it('un solo componente, caso simple', () => {
    expect(calcularMaxArmables([
      { cantidad: 0.9, stock_actual: 10 }
    ])).toBe(11);
  });
});

/* =========================================================
   API pública
   ========================================================= */
describe('crearKit', () => {
  it('sin items → KIT_SIN_ITEMS (no llama a Supabase)', async () => {
    await expect(crearKit({
      id:'k1', nombre:'X', categoria:'Hogar', items: []
    })).rejects.toMatchObject({ code: 'KIT_SIN_ITEMS' });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('items válidos → llama kit + RPC', async () => {
    mock.from
      .mockReturnValueOnce(chain({ data: null, error: null }))     // insert kit
      .mockReturnValueOnce(chain({ data: { id:'k1', nombre:'X', categoria:'Hogar', descripcion:null, activo:true }, error: null })) // obtenerKit
      .mockReturnValueOnce(chain({ data: [], error: null }));       // hidratar kit_items

    mock.rpc.mockResolvedValueOnce({ data: null, error: null });

    const r = await crearKit({
      id:'k1', nombre:'X', categoria:'Hogar',
      items: [{ cod:'LIM-001', cantidad: 1 }]
    });
    expect(r.id).toBe('k1');
    expect(mock.rpc).toHaveBeenCalledWith('reemplazar_kit_items', {
      p_kit_id: 'k1',
      p_items: [{ cod: 'LIM-001', cantidad: 1 }]
    });
  });

  it('RPC falla → rollback del kit huérfano', async () => {
    mock.from
      .mockReturnValueOnce(chain({ data: null, error: null }))       // insert kit
      .mockReturnValueOnce(chain({ data: null, error: null }));      // delete rollback

    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'KIT_SIN_ITEMS' }
    });

    await expect(crearKit({
      id:'k1', nombre:'X', categoria:'Hogar',
      items: [{ cod:'LIM-001', cantidad: 1 }]
    })).rejects.toMatchObject({ code: 'KIT_SIN_ITEMS' });

    // Se llamó delete sobre kits
    const deleteCall = mock.from.mock.calls.find(c => c[0] === 'kits');
    expect(deleteCall).toBeDefined();
  });
});

describe('actualizarKitItems', () => {
  it('items vacíos → KIT_SIN_ITEMS', async () => {
    await expect(actualizarKitItems('k1', []))
      .rejects.toMatchObject({ code: 'KIT_SIN_ITEMS' });
  });

  it('kit inexistente → KIT_NO_EXISTE propagado', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'KIT_NO_EXISTE: k1' }
    });
    await expect(actualizarKitItems('k1', [{ cod:'LIM-001', cantidad: 1 }]))
      .rejects.toMatchObject({ code: 'KIT_NO_EXISTE' });
  });
});

describe('eliminarKit', () => {
  it('elimina sin error', async () => {
    mock.from.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(eliminarKit('k1')).resolves.toBe(true);
  });
});