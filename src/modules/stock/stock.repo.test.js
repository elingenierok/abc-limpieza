import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calcularCobertura,
  calcularEstado,
  listarInsumos,
  obtenerInsumo,
  crearInsumo,
  actualizarFicha,
  registrarMovimiento,
  eliminarInsumo
} from './stock.repo.js';

/* =========================================================
   Mock de Supabase — control total por test
   ========================================================= */
const mock = {
  from: vi.fn(),
  rpc:  vi.fn()
};

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

beforeEach(() => {
  mock.from.mockReset();
  mock.rpc.mockReset();
});

/* =========================================================
   F-001 / F-007 puras
   ========================================================= */
describe('F-001 cobertura_dias', () => {
  it('B1: consumo=0 → null', () => {
    expect(calcularCobertura(50, 0)).toBeNull();
  });
  it('B2: consumo=null → null', () => {
    expect(calcularCobertura(50, null)).toBeNull();
  });
  it('caso normal: 48/6.5 → 7.38', () => {
    expect(calcularCobertura(48, 6.5)).toBe(7.38);
  });
});

describe('F-007 estado_stock', () => {
  it('B3: stock=0, minimo>0 → CRITICO', () => {
    expect(calcularEstado(0, 10)).toBe('CRITICO');
  });
  it('B4: stock=0, minimo=0 → OK', () => {
    expect(calcularEstado(0, 0)).toBe('OK');
  });
  it('stock=4, minimo=10 → CRITICO (porque 4 < 5)', () => {
    expect(calcularEstado(4, 10)).toBe('CRITICO');
  });
  it('stock=6, minimo=10 → BAJO', () => {
    expect(calcularEstado(6, 10)).toBe('BAJO');
  });
  it('stock=11, minimo=10 → ATENCION', () => {
    expect(calcularEstado(11, 10)).toBe('ATENCION');
  });
  it('stock=13, minimo=10 → OK', () => {
    expect(calcularEstado(13, 10)).toBe('OK');
  });
});

/* =========================================================
   listarInsumos + B8
   ========================================================= */
describe('listarInsumos', () => {
  it('B8: filtroEstado=CRITICO devuelve sólo críticos', async () => {
    mock.from.mockReturnValueOnce(chain({
      data: [
        { cod:'A', nom:'A', unidad:'L', stock:4,  minimo:10, consumo_diario:1, precio_unit:1 },
        { cod:'B', nom:'B', unidad:'L', stock:20, minimo:10, consumo_diario:1, precio_unit:1 },
        { cod:'C', nom:'C', unidad:'L', stock:1,  minimo:20, consumo_diario:1, precio_unit:1 }
      ],
      error: null
    }));

    const r = await listarInsumos({ filtroEstado: 'CRITICO' });
    expect(r.map(x => x.cod)).toEqual(['A','C']);
  });
});

/* =========================================================
   crearInsumo + B9
   ========================================================= */
describe('crearInsumo', () => {
  it('B9: cod duplicado → PK_DUPLICADA', async () => {
    mock.from.mockReturnValueOnce(chain({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' }
    }));

    await expect(crearInsumo({
      cod:'LIM-001', nom:'X', unidad:'L'
    })).rejects.toMatchObject({ code: 'PK_DUPLICADA' });
  });

  it('crea sin stock inicial → stock 0', async () => {
    mock.from.mockReturnValueOnce(chain({
      data: { cod:'LIM-999', nom:'X', unidad:'L', stock:0, minimo:0, consumo_diario:0, precio_unit:0 },
      error: null
    }));

    const r = await crearInsumo({ cod:'LIM-999', nom:'X', unidad:'L' });
    expect(r.stock).toBe(0);
    expect(r.estado_stock).toBe('OK');
    expect(r.cobertura_dias).toBeNull();
  });
});

/* =========================================================
   actualizarFicha + B7
   ========================================================= */
describe('actualizarFicha', () => {
  it('B7: ignora "stock" y emite warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mock.from.mockReturnValueOnce(chain({
      data: { cod:'LIM-001', nom:'Nuevo', unidad:'L', stock:48, minimo:20, consumo_diario:6.5, precio_unit:3.2 },
      error: null
    }));

    await actualizarFicha('LIM-001', { nom: 'Nuevo', stock: 999 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

/* =========================================================
   registrarMovimiento + B5 / B6
   ========================================================= */
describe('registrarMovimiento', () => {
  it('B5: salida > stock → STOCK_NEGATIVO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'STOCK_NEGATIVO: disponible=5, solicitado=10' }
    });

    await expect(registrarMovimiento({
      cod:'LIM-001', tipo:'salida', cantidad:10
    })).rejects.toMatchObject({
      code: 'STOCK_NEGATIVO',
      disponible: 5,
      solicitado: 10
    });
  });

  it('B6: cantidad negativa → INPUT_INVALIDO (no llega a RPC)', async () => {
    await expect(registrarMovimiento({
      cod:'LIM-001', tipo:'entrada', cantidad:-5
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

/* =========================================================
   eliminarInsumo + B10
   ========================================================= */
describe('eliminarInsumo', () => {
  it('B10: con movimientos → TIENE_MOVIMIENTOS', async () => {
    mock.from.mockReturnValueOnce(chain({
      count: 3,
      error: null
    }));

    await expect(eliminarInsumo('LIM-001'))
      .rejects.toMatchObject({ code: 'TIENE_MOVIMIENTOS', cantidad: 3 });
  });
});