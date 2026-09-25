import { useEffect, useState } from 'react';
import {
  listarPedidos, despacharPedido, cancelarPedido, obtenerPedido
} from '../modules/pedidos/pedidos.repo.js';
import { useAuth } from '../context/AuthContext.jsx';
import CrearPedidoModal from '../components/CrearPedidoModal.jsx';
import EditarPedidoModal from '../components/EditarPedidoModal.jsx';
import { Plus, CheckCircle, Clock, XCircle, AlertCircle, Edit2 } from 'lucide-react';

function formatearPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(n ?? 0);
}

export default function PedidosView() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalCrear, setModalCrear] = useState(false);

  const [modalEditar, setModalEditar] = useState(false);
  const [pedidoEditar, setPedidoEditar] = useState(null);
  const [cargandoEditar, setCargandoEditar] = useState(false);

  useEffect(() => {
    cargarLista();
  }, []);

  const cargarLista = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarPedidos();
      setPedidos(data);
    } catch (err) {
      setError(err.detalle || 'Error al cargar los pedidos');
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = async (id) => {
    setCargandoEditar(true);
    try {
      const completo = await obtenerPedido(id);
      if (!completo) {
        alert('No se encontró el pedido.');
        return;
      }
      setPedidoEditar(completo);
      setModalEditar(true);
    } catch (err) {
      alert(`Error al cargar el pedido: ${err.detalle || err.code}`);
    } finally {
      setCargandoEditar(false);
    }
  };

  const handleDespachar = async (id) => {
    if (!confirm('¿Deseas despachar este pedido y descontar el stock?')) return;
    try {
      await despacharPedido(id, usuario?.id);
      await cargarLista();
    } catch (err) {
      if (err.code === 'STOCK_INSUFICIENTE' && Array.isArray(err.faltantes)) {
        const detalle = err.faltantes
          .map(f => `${f.cod}: requiere ${f.requerido}, disponible ${f.disponible}`)
          .join('\n');
        alert(`Stock insuficiente:\n${detalle}`);
      } else {
        alert(`Error al despachar: ${err.code || err.detalle}`);
      }
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Seguro que deseas cancelar este pedido? La reserva de stock será liberada.')) return;
    try {
      await cancelarPedido(id);
      await cargarLista();
    } catch (err) {
      alert(`Error al cancelar: ${err.code || err.detalle}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">Gestión de Pedidos</h1>
          <p className="text-xs text-slate-400 mt-0.5">Control de órdenes y salidas de almacén</p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-2 rounded transition"
        >
          <Plus size={16} /> Crear Pedido
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {cargando ? (
        <div className="text-slate-500 text-xs py-8 text-center">Cargando pedidos…</div>
      ) : pedidos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          No hay pedidos registrados en el sistema.
        </div>
      ) : (
        <div className="grid gap-3">
          {pedidos.map(p => {
            const editable = p.estado === 'PENDIENTE' || p.estado === 'BORRADOR';
            const accionable = editable;

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-200 truncate">
                      {p.cliente?.razon_social || 'Cliente sin especificar'}
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium flex items-center gap-1 ${
                      p.estado === 'DESPACHADO' || p.estado === 'ENTREGADO'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : p.estado === 'CANCELADO'
                        ? 'bg-red-950/60 text-red-400 border border-red-800'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                    }`}>
                      {p.estado === 'DESPACHADO' || p.estado === 'ENTREGADO'
                        ? <CheckCircle size={12}/>
                        : p.estado === 'CANCELADO'
                        ? <XCircle size={12}/>
                        : <Clock size={12}/>}
                      {p.estado}
                    </span>

                    <span className="text-[10px] text-slate-500 uppercase bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                      {p.prioridad}
                    </span>

                    {Number(p.flete ?? 0) > 0 && (
                      <span className="text-[10px] text-sky-400 uppercase bg-sky-950/60 border border-sky-800 px-1.5 py-0.5 rounded">
                        + Flete
                      </span>
                    )}

                    {Number(p.descuento_devolucion ?? 0) > 0 && (
                      <span className="text-[10px] text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                        Dev. envases
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    Creado: {new Date(p.creado_en).toLocaleDateString('es-AR')}
                    {p.obs ? ` • ${p.obs}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-100 tabular-nums">
                      {formatearPrecio(p.monto)}
                    </div>
                  </div>

                  {accionable && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditar(p.id)}
                        disabled={cargandoEditar}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded transition flex items-center gap-1 disabled:opacity-50"
                        title="Editar pedido"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleDespachar(p.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition"
                        title="Despachar y descontar stock"
                      >
                        Despachar
                      </button>
                      <button
                        onClick={() => handleCancelar(p.id)}
                        className="text-xs bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 px-2 py-1 rounded transition"
                        title="Cancelar pedido"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CrearPedidoModal
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onPedidoCreado={cargarLista}
      />

      <EditarPedidoModal
        isOpen={modalEditar}
        pedido={pedidoEditar}
        onClose={() => {
          setModalEditar(false);
          setPedidoEditar(null);
        }}
        onPedidoActualizado={cargarLista}
      />
    </div>
  );
}