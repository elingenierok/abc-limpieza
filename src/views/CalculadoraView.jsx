import { useEffect, useState } from 'react';
import { listarInsumos } from '../modules/stock/stock.repo.js';
import { Calculator, ArrowLeft, Droplet, Beaker, AlertCircle } from 'lucide-react';

function nf(n, dec = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: dec,
    minimumFractionDigits: 0
  }).format(n);
}

export default function CalculadoraView() {
  const [concentrados, setConcentrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Modo 1: quiero X litros finales
  const [modo1Conc, setModo1Conc] = useState('');
  const [modo1Litros, setModo1Litros] = useState('');

  // Modo 2: tengo Y litros de concentrado
  const [modo2Conc, setModo2Conc] = useState('');
  const [modo2Litros, setModo2Litros] = useState('');

  useEffect(() => {
    cargarConcentrados();
  }, []);

  const cargarConcentrados = async () => {
    setCargando(true);
    try {
      const todos = await listarInsumos();
      const concs = todos.filter(i => i.cod.endsWith('-CONC') && i.factor_dilucion > 1);
      setConcentrados(concs);
      if (concs.length > 0) {
        setModo1Conc(concs[0].cod);
        setModo2Conc(concs[0].cod);
      }
    } catch (err) {
      setError(err.detalle || 'Error al cargar concentrados');
    } finally {
      setCargando(false);
    }
  };

  const conc1 = concentrados.find(c => c.cod === modo1Conc);
  const conc2 = concentrados.find(c => c.cod === modo2Conc);

  // Modo 1: cuánto concentrado y agua necesito para X litros finales
  const calc1 = (() => {
    if (!conc1 || !(Number(modo1Litros) > 0)) return null;
    const final = Number(modo1Litros);
    const factor = Number(conc1.factor_dilucion);
    const concentrado = final / factor;
    const agua = final - concentrado;
    return {
      final,
      concentrado,
      agua,
      factor,
      unidad: conc1.unidad
    };
  })();

  // Modo 2: cuánto puedo obtener si tengo Y litros de concentrado
  const calc2 = (() => {
    if (!conc2 || !(Number(modo2Litros) > 0)) return null;
    const conc = Number(modo2Litros);
    const factor = Number(conc2.factor_dilucion);
    const final = conc * factor;
    const agua = final - conc;
    return {
      concentrado: conc,
      final,
      agua,
      factor,
      unidad: conc2.unidad
    };
  })();

  if (cargando) {
    return <div className="text-slate-500 text-sm py-8 text-center">Cargando productos…</div>;
  }

  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Calculator size={20} /> Calculadora de Dilución
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Simulá escenarios sin afectar el stock
        </p>
      </div>

      {concentrados.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          No hay concentrados con factor de dilución cargado. Cargalos en Stock primero.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Modo 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-800">
              <Droplet size={20} className="text-sky-400 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-white">Cuánto necesito</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Si quiero X litros finales, ¿cuánto concentrado y agua uso?
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Producto
              </label>
              <select
                value={modo1Conc}
                onChange={e => setModo1Conc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {concentrados.map(c => (
                  <option key={c.cod} value={c.cod}>
                    {c.nom} (factor x{c.factor_dilucion})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Litros finales deseados
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={modo1Litros}
                onChange={e => setModo1Litros(e.target.value)}
                placeholder="Ej. 17"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-lg font-bold text-slate-100 focus:outline-none focus:border-sky-500 tabular-nums text-center"
              />
            </div>

            {calc1 && (
              <div className="bg-slate-950 border border-sky-900/50 rounded p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Beaker size={14} /> Concentrado
                  </span>
                  <span className="font-bold text-sky-400 tabular-nums">
                    {nf(calc1.concentrado)} {calc1.unidad}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Droplet size={14} /> Agua
                  </span>
                  <span className="font-bold text-sky-400 tabular-nums">
                    {nf(calc1.agua)} {calc1.unidad}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                    Total final
                  </span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    {nf(calc1.final)} {calc1.unidad}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modo 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-800">
              <Beaker size={20} className="text-emerald-400 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-white">Cuánto puedo obtener</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Si tengo Y litros de concentrado, ¿cuánto diluido y agua necesito?
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Producto
              </label>
              <select
                value={modo2Conc}
                onChange={e => setModo2Conc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {concentrados.map(c => (
                  <option key={c.cod} value={c.cod}>
                    {c.nom} (factor x{c.factor_dilucion})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Litros de concentrado disponibles
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={modo2Litros}
                onChange={e => setModo2Litros(e.target.value)}
                placeholder="Ej. 7"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-lg font-bold text-slate-100 focus:outline-none focus:border-sky-500 tabular-nums text-center"
              />
              {conc2 && (
                <p className="text-[10px] text-slate-600 mt-1">
                  Stock actual en sistema: {nf(conc2.stock)} {conc2.unidad}
                </p>
              )}
            </div>

            {calc2 && (
              <div className="bg-slate-950 border border-emerald-900/50 rounded p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Beaker size={14} /> Concentrado
                  </span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    {nf(calc2.concentrado)} {calc2.unidad}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Droplet size={14} /> Agua
                  </span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    {nf(calc2.agua)} {calc2.unidad}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                    Producto final obtenido
                  </span>
                  <span className="font-bold text-sky-400 tabular-nums">
                    {nf(calc2.final)} {calc2.unidad}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla de referencia */}
      {concentrados.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-bold text-white mb-3">Tabla de factores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-right py-2">Factor</th>
                  <th className="text-right py-2">1 L rinde</th>
                  <th className="text-right py-2">Relación</th>
                </tr>
              </thead>
              <tbody>
                {concentrados.map(c => (
                  <tr key={c.cod} className="border-b border-slate-800/50">
                    <td className="py-2 text-slate-200">{c.nom}</td>
                    <td className="py-2 text-right text-sky-400 font-bold tabular-nums">
                      x{c.factor_dilucion}
                    </td>
                    <td className="py-2 text-right text-slate-300 tabular-nums">
                      {nf(c.factor_dilucion, 0)} {c.unidad}
                    </td>
                    <td className="py-2 text-right text-slate-500 font-mono text-[10px]">
                      1 + {nf(c.factor_dilucion - 1, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}