import { useEffect, useState, useMemo } from 'react';
import {
  listarInsumos, eliminarInsumo
} from '../modules/stock/stock.repo.js';
import InsumoModal from '../components/InsumoModal.jsx';
import MovimientoModal from '../components/MovimientoModal.jsx';
import ProduccionModal from '../components/ProduccionModal.jsx';
import {
  Plus, Edit2, Trash2, AlertCircle, Search,
  ArrowDownUp, Package, Beaker, FlaskConical, Droplets, Package2, Lock
} from 'lucide-react';

const BADGE = {
  CRITICO:  'bg-red-500/15 text-red-400 border border-red-500/40',
  BAJO:     'bg-amber-500/15 text-amber-400 border border-amber-500/40',
  ATENCION: 'bg-sky-500/15 text-sky-400 border border-sky-500/40',
  OK:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
};

const BORDE = {
  CRITICO:  'border-l-red-500',
  BAJO:     'border-l-amber-500',
  ATENCION: 'border-l-sky-500',
  OK:       'border-l-emerald-500'
};

function formatearPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(n ?? 0);
}

function formatearNumero(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
}

/* Emoji según tipo y prefijo del código */
function emojiParaInsumo(insumo) {
  if (!insumo) return '📦';
  if (insumo.tipo === 'LIQUIDO_CONC') return '🧪';
  if (insumo.tipo === 'LIQUIDO_DIL')  return '💧';
  if (insumo.tipo === 'KIT_ARMADO')   return '🧴';
  if (insumo.tipo === 'PACKAGING') {
    const cod = insumo.cod ?? '';
    if (cod.startsWith('ENV-'))   return '🍶';
    if (cod.startsWith('TAPA-'))  return '🔘';
    if (cod.startsWith('ETQ-'))   return '🏷️';
    if (cod.startsWith('CAJA-'))  return '📦';
    if (cod.startsWith('BOLSA-')) return '🛍️';
    return '📦';
  }
  return '📦';
}

