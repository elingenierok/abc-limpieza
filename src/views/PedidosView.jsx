import { useEffect, useState } from 'react';
import { listarPedidos, despacharPedido, cancelarPedido } from '../modules/pedidos/pedidos.repo.js';
import { useAuth } from '../context/AuthContext.jsx';
import CrearPedidoModal from '../components/CrearPedidoModal.jsx'; // 1. Importar Modal
import { Plus, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

export default function PedidosView() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false); // 2. Estado modal

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

  const handleDespachar = async (id) => {
    if (!confirm('¿Deseas despachar este pedido y descontar el stock?')) return;
    try {
      await despacharPedido(id, usuario?.id);
      await cargarLista();
    } catch (err) {
      alert(`Error al despachar: ${err.code || err.detalle}`);
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Seguro que deseas cancelar este pedido?')) return;
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
        {/* 3. Abrir modal con click */}
        <button 
          onClick={() => setModalAbierto(true)}
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
          {pedidos.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">
                    {p.cliente?.razon_social || 'Cliente sin especificar'}
                  </span>
                  
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium flex items-center gap-1 ${
                    p.estado === 'DESPACHADO' || p.estado === 'ENTREGADO' 
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' 
                      : p.estado === 'CANCELADO'
                      ? 'bg-red-950/60 text-red-400 border border-red-800'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                  }`}>
                    {p.estado === 'DESPACHADO' ? <CheckCircle size={12}/> : p.estado === 'CANCELADO' ? <XCircle size={12}/> : <Clock size={12}/>}
                    {p.estado}
                  </span>

                  <span className="text-[10px] text-slate-500 uppercase bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                    {p.prioridad}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Creado: {new Date(p.creado_en).toLocaleDateString('es-AR')} {p.obs ? `• ${p.obs}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-100">${p.monto || 0}</div>
                </div>

                {p.estado === 'BORRADOR' || p.estado === 'PENDIENTE' ? (
                  <div className="flex gap-1">
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
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Incluir el modal */}
      <CrearPedidoModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onPedidoCreado={cargarLista}
      />
    </div>
  );
}