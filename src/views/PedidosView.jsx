import { useEffect, useState, useMemo } from 'react';
import {
  listarPedidos, avanzarEstadoPedido, obtenerPedido
} from '../modules/pedidos/pedidos.repo.js';
import { useAuth } from '../context/AuthContext.jsx';
import CrearPedidoModal from '../components/CrearPedidoModal.jsx';
import EditarPedidoModal from '../components/EditarPedidoModal.jsx';
import PedidoDetalleModal from '../components/PedidoDetalleModal.jsx';
import {
  Plus, CheckCircle, Clock, XCircle, AlertCircle, Edit2, Eye,
  Package, Truck, BadgeCheck
} from 'lucide-react';

function formatearPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(n ?? 0);
}

const ESTADOS = ['PENDIENTE', 'PREPARADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];

const BADGE_ESTADO = {
  PENDIENTE:  'bg-amber-950/60 text-amber-400 border border-amber-800',
  PREPARADO:  'bg-purple-950/60 text-purple-400 border border-purple-800',
  EN_CAMINO:  'bg-sky-950/60 text-sky-400 border border-sky-800',
  ENTREGADO:  'bg-emerald-950/60 text-emerald-400 border border-emerald-800',
  CANCELADO:  'bg-red-950/60 text-red-400 border border-red-800'
};

function IconEstado({ estado }) {
  if (estado === 'ENTREGADO') return <CheckCircle size={12} />;
  if (estado === 'CANCELADO') return <XCircle size={12} />;
  if (estado === 'EN_CAMINO') return <Truck size={12} />;
  if (estado === 'PREPARADO') return <Package size={12} />;
  return <Clock size={12} />;
}

export default function PedidosView() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState([]);

  const [modalCrear, setModalCrear] = useState(false);

  const [modalEditar, setModalEditar] = useState(false);
  const [pedidoEditar, setPedidoEditar] = useState(null);
  const [cargandoEditar, setCargandoEditar] = useState(false);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const [procesando, setProcesando] = useState(false);

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

  /* =========================================================
     Filtros
     ========================================================= */
  const toggleFiltro = (estado) => {
    setFiltros(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  const contadores = useMemo(() => {
    const c = { TOTAL: pedidos.length };
    for (const e of ESTADOS) c[e] = 0;
    for (const p of pedidos) {
      if (c[p.estado] !== undefined) c[p.estado]++;
    }
    return c;
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    if (filtros.length === 0) return pedidos;
    return pedidos.filter(p => filtros.includes(p.estado));
  }, [pedidos, filtros]);

  /* =========================================================
     Acciones
     ========================================================= */
  const handleVerDetalle = async (id) => {
    try {
      const completo = await obtenerPedido(id);
      if (!completo) {
        alert('No se encontró el pedido.');
        return;
      }
      setPedidoDetalle(completo);
      setModalDetalle(true);
    } catch (err) {
      alert(`Error al cargar el pedido: ${err.detalle || err.code}`);
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

  const handleAvanzar = async (id, nuevoEstado) => {
    const mensajes = {
      PREPARADO: '¿Marcar este pedido como preparado?',
      EN_CAMINO: '¿Cargar este pedido al móvil?',
      ENTREGADO: '¿Confirmar la entrega? Se va a descontar el stock físico.',
      CANCELADO: '¿Cancelar el pedido? Se va a liberar la reserva de stock.'
    };

    if (!confirm(mensajes[nuevoEstado])) return;

    setProcesando(true);
    try {
      await avanzarEstadoPedido(id, nuevoEstado, usuario?.id);
      await cargarLista();
    } catch (err) {
      if (err.code === 'STOCK_INSUFICIENTE' && Array.isArray(err.faltantes)) {
        const detalle = err.faltantes
          .map(f => `${f.cod}: requiere ${f.requerido}, disponible ${f.disponible}`)
          .join('\n');
        alert(`Stock insuficiente:\n${detalle}`);
      } else {
        alert(`Error al cambiar estado: ${err.code || err.detalle}`);
      }
    } finally {
      setProcesando(false);
    }
  };

  /* =========================================================
     Botones por estado
     ========================================================= */
  const botonesDeEstado = (p) => {
    const botones = [];

    if (p.estado === 'PENDIENTE') {
      botones.push({
        label: 'Marcar preparado',
        icon: Package,
        color: 'bg-purple-600 hover:bg-purple-500 text-white',
        onClick: () => handleAvanzar(p.id, 'PREPARADO')
      });
      botones.push({
        label: 'Editar',
        icon: Edit2,
        color: 'bg-slate-800 hover:bg-slate-700 text-sky-400',
        onClick: () => handleEditar(p.id),
        disabled: cargandoEditar
      });
      botones.push({
        label: 'Cancelar',
        icon: null,
        color: 'bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300',
        onClick: () => handleAvanzar(p.id, 'CANCELADO')
      });
    } else if (p.estado === 'PREPARADO') {
      botones.push({
        label: 'Cargar al móvil',
        icon: Truck,
        color: 'bg-sky-600 hover:bg-sky-500 text-white',
        onClick: () => handleAvanzar(p.id, 'EN_CAMINO')
      });
      botones.push({
        label: 'Editar',
        icon: Edit2,
        color: 'bg-slate-800 hover:bg-slate-700 text-sky-400',
        onClick: () => handleEditar(p.id),
        disabled: cargandoEditar
      });
      botones.push({
        label: 'Cancelar',
        icon: null,
        color: 'bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300',
        onClick: () => handleAvanzar(p.id, 'CANCELADO')
      });
    } else if (p.estado === 'EN_CAMINO') {
      botones.push({
        label: 'Entregar',
        icon: BadgeCheck,
        color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        onClick: () => handleAvanzar(p.id, 'ENTREGADO')
      });
      botones.push({
        label: 'Cancelar',
        icon: null,
        color: 'bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300',
        onClick: () => handleAvanzar(p.id, 'CANCELADO')
      });
    }

    return botones;
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

      {/* Filtros */}
      {pedidos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltros([])}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filtros.length === 0
                ? 'bg-slate-800 text-white border-sky-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Todos ({contadores.TOTAL})
          </button>
          {ESTADOS.map(e => {
            const n = contadores[e] ?? 0;
            const activo = filtros.includes(e);
            return (
              <button
                key={e}
                onClick={() => toggleFiltro(e)}
                disabled={n === 0}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  activo
                    ? 'bg-sky-900/40 text-sky-300 border-sky-600'
                    : n === 0
                    ? 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {e} ({n})
              </button>
            );
          })}
        </div>
      )}

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
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          Sin resultados para los filtros seleccionados.
        </div>
      ) : (
        <div className="grid gap-3">
          {pedidosFiltrados.map(p => {
            const botones = botonesDeEstado(p);

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-200 truncate">
                      {p.cliente?.razon_social || 'Cliente sin especificar'}
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium flex items-center gap-1 ${BADGE_ESTADO[p.estado] ?? BADGE_ESTADO.PENDIENTE}`}>
                      <IconEstado estado={p.estado} />
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

                  <div className="flex gap-1 flex-wrap justify-end">
                    <button
                      onClick={() => handleVerDetalle(p.id)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition flex items-center gap-1"
                      title="Ver resumen"
                    >
                      <Eye size={12} />
                    </button>

                    {botones.map((b, i) => {
                      const Icon = b.icon;
                      return (
                        <button
                          key={i}
                          onClick={b.onClick}
                          disabled={procesando || b.disabled}
                          className={`text-xs ${b.color} px-2 py-1 rounded transition flex items-center gap-1 disabled:opacity-50`}
                        >
                          {Icon && <Icon size={12} />} {b.label}
                        </button>
                      );
                    })}
                  </div>
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

      <PedidoDetalleModal
        isOpen={modalDetalle}
        pedido={pedidoDetalle}
        onClose={() => {
          setModalDetalle(false);
          setPedidoDetalle(null);
        }}
      />
    </div>
  );
}