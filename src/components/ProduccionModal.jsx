import { useEffect, useState } from 'react';
import { registrarProduccion } from '../modules/stock/stock.repo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { X, AlertCircle, Beaker, Droplet, ArrowRight } from 'lucide-react';

function nf(n, dec = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: dec,
    minimumFractionDigits: 0
  }).format(n);
}

export default function ProduccionModal({ isOpen, insumo, onClose, onGuardado }) {
  const { usuario } = useAuth();

  const [cantidad, setCantidad] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCantidad('');
    setError(null);
  }, [isOpen, insumo]);

  if (!isOpen || !insumo) return null;

  const esConcentrado = insumo.cod?.endsWith('-CONC');
  const factor = Number(insumo.factor_dilucion) || 0;

  if (!esConcentrado) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase text-white tracking-wider">
              Producir
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs rounded p-3">
            Sólo se puede producir desde un <b>concentrado</b>. Este insumo es un diluido o no tiene código <code>-CONC</code>.
          </div>
          <button
            onClick={onClose}
            className="w-full px-3 py-2 rounded text-xs text-slate-400 hover:bg-slate-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (!factor || factor <= 1) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase text-white tracking-wider">
              Producir
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3">
            Este concentrado no tiene <b>factor de dilución</b> cargado. Editalo primero desde Stock.
          </div>
          <button
            onClick={onClose}
            className="w-full px-3 py-2 rounded text-xs text-slate-400 hover:bg-slate-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const cantNum = Number(cantidad) || 0;
  const stockActual = Number(insumo.stock) || 0;
  const rendimiento = cantNum * factor;
  const agua = rendimiento - cantNum;
  const quedaSinStock = cantNum > stockActual;
  const stockRestante = stockActual - cantNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!(cantNum > 0)) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    if (quedaSinStock) {
      setError(`Stock insuficiente. Disponible: ${stockActual} ${insumo.unidad}. Solicitado: ${cantNum}.`);
      return;
    }

    setEnviando(true);
    try {
      await registrarProduccion({
        codConcentrado: insumo.cod,
        cantidadConcentrado: cantNum,
        usuario_id: usuario?.id ?? null
      });
      onGuardado();
      onClose();
    } catch (err) {
      const code = err.code || '';
      if (code === 'STOCK_NEGATIVO') {
        setError(`Stock insuficiente. Disponible: ${err.disponible ?? '?'}, solicitado: ${err.solicitado ?? '?'}.`);
      } else if (code === 'SIN_FACTOR') {
        setError('El insumo no tiene factor de dilución.');
      } else if (code === 'SIN_DILUIDO') {
        setError('No hay un insumo diluido asociado a este concentrado.');
      } else if (code === 'INPUT_INVALIDO') {
        setError('Datos inválidos. Revisá la cantidad.');
      } else {
        setError(err.detalle || err.message || 'Error al registrar la producción');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Beaker size={16} /> Producir diluido
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Cabecera del insumo */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-200 truncate">
                {insumo.nom}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">{insumo.cod}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stock actual</div>
              <div className="text-base font-bold text-slate-100 tabular-nums">
                {stockActual} <span className="text-xs text-slate-500">{insumo.unidad}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Cantidad de concentrado a diluir ({insumo.unidad}) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-lg font-bold text-slate-100 focus:outline-none focus:border-sky-500 tabular-nums text-center"
              required
            />
            <p className="text-[10px] text-slate-600 mt-1">
              Factor de este producto: <b className="text-sky-400">x{factor}</b> (1 L + {nf(factor - 1, 0)} L de agua)
            </p>
          </div>

          {/* Preview de la producción */}
          {cantNum > 0 && (
            <div className={`border rounded p-4 space-y-3 ${
              quedaSinStock
                ? 'bg-red-950/40 border-red-800'
                : 'bg-slate-950 border-sky-900/50'
            }`}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Resultado de la producción
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <Beaker size={14} /> Se descuenta de concentrado
                </span>
                <span className="font-bold text-red-400 tabular-nums">
                  {nf(cantNum)} {insumo.unidad}
                </span>
              </div>

              <div className="flex items-center justify-center text-slate-600">
                <ArrowRight size={16} />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <Droplet size={14} /> Se agrega a diluido
                </span>
                <span className="font-bold text-emerald-400 tabular-nums">
                  {nf(rendimiento)} {insumo.unidad}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                  Agua a agregar
                </span>
                <span className="font-bold text-sky-400 tabular-nums">
                  {nf(agua)} L
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                  Stock concentrado restante
                </span>
                <span className={`font-bold tabular-nums ${quedaSinStock ? 'text-red-400' : 'text-slate-200'}`}>
                  {nf(stockRestante)} {insumo.unidad}
                </span>
              </div>

              {quedaSinStock && (
                <div className="text-[10px] text-red-400 pt-1">
                  No hay suficiente stock. Operación bloqueada.
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded text-xs text-slate-400 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || quedaSinStock || cantNum <= 0}
              className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? 'Produciendo…' : 'Registrar producción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
