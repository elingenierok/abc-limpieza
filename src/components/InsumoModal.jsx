import { useEffect, useState } from 'react';
import { crearInsumo, actualizarFicha, obtenerInsumo } from '../modules/stock/stock.repo.js';
import { X, AlertCircle } from 'lucide-react';

const UNIDADES = [
  { valor: 'L',   etiqueta: 'L — Litros' },
  { valor: 'U',   etiqueta: 'U — Unidades' },
  { valor: 'PAR', etiqueta: 'PAR — Pares' },
  { valor: 'KG',  etiqueta: 'KG — Kilogramos' }
];

export default function InsumoModal({ isOpen, insumo, onClose, onGuardado }) {
  const modoEdicion = Boolean(insumo?.cod);

  const [cod, setCod]                     = useState('');
  const [nom, setNom]                     = useState('');
  const [unidad, setUnidad]               = useState('L');
  const [minimo, setMinimo]               = useState(0);
  const [consumoDiario, setConsumoDiario] = useState(0);
  const [precioUnit, setPrecioUnit]       = useState(0);
  const [stockInicial, setStockInicial]   = useState(0);

  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (modoEdicion) {
      cargarInsumo();
    } else {
      resetearFormulario();
    }
  }, [isOpen, insumo]);

  const resetearFormulario = () => {
    setCod('');
    setNom('');
    setUnidad('L');
    setMinimo(0);
    setConsumoDiario(0);
    setPrecioUnit(0);
    setStockInicial(0);
  };

  const cargarInsumo = async () => {
    setCargando(true);
    try {
      const completo = await obtenerInsumo(insumo.cod);
      if (!completo) {
        setError('No se encontró el insumo.');
        return;
      }
      setCod(completo.cod);
      setNom(completo.nom ?? '');
      setUnidad(completo.unidad ?? 'L');
      setMinimo(Number(completo.minimo) || 0);
      setConsumoDiario(Number(completo.consumo_diario) || 0);
      setPrecioUnit(Number(completo.precio_unit) || 0);
    } catch (err) {
      setError(err.detalle || 'Error al cargar el insumo');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!cod.trim()) {
      setError('El código es obligatorio.');
      return;
    }
    if (!nom.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (Number(minimo) < 0) {
      setError('El mínimo no puede ser negativo.');
      return;
    }
    if (Number(consumoDiario) < 0) {
      setError('El consumo diario no puede ser negativo.');
      return;
    }
    if (Number(precioUnit) < 0) {
      setError('El precio no puede ser negativo.');
      return;
    }
    if (!modoEdicion && Number(stockInicial) < 0) {
      setError('El stock inicial no puede ser negativo.');
      return;
    }

    setEnviando(true);
    try {
      if (modoEdicion) {
        // actualizarFicha NUNCA toca stock (R2)
        await actualizarFicha(cod, {
          nom: nom.trim(),
          unidad,
          minimo: Number(minimo) || 0,
          consumo_diario: Number(consumoDiario) || 0,
          precio_unit: Number(precioUnit) || 0
        });
      } else {
        await crearInsumo({
          cod: cod.trim().toUpperCase(),
          nom: nom.trim(),
          unidad,
          minimo: Number(minimo) || 0,
          consumo_diario: Number(consumoDiario) || 0,
          precio_unit: Number(precioUnit) || 0,
          stock_inicial: Number(stockInicial) || 0
        });
      }
      onGuardado();
      onClose();
    } catch (err) {
      const code = err.code || '';
      if (code === 'PK_DUPLICADA') {
        setError('Ya existe un insumo con ese código.');
      } else if (code === 'CHECK_VIOLADO') {
        setError('La unidad seleccionada no es válida.');
      } else {
        setError(err.detalle || err.message || 'Error al guardar el insumo');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider">
            {modoEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {cargando ? (
          <div className="text-slate-500 text-xs py-4 text-center">Cargando datos…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Código {modoEdicion ? '(no editable)' : '*'}
                </label>
                <input
                  type="text"
                  value={cod}
                  onChange={e => setCod(e.target.value)}
                  disabled={modoEdicion}
                  placeholder="LIM-001"
                  className={`w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-sky-500 ${
                    modoEdicion ? 'text-slate-500 cursor-not-allowed' : 'text-slate-100'
                  }`}
                  required
                />
                {modoEdicion && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    El código no se puede cambiar. Es la clave del insumo.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Unidad *
                </label>
                <select
                  value={unidad}
                  onChange={e => setUnidad(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {UNIDADES.map(u => (
                    <option key={u.valor} value={u.valor}>{u.etiqueta}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Ej. Lavandina Concentrada 5L"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Stock mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minimo}
                  onChange={e => setMinimo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Consumo diario
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={consumoDiario}
                  onChange={e => setConsumoDiario(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Promedio diario que se consume. Con 0, no se calcula cobertura.
                </p>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Precio unitario
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioUnit}
                  onChange={e => setPrecioUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {!modoEdicion && (
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Stock inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockInicial}
                    onChange={e => setStockInicial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">
                    Si es mayor a 0, se registra un movimiento de ajuste automáticamente.
                  </p>
                </div>
              )}
            </div>

            {modoEdicion && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded p-3 text-[11px] text-amber-300">
                El stock no se modifica desde acá. Para cambiar el stock, usá el botón "Movimiento" en la lista de insumos.
              </div>
            )}

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
                {enviando ? 'Guardando…' : (modoEdicion ? 'Guardar Cambios' : 'Crear Insumo')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}