export default function StockView() {
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');

  const [modalInsumo, setModalInsumo] = useState(false);
  const [insumoEditar, setInsumoEditar] = useState(null);

  const [modalMov, setModalMov] = useState(false);
  const [insumoMov, setInsumoMov] = useState(null);

  const [modalProd, setModalProd] = useState(false);
  const [insumoProd, setInsumoProd] = useState(null);

  useEffect(() => {
    cargarLista();
  }, []);

  const cargarLista = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarInsumos({ ordenarPor: 'cobertura_dias' });
      setInsumos(data);
    } catch (err) {
      setError(err.detalle || 'Error al cargar los insumos');
    } finally {
      setCargando(false);
    }
  };

  const handleNuevo = () => {
    setInsumoEditar(null);
    setModalInsumo(true);
  };

  const handleEditar = (insumo) => {
    setInsumoEditar(insumo);
    setModalInsumo(true);
  };

  const handleMovimiento = (insumo) => {
    setInsumoMov(insumo);
    setModalMov(true);
  };

  const handleProducir = (insumo) => {
    setInsumoProd(insumo);
    setModalProd(true);
  };

  const handleEliminar = async (insumo) => {
    if (!confirm(`¿Eliminar "${insumo.nom}"? Sólo se puede borrar si no tiene movimientos.`)) return;
    try {
      await eliminarInsumo(insumo.cod);
      await cargarLista();
    } catch (err) {
      const code = err.code || '';
      if (code === 'TIENE_MOVIMIENTOS') {
        alert(`No se puede eliminar: tiene ${err.cantidad} movimiento(s) registrado(s).`);
      } else {
        alert(`Error al eliminar: ${err.detalle || code}`);
      }
    }
  };

  const contadoresTipo = useMemo(() => {
    const c = { LIQUIDO_CONC: 0, LIQUIDO_DIL: 0, PACKAGING: 0, KIT_ARMADO: 0, OTRO: 0 };
    for (const i of insumos) {
      if (c[i.tipo] !== undefined) c[i.tipo]++;
      else c.OTRO++;
    }
    return c;
  }, [insumos]);

  const contadoresEstado = useMemo(() => {
    const base = insumos.filter(i => {
      if (filtroTipo === 'TODOS') return true;
      return i.tipo === filtroTipo;
    });
    const c = { CRITICO: 0, BAJO: 0, ATENCION: 0, OK: 0 };
    for (const i of base) c[i.estado_stock] = (c[i.estado_stock] ?? 0) + 1;
    return c;
  }, [insumos, filtroTipo]);

  const filtrados = useMemo(() => {
    return insumos.filter(i => {
      if (filtroTipo !== 'TODOS' && i.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'TODOS' && i.estado_stock !== filtroEstado) return false;
      if (!busqueda.trim()) return true;
      const s = busqueda.toLowerCase();
      return (
        i.cod.toLowerCase().includes(s) ||
        i.nom.toLowerCase().includes(s)
      );
    });
  }, [insumos, busqueda, filtroEstado, filtroTipo]);

  const totalBase = filtroTipo === 'TODOS'
    ? insumos.length
    : contadoresTipo[filtroTipo] ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">
            Stock de Insumos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inventario actual y control de movimientos
          </p>
        </div>
        <button
          onClick={handleNuevo}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-2 rounded transition"
        >
          <Plus size={16} /> Nuevo Insumo
        </button>
      </div>

      {/* Filtros por tipo */}
      {insumos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroTipo('TODOS')}
            className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
              filtroTipo === 'TODOS'
                ? 'bg-slate-800 text-white border-sky-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Package size={12} /> Todos ({insumos.length})
          </button>
          <button
            onClick={() => setFiltroTipo('LIQUIDO_CONC')}
            className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
              filtroTipo === 'LIQUIDO_CONC'
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-600'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <FlaskConical size={12} /> Concentrados ({contadoresTipo.LIQUIDO_CONC})
          </button>
          <button
            onClick={() => setFiltroTipo('LIQUIDO_DIL')}
            className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
              filtroTipo === 'LIQUIDO_DIL'
                ? 'bg-sky-900/40 text-sky-300 border-sky-600'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Droplets size={12} /> Diluidos ({contadoresTipo.LIQUIDO_DIL})
          </button>
          <button
            onClick={() => setFiltroTipo('PACKAGING')}
            className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
              filtroTipo === 'PACKAGING'
                ? 'bg-amber-900/40 text-amber-300 border-amber-600'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Package2 size={12} /> Packaging ({contadoresTipo.PACKAGING})
          </button>
        </div>
      )}

      {/* Filtros por estado */}
      {insumos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filtroEstado === 'TODOS'
                ? 'bg-slate-800 text-white border-sky-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Todos ({totalBase})
          </button>
          {Object.entries(contadoresEstado).map(([estado, n]) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              disabled={n === 0}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filtroEstado === estado
                  ? `bg-slate-800 text-white border-sky-500`
                  : n === 0
                  ? `bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed`
                  : `bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800`
              }`}
            >
              {estado} ({n})
            </button>
          ))}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por código o nombre…"
          className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
        />
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {cargando ? (
        <div className="text-slate-500 text-xs py-8 text-center">Cargando insumos…</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          {insumos.length === 0
            ? 'No hay insumos cargados. Creá el primero con el botón "Nuevo Insumo".'
            : 'Sin resultados para tu búsqueda.'}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map(i => {
            const cobertura = i.cobertura_dias;
            const critico = i.estado_stock === 'CRITICO' || i.estado_stock === 'BAJO';
            const esConcentrado = i.tipo === 'LIQUIDO_CONC';
            const tieneReserva = Number(i.stock_reservado ?? 0) > 0;

            return (
              <div
                key={i.cod}
                className={`bg-slate-900 border border-slate-800 border-l-4 ${BORDE[i.estado_stock] ?? 'border-l-slate-700'} rounded-lg p-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm leading-none shrink-0">{emojiParaInsumo(i)}</span>
                      <span className="font-bold text-sm text-slate-200 truncate">
                        {i.nom}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        BADGE[i.estado_stock] ?? BADGE.OK
                      }`}>
                        {i.estado_stock}
                      </span>
                      {tieneReserva && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-purple-500/15 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <Lock size={9} /> {formatearNumero(i.stock_reservado)} reservado
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {i.cod}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Físico</div>
                        <div className={`tabular-nums font-bold ${critico ? 'text-red-400' : 'text-slate-200'}`}>
                          {formatearNumero(i.stock)} <span className="text-slate-500 font-normal">{i.unidad}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Disponible</div>
                        <div className={`tabular-nums font-bold ${
                          i.stock_disponible <= 0 ? 'text-red-400' :
                          i.stock_disponible < i.minimo ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>
                          {formatearNumero(i.stock_disponible)} <span className="text-slate-500 font-normal">{i.unidad}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Mínimo</div>
                        <div className="tabular-nums text-slate-300">{formatearNumero(i.minimo)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cobertura</div>
                        <div className="tabular-nums text-slate-300">
                          {cobertura == null ? '∞' : `${formatearNumero(cobertura)} d`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Precio</div>
                        <div className="tabular-nums text-slate-300">
                          {formatearPrecio(i.precio_unit)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {esConcentrado && (
                        <button
                          onClick={() => handleProducir(i)}
                          className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-800/50 px-2 py-1 rounded transition flex items-center gap-1 whitespace-nowrap"
                          title="Producir diluido a partir de este concentrado"
                        >
                          <Beaker size={12} /> Producir
                        </button>
                      )}
                      <button
                        onClick={() => handleMovimiento(i)}
                        className="text-xs bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-800/50 px-2 py-1 rounded transition flex items-center gap-1 whitespace-nowrap"
                        title="Registrar movimiento de stock"
                      >
                        <ArrowDownUp size={12} /> Movimiento
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditar(i)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded transition flex items-center gap-1"
                        title="Editar ficha del insumo"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(i)}
                        className="text-xs bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 px-2 py-1 rounded transition"
                        title="Eliminar insumo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InsumoModal
        isOpen={modalInsumo}
        insumo={insumoEditar}
        onClose={() => setModalInsumo(false)}
        onGuardado={cargarLista}
      />

      <MovimientoModal
        isOpen={modalMov}
        insumo={insumoMov}
        onClose={() => setModalMov(false)}
        onGuardado={cargarLista}
      />

      <ProduccionModal
        isOpen={modalProd}
        insumo={insumoProd}
        onClose={() => setModalProd(false)}
        onGuardado={cargarLista}
      />
    </div>
  );
}