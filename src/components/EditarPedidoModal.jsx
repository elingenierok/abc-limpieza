import { useEffect, useState, useMemo } from 'react';
import { actualizarPedido, obtenerParametrosNegocio } from '../modules/pedidos/pedidos.repo.js';
import { listarKits } from '../modules/kits/kits.repo.js';
import { listarInsumos } from '../modules/stock/stock.repo.js';
import { X, Plus, Trash2, AlertCircle, ShoppingCart, AlertTriangle, Edit2 } from 'lucide-react';

function formatearPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(n ?? 0);
}

function formatearNumero(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
}

export default function EditarPedidoModal({ isOpen, pedido, onClose, onPedidoActualizado }) {
  const [kits, setKits] = useState([]);
  const [packagings, setPackagings] = useState([]);
  const [insumosMap, setInsumosMap] = useState({});
  const [parametros, setParametros] = useState(null);

  const [prioridad, setPrioridad] = useState('MEDIA');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [obs, setObs] = useState('');
  const [lineas, setLineas] = useState([]);
  const [conFlete, setConFlete] = useState(false);

  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    cargarTodo();
  }, [isOpen, pedido]);

  const cargarTodo = async () => {
    setCargandoDatos(true);
    setError(null);
    try {
      const [listKits, listInsumos, params] = await Promise.all([
        listarKits({ soloActivos: true }),
        listarInsumos(),
        obtenerParametrosNegocio()
      ]);

      const packagings = listInsumos.filter(i => i.tipo === 'PACKAGING');
      const mapa = Object.fromEntries(listInsumos.map(i => [i.cod, i]));

      setKits(listKits);
      setPackagings(packagings);
      setInsumosMap(mapa);
      setParametros(params);

      // Precargar el pedido
      setPrioridad(pedido?.prioridad ?? 'MEDIA');
      setFechaCompromiso(pedido?.fecha_compromiso ?? '');
      setObs(pedido?.obs ?? '');
      setConFlete(Number(pedido?.flete ?? 0) > 0);

      const lineasIniciales = (pedido?.items ?? []).map(it => ({
        tipo: it.tipo === 'KIT' ? 'KIT' : 'PACKAGING',
        item_cod: it.item_cod,
        cantidad: Number(it.cantidad),
        precio_unit: Number(it.precio_unit),
        devuelve_envases: Boolean(it.devuelve_envases)
      }));
      setLineas(lineasIniciales);
    } catch (err) {
      setError('Error al cargar los datos.');
    } finally {
      setCargandoDatos(false);
    }
  };

  const agregarLinea = (tipo) => {
    if (tipo === 'KIT' && kits.length === 0) return;
    if (tipo === 'PACKAGING' && packagings.length === 0) return;

    const primerItem = tipo === 'KIT' ? kits[0] : packagings[0];
    const precio = tipo === 'KIT' ? primerItem.precio_calculado : primerItem.precio_unit;

    setLineas(prev => [
      ...prev,
      {
        tipo,
        item_cod: tipo === 'KIT' ? primerItem.id : primerItem.cod,
        cantidad: 1,
        precio_unit: precio ?? 0,
        devuelve_envases: false
      }
    ]);
  };

  const eliminarLinea = (idx) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  };

  const actualizarLinea = (idx, campo, valor) => {
    setLineas(prev => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], [campo]: valor };
      return copia;
    });
  };

  const cambiarItemDeLinea = (idx, nuevoCod) => {
    setLineas(prev => {
      const copia = [...prev];
      const linea = copia[idx];

      if (linea.tipo === 'KIT') {
        const kit = kits.find(k => k.id === nuevoCod);
        copia[idx] = {
          ...linea,
          item_cod: nuevoCod,
          precio_unit: kit?.precio_calculado ?? 0
        };
      } else {
        const pack = packagings.find(p => p.cod === nuevoCod);
        copia[idx] = {
          ...linea,
          item_cod: nuevoCod,
          precio_unit: pack?.precio_unit ?? 0
        };
      }
      return copia;
    });
  };

  /* =========================================================
     Requerimientos consolidados
     ========================================================= */
  const requerimientos = useMemo(() => {
    const req = {};

    for (const l of lineas) {
      const cantidadLinea = Number(l.cantidad) || 0;
      if (cantidadLinea <= 0) continue;

      if (l.tipo === 'KIT') {
        const kit = kits.find(k => k.id === l.item_cod);
        if (!kit) continue;
        for (const comp of kit.componentes ?? []) {
          const cod = comp.cod;
          const cantidadTotal = Number(comp.cantidad) * cantidadLinea;
          req[cod] = (req[cod] ?? 0) + cantidadTotal;
        }
      } else {
        req[l.item_cod] = (req[l.item_cod] ?? 0) + cantidadLinea;
      }
    }

    return req;
  }, [lineas, kits]);

  /* =========================================================
     Faltantes de stock
     Consideran la reserva actual del pedido (que será liberada y re-reservada)
     ========================================================= */
  const faltantes = useMemo(() => {
    const out = [];

    // Requerimientos del pedido ORIGINAL (para sumarlos al disponible)
    const reqOriginales = {};
    for (const it of pedido?.items ?? []) {
      if (it.tipo === 'KIT') {
        const kit = kits.find(k => k.id === it.item_cod);
        if (!kit) continue;
        for (const comp of kit.componentes ?? []) {
          const cod = comp.cod;
          const cantidadTotal = Number(comp.cantidad) * Number(it.cantidad);
          reqOriginales[cod] = (reqOriginales[cod] ?? 0) + cantidadTotal;
        }
      } else {
        reqOriginales[it.item_cod] = (reqOriginales[it.item_cod] ?? 0) + Number(it.cantidad);
      }
    }

    for (const [cod, cantidadRequerida] of Object.entries(requerimientos)) {
      const insumo = insumosMap[cod];
      if (!insumo) {
        out.push({ cod, nom: cod, requerido: cantidadRequerida, disponible: 0, unidad: '' });
        continue;
      }
      // El disponible a considerar incluye lo que este pedido ya tiene reservado
      const disponibleActual = Number(insumo.stock_disponible ?? insumo.stock ?? 0);
      const reservaPropia = Number(reqOriginales[cod] ?? 0);
      const disponibleReal = disponibleActual + reservaPropia;

      if (disponibleReal < cantidadRequerida) {
        out.push({
          cod,
          nom: insumo.nom,
          unidad: insumo.unidad,
          requerido: cantidadRequerida,
          disponible: disponibleReal
        });
      }
    }
    return out;
  }, [requerimientos, insumosMap, pedido, kits]);

  const hayFaltantes = faltantes.length > 0;

  /* =========================================================
     Resumen comercial
     ========================================================= */
  const resumen = useMemo(() => {
    let subtotal = 0;
    let descuentoTotal = 0;

    const lineasCalculadas = lineas.map(l => {
      const sub = Number(l.precio_unit) * Number(l.cantidad);
      subtotal += sub;

      let descuento = 0;
      if (l.tipo === 'KIT' && l.devuelve_envases) {
        const kit = kits.find(k => k.id === l.item_cod);
        const costoEnvasesKit = Number(kit?.costo_envases ?? 0);
        const pct = Number(parametros?.descuento_devolucion_pct ?? 0);
        descuento = costoEnvasesKit * Number(l.cantidad) * pct;
      }
      descuentoTotal += descuento;

      return { ...l, subtotal: sub, descuento };
    });

    const neto = subtotal - descuentoTotal;
    const flete = conFlete ? Number(parametros?.costo_logistica ?? 0) : 0;
    const total = neto + flete;

    return {
      lineasCalculadas,
      subtotal,
      descuentoTotal,
      neto,
      flete,
      total,
      devuelveEnvases: lineas.some(l => l.tipo === 'KIT' && l.devuelve_envases)
    };
  }, [lineas, kits, parametros, conFlete]);

  /* =========================================================
     Guardar
     ========================================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (lineas.length === 0) {
      setError('Agregá al menos un ítem al pedido.');
      return;
    }
    for (const l of lineas) {
      if (!(Number(l.cantidad) > 0)) {
        setError('Todas las cantidades deben ser mayor a 0.');
        return;
      }
    }
    if (hayFaltantes) {
      setError('No se puede guardar: hay insumos sin stock disponible suficiente.');
      return;
    }

    setEnviando(true);
    try {
      await actualizarPedido({
        pedido_id: pedido.id,
        items: lineas.map(l => ({
          tipo: l.tipo === 'KIT' ? 'KIT' : 'INSUMO',
          item_cod: l.item_cod,
          cantidad: Number(l.cantidad),
          precio_unit: Number(l.precio_unit),
          devuelve_envases: l.tipo === 'KIT' ? Boolean(l.devuelve_envases) : false
        })),
        prioridad,
        fecha_compromiso: fechaCompromiso || null,
        obs: obs.trim() || null,
        devuelve_envases: resumen.devuelveEnvases,
        flete: resumen.flete,
        descuento_devolucion: resumen.descuentoTotal
      });
      onPedidoActualizado();
      onClose();
    } catch (err) {
      setError(err.detalle || err.message || 'Error al actualizar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen || !pedido) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-4xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Edit2 size={16} /> Editar Pedido
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

        {cargandoDatos ? (
          <div className="text-slate-500 text-xs py-4 text-center">Cargando datos…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Cliente (readonly) */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Cliente (no editable)
              </label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-500">
                {pedido.cliente?.razon_social ?? '—'}
              </div>
            </div>

            {/* Datos del pedido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Fecha compromiso</label>
                <input
                  type="date"
                  value={fechaCompromiso ?? ''}
                  onChange={e => setFechaCompromiso(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
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

            {/* Botones para agregar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ítems del pedido</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => agregarLinea('KIT')}
                  disabled={kits.length === 0}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Agregar Kit
                </button>
                <button
                  type="button"
                  onClick={() => agregarLinea('PACKAGING')}
                  disabled={packagings.length === 0}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-2 py-1 rounded flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Agregar Packaging
                </button>
              </div>
            </div>

            {/* Tabla de líneas */}
            {lineas.length === 0 ? (
              <div className="text-xs text-slate-600 italic text-center py-6 border border-dashed border-slate-800 rounded">
                Sin ítems. Agregá un kit o packaging.
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Ítem</th>
                      <th className="text-center p-2 w-20">Cant.</th>
                      <th className="text-right p-2 w-24">Precio u.</th>
                      <th className="text-right p-2 w-24">Subtotal</th>
                      <th className="text-center p-2 w-24">Dev. env.</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.lineasCalculadas.map((l, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50">
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2">
                          {l.tipo === 'KIT' ? (
                            <select
                              value={l.item_cod}
                              onChange={e => cambiarItemDeLinea(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                            >
                              {kits.map(k => (
                                <option key={k.id} value={k.id}>{k.nombre}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={l.item_cod}
                              onChange={e => cambiarItemDeLinea(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                            >
                              {packagings.map(p => (
                                <option key={p.cod} value={p.cod}>{p.nom}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={l.cantidad}
                            onChange={e => {
                              const val = Math.floor(Number(e.target.value) || 0);
                              actualizarLinea(idx, 'cantidad', val < 1 ? 1 : val);
                            }}
                            className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center"
                          />
                        </td>
                        <td className="p-2 text-right text-slate-400 tabular-nums">
                          {formatearPrecio(l.precio_unit)}
                        </td>
                        <td className="p-2 text-right text-slate-200 font-bold tabular-nums">
                          {formatearPrecio(l.subtotal)}
                        </td>
                        <td className="p-2 text-center">
                          {l.tipo === 'KIT' ? (
                            <input
                              type="checkbox"
                              checked={l.devuelve_envases}
                              onChange={e => actualizarLinea(idx, 'devuelve_envases', e.target.checked)}
                              className="w-4 h-4 accent-sky-500 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => eliminarLinea(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Faltantes */}
            {hayFaltantes && (
              <div className="bg-amber-950/40 border border-amber-800 rounded p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle size={14} /> Stock insuficiente
                </div>
                <div className="space-y-1">
                  {faltantes.map(f => (
                    <div key={f.cod} className="flex items-center justify-between text-xs">
                      <span className="text-amber-200">{f.nom}</span>
                      <span className="text-amber-300 tabular-nums">
                        requiere {formatearNumero(f.requerido)} {f.unidad} · disponible {formatearNumero(f.disponible)} {f.unidad}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-amber-400 pt-1">
                  Corregí las cantidades o cargá stock antes de guardar.
                </div>
              </div>
            )}

            {/* Resumen comercial */}
            {lineas.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200 tabular-nums font-bold">
                    {formatearPrecio(resumen.subtotal)}
                  </span>
                </div>

                {resumen.descuentoTotal > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Subtotal devoluciones</span>
                    <span className="text-emerald-400 tabular-nums font-bold">
                      −{formatearPrecio(resumen.descuentoTotal)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Neto</span>
                  <span className="text-slate-200 tabular-nums font-bold">
                    {formatearPrecio(resumen.neto)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conFlete}
                      onChange={e => setConFlete(e.target.checked)}
                      className="w-4 h-4 accent-sky-500"
                    />
                    <span>Flete urgente</span>
                  </label>
                  <span className="text-slate-200 tabular-nums font-bold">
                    {conFlete ? `+ ${formatearPrecio(resumen.flete)}` : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t-2 border-sky-900/50">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Total a cobrar
                  </span>
                  <span className="text-xl font-bold text-sky-400 tabular-nums">
                    {formatearPrecio(resumen.total)}
                  </span>
                </div>
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
                disabled={enviando || lineas.length === 0 || hayFaltantes}
                className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}