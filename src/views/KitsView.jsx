import { useEffect, useState, useMemo } from 'react';
import { listarKits, eliminarKit } from '../modules/kits/kits.repo.js';
import KitModal from '../components/KitModal.jsx';
import { Plus, Edit2, Trash2, AlertCircle, Search, Package, Boxes } from 'lucide-react';

function formatearPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(n ?? 0);
}

function emojiParaCategoria(categoria) {
  const cat = (categoria ?? '').toLowerCase().trim();
  const mapa = {
    hogar:       '🏠',
    casa:        '🏠',
    cocina:      '🍴',
    bano:        '🛁',
    baño:        '🛁',
    pisos:       '🧹',
    piso:        '🧹',
    exteriores:  '🌳',
    exterior:    '🌳',
    pileta:      '🏊',
    piscina:     '🏊',
    patio:       '⛱️',
    jardin:      '🌿',
    jardín:      '🌿',
    lavadero:    '🧺',
    auto:        '🚗',
    vehiculo:    '🚗',
    vehículo:    '🚗'
  };
  return mapa[cat] ?? '📦';
}

export default function KitsView() {
  const [kits, setKits] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [kitEditar, setKitEditar] = useState(null);

  useEffect(() => {
    cargarLista();
  }, []);

  const cargarLista = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarKits({ soloActivos: false });
      setKits(data);
    } catch (err) {
      setError(err.detalle || 'Error al cargar los kits');
    } finally {
      setCargando(false);
    }
  };

  const handleNuevo = () => {
    setKitEditar(null);
    setModalAbierto(true);
  };

  const handleEditar = (kit) => {
    setKitEditar(kit);
    setModalAbierto(true);
  };

  const handleEliminar = async (kit) => {
    if (!confirm(`¿Eliminar el kit "${kit.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarKit(kit.id);
      await cargarLista();
    } catch (err) {
      alert(`Error al eliminar: ${err.code || err.detalle}`);
    }
  };

  /* =========================================================
     Categorías dinámicas (según kits existentes)
     ========================================================= */
  const categorias = useMemo(() => {
    const set = new Set();
    for (const k of kits) {
      if (k.categoria) set.add(k.categoria);
    }
    return Array.from(set).sort();
  }, [kits]);

  const contadoresCat = useMemo(() => {
    const c = { TOTAL: kits.length };
    for (const cat of categorias) {
      c[cat] = kits.filter(k => k.categoria === cat).length;
    }
    return c;
  }, [kits, categorias]);

  /* =========================================================
     Filtrado final
     ========================================================= */
  const filtrados = useMemo(() => {
    let resultado = kits;

    if (filtroCategoria !== 'TODAS') {
      resultado = resultado.filter(k => k.categoria === filtroCategoria);
    }

    if (busqueda.trim()) {
      const s = busqueda.toLowerCase();
      resultado = resultado.filter(k =>
        k.nombre?.toLowerCase().includes(s) ||
        k.categoria?.toLowerCase().includes(s) ||
        k.id?.toLowerCase().includes(s)
      );
    }

    return resultado;
  }, [kits, filtroCategoria, busqueda]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">Gestión de Kits</h1>
          <p className="text-xs text-slate-400 mt-0.5">Combos de insumos para venta</p>
        </div>
        <button
          onClick={handleNuevo}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-2 rounded transition"
        >
          <Plus size={16} /> Nuevo Kit
        </button>
      </div>

      {/* Filtros por categoría */}
      {kits.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroCategoria('TODAS')}
            className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
              filtroCategoria === 'TODAS'
                ? 'bg-slate-800 text-white border-sky-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Package size={12} /> Todas ({contadoresCat.TOTAL})
          </button>
          {categorias.map(cat => {
            const n = contadoresCat[cat] ?? 0;
            const activo = filtroCategoria === cat;
            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
                  activo
                    ? 'bg-sky-900/40 text-sky-300 border-sky-600'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>{emojiParaCategoria(cat)}</span> {cat} ({n})
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, categoría o id…"
          className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
        />
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {cargando ? (
        <div className="text-slate-500 text-xs py-8 text-center">Cargando kits…</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          {busqueda || filtroCategoria !== 'TODAS'
            ? 'Sin resultados para los filtros seleccionados.'
            : 'No hay kits registrados. Creá el primero con el botón "Nuevo Kit".'}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map(k => {
            const armables = k.max_armables ?? 0;
            const puedeArmar = armables > 0;

            return (
              <div
                key={k.id}
                className={`bg-slate-900 border border-slate-800 rounded-lg p-4 ${
                  !k.activo ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm leading-none shrink-0">
                        {emojiParaCategoria(k.categoria)}
                      </span>
                      <span className="font-bold text-sm text-slate-200">{k.nombre}</span>
                      <span className="text-[10px] text-slate-500 uppercase bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                        {k.categoria}
                      </span>
                      {!k.activo && (
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase font-medium bg-slate-950 text-slate-500 border border-slate-800">
                          Inactivo
                        </span>
                      )}
                    </div>

                    {k.descripcion && (
                      <p className="text-xs text-slate-500 italic">{k.descripcion}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Package size={12} /> {k.total_componentes} componente{k.total_componentes !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Boxes size={12} />
                        <span className={puedeArmar ? 'text-emerald-400' : 'text-red-400'}>
                          {armables} armable{armables !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>

                    {k.componentes.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/50">
                        <ul className="text-[11px] text-slate-500 space-y-0.5">
                          {k.componentes.map(c => (
                            <li key={c.cod} className="flex items-center justify-between">
                              <span>· {c.nom || c.cod}</span>
                              <span className="font-mono">
                                {c.cantidad} {c.unidad}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Precio</div>
                      <div className="text-sm font-bold text-slate-100 tabular-nums">
                        {formatearPrecio(k.precio_calculado)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditar(k)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded transition flex items-center gap-1"
                        title="Editar kit"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(k)}
                        className="text-xs bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 px-2 py-1 rounded transition"
                        title="Eliminar kit"
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

      <KitModal
        isOpen={modalAbierto}
        kit={kitEditar}
        onClose={() => setModalAbierto(false)}
        onGuardado={cargarLista}
      />
    </div>
  );
}