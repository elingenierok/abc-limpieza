import { useEffect, useState } from 'react';
import { registrarMovimiento } from '../modules/stock/stock.repo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { X, AlertCircle, ArrowDown, ArrowUp, Settings } from 'lucide-react';

const TIPOS = [
  {
    valor: 'entrada',
    etiqueta: 'Entrada',
    descripcion: 'Suma stock (compra, devolución, ajuste positivo)',
    Icon: ArrowDown,
    color: 'text-emerald-400'
  },
  {
    valor: 'salida',
    etiqueta: 'Salida',
    descripcion: 'Resta stock (consumo, merma, ajuste negativo)',
    Icon: ArrowUp,
    color: 'text-red-400'
  },
  {
    valor: 'ajuste',
    etiqueta: 'Ajuste',
    descripcion: 'Corrección por inventario físico',
    Icon: Settings,
    color: 'text-amber-400'
  }
];

export default function MovimientoModal({ isOpen, insumo, onClose, onGuardado }) {
  const { usuario } = useAuth();

  const [tipo, setTipo]         = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo]     = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTipo('entrada');
    setCantidad('');
    setMotivo('');
    setError(null);
  }, [isOpen, insumo]);

  if (!isOpen || !insumo) return null;

  // Cálculo de stock resultante (sólo informativo)
  const stockActual = Number(insumo.stock) || 0;
  const cantNum     = Number(cantidad) || 0;

  let stockResultante = stockActual;
  if (tipo === 'entrada' || tipo === 'ajuste') {
    stockResultante = stockActual + cantNum;
  } else if (tipo === 'salida') {
    stockResultante = stockActual - cantNum;
  }

  const quedaNegativo = stockResultante < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!(cantNum > 0)) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    if (tipo === 'salida' && stockResultante < 0) {
      setError(`Stock insuficiente. Disponible: ${stockActual} ${insumo.unidad}. Solicitado: ${cantNum}.`);
      return;
    }

    setEnviando(true);
    try {
      await registrarMovimiento({
        cod: insumo.cod,
        tipo,
        cantidad: cantNum,
        motivo: motivo.trim() || null,
        usuario_id: usuario?.id ?? null
      });
      onGuardado();
      onClose();
    } catch (err) {
      const code = err.code || '';
      if (code === 'STOCK_NEGATIVO') {
        setError(`Stock insuficiente. Disponible: ${err.disponible ?? '?'}, solicitado: ${err.solicitado ?? '?'}.`);
      } else if (code === 'INPUT_INVALIDO') {
        setError('Datos inválidos. Revisá la cantidad y el tipo.');
      } else if (code === 'INSUMO_NO_EXISTE') {
        setError('El insumo ya no existe.');
      } else {
        setError(err.detalle || err.message || 'Error al registrar el movimiento');
      }
    } finally {
      setEnviando(false);
    }
  };

  const tipoActual = TIPOS.find(t => t.valor === tipo);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider">
            Registrar Movimiento
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

          {/* Selector de tipo */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(({ valor, etiqueta, Icon, color }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTipo(valor)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded border text-xs transition ${
                    tipo === valor
                      ? 'bg-slate-800 border-sky-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={16} className={tipo === valor ? color : ''} />
                  <span>{etiqueta}</span>
                </button>
              ))}
            </div>
            {tipoActual && (
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {tipoActual.descripcion}
              </p>
            )}
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Cantidad ({insumo.unidad}) *
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
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Compra a proveedor / Merma / Inventario físico"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-600 mt-1">
              Opcional, pero recomendado para trazabilidad.
            </p>
          </div>

          {/* Preview del resultado */}
          {cantNum > 0 && (
            <div className={`border rounded p-3 ${
              quedaNegativo
                ? 'bg-red-950/40 border-red-800'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Stock resultante:</span>
                <span className={`font-bold tabular-nums ${
                  quedaNegativo ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {stockResultante} {insumo.unidad}
                </span>
              </div>
              {quedaNegativo && (
                <div className="text-[10px] text-red-400 mt-1">
                  El stock no puede quedar negativo. Operación bloqueada.
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
              disabled={enviando || quedaNegativo || cantNum <= 0}
              className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}