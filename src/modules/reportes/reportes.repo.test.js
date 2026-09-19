import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obtenerValorizacionStock,
  obtenerRankingVentas,
  obtenerResumenOperativo
} from './reportes.repo.js';

const mock = { rpc: vi.fn() };

vi.mock('../../core/supabase.js', () => ({
  supabase: { rpc: (...a) => mock.rpc(...a) }
}));

beforeEach(() => { mock.rpc.mockReset(); });

/* =========================================================
   obtenerValorizacionStock
   ========================================================= */
describe('obtenerValorizacionStock', () => {
  it('devuelve payload del RPC', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: {
        total_valorizado: 1234.56,
        items_con_stock: 10,
        items_sin_costo_real: 2,
        detalle: [
          { cod:'LIM-001', nom:'Detergente', unidad:'L', stock:48, costo_unit:2.5, valor_total:120, fuente_costo:'ultimo_costo_oc' }
        ]
      },
      error: null
    });
    const r = await obtenerValorizacionStock();
    expect(r.total_valorizado).toBe(1234.56);
    expect(r.detalle[0].fuente_costo).toBe('ultimo_costo_oc');
    expect(mock.rpc).toHaveBeenCalledWith('reportes_valorizacion_stock');
  });

  it('PERMISO_DENEGADO propagado', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'PERMISO_DENEGADO' }
    });
    await expect(obtenerValorizacionStock())
      .rejects.toMatchObject({ code: 'PERMISO_DENEGADO' });
  });
});

/* =========================================================
   obtenerRankingVentas
   ========================================================= */
describe('obtenerRankingVentas', () => {
  it('sin fechaInicio → INPUT_INVALIDO (no llama RPC)', async () => {
    await expect(obtenerRankingVentas({ fechaInicio: null, fechaFin: '2026-09-30' }))
      .rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('fechaFin < fechaInicio → INPUT_INVALIDO', async () => {
    await expect(obtenerRankingVentas({ fechaInicio: '2026-10-01', fechaFin: '2026-09-01' }))
      .rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });

  it('top fuera de rango → INPUT_INVALIDO', async () => {
    await expect(obtenerRankingVentas({
      fechaInicio: '2026-09-01', fechaFin: '2026-09-30', top: 0
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
    await expect(obtenerRankingVentas({
      fechaInicio: '2026-09-01', fechaFin: '2026-09-30', top: 9999
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });

  it('OK devuelve por_cantidad y por_facturacion', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: {
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-30',
        total_items: 3,
        facturado_total: 5000,
        por_cantidad: [
          { tipo:'KIT',    item_cod:'hogar-basico', nombre:'Kit Hogar Básico', cantidad_total: 40, facturado_total: 2000 }
        ],
        por_facturacion: [
          { tipo:'INSUMO', item_cod:'LIM-005', nombre:'Jabón manos', cantidad_total: 100, facturado_total: 360 }
        ]
      },
      error: null
    });

    const r = await obtenerRankingVentas({ fechaInicio: '2026-09-01', fechaFin: '2026-09-30' });
    expect(r.total_items).toBe(3);
    expect(r.por_cantidad[0].tipo).toBe('KIT');
    expect(mock.rpc).toHaveBeenCalledWith('reportes_ranking_ventas', {
      p_fecha_inicio: '2026-09-01',
      p_fecha_fin:    '2026-09-30',
      p_top:          20
    });
  });

  it('rango sin ventas → arrays vacíos', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: {
        fecha_inicio:'2026-01-01', fecha_fin:'2026-01-31',
        total_items: 0, facturado_total: 0,
        por_cantidad: [], por_facturacion: []
      },
      error: null
    });
    const r = await obtenerRankingVentas({ fechaInicio:'2026-01-01', fechaFin:'2026-01-31' });
    expect(r.por_cantidad).toEqual([]);
    expect(r.total_items).toBe(0);
  });
});

/* =========================================================
   obtenerResumenOperativo
   ========================================================= */
describe('obtenerResumenOperativo', () => {
  it('devuelve todos los campos esperados', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: {
        clientes_activos: 12,
        proveedores_activos: 4,
        pedidos_pendientes: 5,
        pedidos_preparados: 3,
        pedidos_en_camino: 2,
        pedidos_entregados: 40,
        stock_critico: 2,
        stock_bajo: 3,
        stock_atencion: 1,
        stock_ok: 6
      },
      error: null
    });

    const r = await obtenerResumenOperativo();
    expect(r.clientes_activos).toBe(12);
    expect(r.stock_critico).toBe(2);
    expect(r.stock_ok).toBe(6);
    expect(mock.rpc).toHaveBeenCalledWith('reportes_resumen_operativo');
  });
});