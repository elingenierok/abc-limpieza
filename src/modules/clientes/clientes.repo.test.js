import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} from './clientes.repo.js';

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
   crearCliente
   ========================================================= */
describe('crearCliente', () => {
  it('sin razon_social → INPUT_INVALIDO (no llama RPC)', async () => {
    await expect(crearCliente({ razon_social: '   ' }))
      .rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('dirección incompleta → INPUT_INVALIDO', async () => {
    await expect(crearCliente({
      razon_social: 'X',
      direcciones: [{ etiqueta: 'A', direccion: 'Calle 1' }]  // faltan localidad y provincia
    })).rejects.toMatchObject({ code: 'INPUT_INVALIDO' });
  });

  it('cuit duplicado → CUIT_DUPLICADO', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "clientes_cuit_unique"' }
    });
    await expect(crearCliente({
      razon_social: 'X', cuit: '20-12345678-9'
    })).rejects.toMatchObject({ code: 'CUIT_DUPLICADO' });
  });

  it('creación OK → devuelve cliente con direcciones', async () => {
    mock.rpc.mockResolvedValueOnce({ data: 'uuid-1', error: null });
    mock.from
      .mockReturnValueOnce(chain({
        data: {
          id:'uuid-1', razon_social:'Hotel X', nombre_fantasia:null, cuit:null,
          condicion_iva:'CONSUMIDOR_FINAL', email:null, telefono:null,
          limite_credito:0, activo:true, creado_en:'2026-09-18'
        },
        error: null
      }))
      .mockReturnValueOnce(chain({
        data: [{ id:'d1', etiqueta:'Principal', direccion:'Calle 1', localidad:'CABA', provincia:'CABA', es_principal:true, creado_en:'2026-09-18' }],
        error: null
      }));

    const r = await crearCliente({
      razon_social:'Hotel X',
      direcciones: [{ etiqueta:'Principal', direccion:'Calle 1', localidad:'CABA', provincia:'CABA' }]
    });
    expect(r.id).toBe('uuid-1');
    expect(r.direcciones).toHaveLength(1);
    expect(r.direcciones[0].es_principal).toBe(true);
  });
});

/* =========================================================
   listarClientes
   ========================================================= */
describe('listarClientes', () => {
  it('sin search → no aplica filtro ilike', async () => {
    const c = chain({ data: [], error: null });
    mock.from.mockReturnValueOnce(c);
    await listarClientes({});
    expect(c.or).not.toHaveBeenCalled();
  });

  it('con search → aplica ilike sobre 3 campos', async () => {
    const c = chain({ data: [], error: null });
    mock.from.mockReturnValueOnce(c);
    await listarClientes({ search: 'hotel' });
    expect(c.or).toHaveBeenCalledWith(
      'razon_social.ilike.%hotel%,nombre_fantasia.ilike.%hotel%,cuit.ilike.%hotel%'
    );
  });
});

/* =========================================================
   obtenerCliente
   ========================================================= */
describe('obtenerCliente', () => {
  it('inexistente → null', async () => {
    mock.from.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(obtenerCliente('nope')).resolves.toBeNull();
  });
});

/* =========================================================
   actualizarCliente
   ========================================================= */
describe('actualizarCliente', () => {
  it('pasa direcciones=null cuando no se especifican', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null });
    mock.from
      .mockReturnValueOnce(chain({
        data: { id:'uuid-1', razon_social:'X', activo:true, condicion_iva:'CONSUMIDOR_FINAL',
                nombre_fantasia:null, cuit:null, email:null, telefono:null, limite_credito:0, creado_en:'2026-09-18' },
        error: null
      }))
      .mockReturnValueOnce(chain({ data: [], error: null }));

    await actualizarCliente('uuid-1', { telefono: '123' });
    expect(mock.rpc).toHaveBeenCalledWith('actualizar_cliente_completo', {
      p_cliente_id:  'uuid-1',
      p_datos:       { telefono: '123' },
      p_direcciones: null
    });
  });

  it('cliente inexistente → CLIENTE_NO_EXISTE', async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'CLIENTE_NO_EXISTE: uuid-x' }
    });
    await expect(actualizarCliente('uuid-x', {}))
      .rejects.toMatchObject({ code: 'CLIENTE_NO_EXISTE' });
  });
});

/* =========================================================
   eliminarCliente
   ========================================================= */
describe('eliminarCliente', () => {
  it('con pedidos → soft delete', async () => {
    // count de pedidos = 3
    mock.from
      .mockReturnValueOnce(chain({ count: 3, error: null }))     // select pedidos
      .mockReturnValueOnce(chain({ data: null, error: null }));  // update activo=false

    const r = await eliminarCliente('uuid-1');
    expect(r).toEqual({ modo: 'soft', pedidos_asociados: 3 });
  });

  it('sin pedidos → hard delete', async () => {
    mock.from
      .mockReturnValueOnce(chain({ count: 0, error: null }))     // select pedidos
      .mockReturnValueOnce(chain({ data: null, error: null }));  // delete

    const r = await eliminarCliente('uuid-1');
    expect(r).toEqual({ modo: 'hard', pedidos_asociados: 0 });
  });

  it('FK bloquea hard delete → FK_INVALIDA propagado', async () => {
    mock.from
      .mockReturnValueOnce(chain({ count: 0, error: null }))
      .mockReturnValueOnce(chain({
        data: null,
        error: { message: 'update or delete on table "clientes" violates foreign key constraint' }
      }));

    await expect(eliminarCliente('uuid-1'))
      .rejects.toMatchObject({ code: 'FK_INVALIDA' });
  });
});