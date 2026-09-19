import { useEffect, useState } from 'react';
import { crearPedido } from '../modules/pedidos/pedidos.repo.js';
import { listarClientes } from '../modules/clientes/clientes.repo.js';
import { listarInsumos } from '../modules/stock/stock.repo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function CrearPedidoModal({ isOpen, onClose, onPedidoCreado }) {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [insumos, setInsumos] = useState([]);
  
  const [clienteId, setClienteId] = useState('');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [obs, setObs] = useState('');
  const [items, setItems] = useState([]);

  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
    }
  }, [isOpen]);

  const cargarCatalogos = async () => {
    setCargandoDatos(true);
    setError(null);
    try {
      const [listClientes, listInsumos] = await Promise.all([
        listarClientes({ soloActivos: true }),
        listarInsumos()
      ]);
      setClientes(listClientes);
      setInsumos(listInsumos);
      if (listClientes.length > 0) setClienteId(listClientes[0].id);
    } catch (err) {
      setError('Error al cargar la lista de clientes o insumos.');
    } finally {
      setCargandoDatos(false);
    }
  };

  const agregarItem = () => {
    if (insumos.length === 0) return;
    const primerInsumo = insumos[0];
    setItems(prev => [
      ...prev,
      {
        tipo: 'INSUMO',
        item_cod: primerInsumo.cod,
        cantidad: 1,
        precio_unit: primerInsumo.precio_unit ?? 0
      }
    ]);
  };

  const eliminarItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarItem = (index, campo, valor) => {
    setItems(prev => {
      const copia = [...prev];
      if (campo === 'item_cod') {
        const insumoSel = insumos.find(i => i.cod === valor);
        copia[index] = {
          ...copia[index],
          item_cod: valor,
          precio_unit: insumoSel?.precio_unit ?? 0
        };
      } else {
        copia[index] = { ...copia[index], [campo]: valor };
      }
      return copia;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Debes agregar al menos un ítem al pedido');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await crearPedido({
        cliente_id: clienteId,
        items,
        prioridad,
        obs,
        usuario_id: usuario?.id
      });
      onPedidoCreado();
      onClose();
    } catch (err) {
      setError(err.detalle || err.message || 'Error al guardar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider">Nuevo Pedido</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {cargandoDatos ? (
          <div className="text-slate-500 text-xs py-4 text-center">Cargando datos…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Cliente</label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.razon_social}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Prioridad</label>
                <select
                  value={prioridad}
                  onChange={e => setPrioridad(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Observaciones</label>
                <input
                  type="text"
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Ej. Entregar en la mañana"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Ítems del Pedido */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ítems del Pedido</span>
                <button
                  type="button"
                  onClick={agregarItem}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded flex items-center gap-1 transition"
                >
                  <Plus size={14} /> Agregar Producto
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-xs text-slate-600 italic text-center py-3 border border-dashed border-slate-800 rounded">
                  No hay productos agregados
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 border border-slate-800 rounded">
                      <select
                        value={item.item_cod}
                        onChange={e => actualizarItem(idx, 'item_cod', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                      >
                        {insumos.map(ins => (
                          <option key={ins.cod} value={ins.cod}>{ins.nom} ({ins.cod})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={e => actualizarItem(idx, 'cantidad', parseFloat(e.target.value) || 1)}
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center"
                        placeholder="Cant."
                      />

                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded text-xs text-slate-400 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded text-xs transition disabled:opacity-50"
              >
                {enviando ? 'Guardando…' : 'Guardar Pedido'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}