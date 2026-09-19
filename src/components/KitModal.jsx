import { useEffect, useState } from 'react';
import {
  crearKit, actualizarKit, actualizarKitItems, obtenerKit
} from '../modules/kits/kits.repo.js';
import { listarInsumos } from '../modules/stock/stock.repo.js';
import { X, Plus, Trash2, AlertCircle, Package, Boxes } from 'lucide-react';

function formatearPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(n ?? 0);
}

function generarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

const CATEGORIAS_SUGERIDAS = ['Hogar', 'Cocina', 'Bano', 'Pisos', 'Exteriores', 'Pileta', 'Patio'];

export default function KitModal({ isOpen, kit, onClose, onGuardado }) {
  const modoEdicion = Boolean(kit?.id);

  const [id, setId]                     = useState('');
  const [nombre, setNombre]             = useState('');
  const [categoria, setCategoria]       = useState('Hogar');
  const [descripcion, setDescripcion]   = useState('');
  const [activo, setActivo]             = useState(true);
  const [items, setItems]               = useState([]);

  const [insumos, setInsumos]           = useState([]);
  const [cargando, setCargando]         = useState(false);
  const [enviando, setEnviando]         = useState(false);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    cargarInsumos();

    if (modoEdicion) {
      cargarKitCompleto();
    } else {
      resetearFormulario();
    }
  }, [isOpen, kit]);

  const resetearFormulario = () => {
    setId('');
    setNombre('');
    setCategoria('Hogar');
    setDescripcion('');
    setActivo(true);
    setItems([]);
  };

  const cargarInsumos = async () => {
    try {
      const lista = await listarInsumos();
      setInsumos(lista);
    } catch (err) {
      setError('No se pudieron cargar los insumos.');
    }
  };

  const cargarKitCompleto = async () => {
    setCargando(true);
    try {
      const completo = await obtenerKit(kit.id);
      if (!completo) {
        setError('No se encontró el kit.');
        return;
      }
      setId(completo.id);
      setNombre(completo.nombre ?? '');
      setCategoria(completo.categoria ?? 'Hogar');
      setDescripcion(completo.descripcion ?? '');
      setActivo(completo.activo ?? true);
      setItems(
        (completo.componentes ?? []).map(c => ({
          cod: c.cod,
          cantidad: c.cantidad
        }))
      );
    } catch (err) {
      setError(err.detalle || 'Error al cargar el kit');
    } finally {
      setCargando(false);
    }
  };

  const handleNombreChange = (valor) => {
    setNombre(valor);
    if (!modoEdicion && !id) {
      setId(generarSlug(valor));
    }
  };

  const agregarItem = () => {
    if (insumos.length === 0) return;
    const usados = new Set(items.map(i => i.cod));
    const disponible = insumos.find(i => !usados.has(i.cod));
    if (!disponible) return;

    setItems(prev => [
      ...prev,
      { cod: disponible.cod, cantidad: 1 }
    ]);
  };

  const eliminarItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const actualizarItem = (idx, campo, valor) => {
    setItems(prev => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], [campo]: valor };
      return copia;
    });
  };

  // Cálculo del precio en vivo
  const precioCalculado = (() => {
    const bruto = items.reduce((acc, item) => {
      const insumo = insumos.find(i => i.cod === item.cod);
      const precio = Number(insumo?.precio_unit ?? 0);
      const cant = Number(item.cantidad ?? 0);
      return acc + (precio * cant);
    }, 0);
    return Math.round(bruto / 100) * 100;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!modoEdicion && !id.trim()) {
      setError('El ID es obligatorio.');
      return;
    }
    if (items.length === 0) {
      setError('El kit debe tener al menos un componente.');
      return;
    }
    for (const item of items) {
      if (!(Number(item.cantidad) > 0)) {
        setError('Cada componente debe tener cantidad mayor a 0.');
        return;
      }
    }

    setEnviando(true);
    try {
      if (modoEdicion) {
        // 1. Actualizar datos básicos
        await actualizarKit(kit.id, {
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          descripcion: descripcion.trim() || null,
          activo
        });
        // 2. Reemplazar componentes
        await actualizarKitItems(kit.id, items);
      } else {
        await crearKit({
          id: id.trim(),
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          descripcion: descripcion.trim() || null,
          items
        });
      }
      onGuardado();
      onClose();
    } catch (err) {
      const code = err.code || '';
      if (code === 'PK_DUPLICADA') {
        setError('Ya existe un kit con ese ID. Probá otro.');
      } else if (code === 'KIT_SIN_ITEMS') {
        setError('El kit debe tener al menos un componente.');
      } else if (code === 'FK_INVALIDA') {
        setError('Alguno de los insumos seleccionados no existe.');
      } else {
        setError(err.detalle || err.message || 'Error al guardar el kit');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  const insumosDisponibles = insumos.filter(i => {
    const usados = new Set(items.map(it => it.cod));
    return !usados.has(i.cod);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider">
            {modoEdicion ? 'Editar Kit' : 'Nuevo Kit'}
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

            {/* Datos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Nombre del Kit *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => handleNombreChange(e.target.value)}
                  placeholder="Ej. Kit Hogar Básico"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  ID del Kit {modoEdicion ? '(no editable)' : '*'}
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  disabled={modoEdicion}
                  placeholder="kit-hogar-basico"
                  className={`w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-mono ${
                    modoEdicion ? 'text-slate-500 cursor-not-allowed' : 'text-slate-100'
                  }`}
                  required={!modoEdicion}
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  {modoEdicion
                    ? 'El ID no se puede cambiar para preservar pedidos históricos.'
                    : 'Se genera del nombre. Podés editarlo.'}
                </p>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Categoría *
                </label>
                <input
                  type="text"
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  list="categorias-kit"
                  placeholder="Hogar, Cocina, Pileta…"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
                <datalist id="categorias-kit">
                  {CATEGORIAS_SUGERIDAS.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Ej. Kit completo para limpieza de baño"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {modoEdicion && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="kit-activo"
                    checked={activo}
                    onChange={e => setActivo(e.target.checked)}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <label htmlFor="kit-activo" className="text-xs text-slate-300 cursor-pointer">
                    Kit activo
                  </label>
                </div>
              )}
            </div>

            {/* Componentes */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Package size={12} /> Componentes
                </span>
                <button
                  type="button"
                  onClick={agregarItem}
                  disabled={insumosDisponibles.length === 0}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Agregar componente
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-xs text-slate-600 italic text-center py-3 border border-dashed border-slate-800 rounded">
                  Sin componentes. Agregá al menos uno.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const insumoActual = insumos.find(i => i.cod === item.cod);
                    const subtotal = Number(insumoActual?.precio_unit ?? 0) * Number(item.cantidad ?? 0);

                    return (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded p-2 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <select
                            value={item.cod}
                            onChange={e => actualizarItem(idx, 'cod', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                          >
                            {insumoActual && (
                              <option value={item.cod}>
                                {insumoActual.nom} ({insumoActual.cod})
                              </option>
                            )}
                            {insumosDisponibles.map(ins => (
                              <option key={ins.cod} value={ins.cod}>
                                {ins.nom} ({ins.cod})
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad}
                            onChange={e => actualizarItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center"
                          />

                          <span className="text-[10px] text-slate-500 w-8">
                            {insumoActual?.unidad ?? '—'}
                          </span>

                          <button
                            type="button"
                            onClick={() => eliminarItem(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-600 pl-1">
                          Subtotal: {formatearPrecio(subtotal)}
                          {insumoActual && ` · Stock actual: ${insumoActual.stock} ${insumoActual.unidad}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Precio calculado en vivo */}
            <div className="bg-slate-950 border border-slate-800 rounded p-3 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Boxes size={12} /> Precio calculado del kit
              </span>
              <span className="text-lg font-bold text-sky-400 tabular-nums">
                {formatearPrecio(precioCalculado)}
              </span>
            </div>

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
                {enviando ? 'Guardando…' : (modoEdicion ? 'Guardar Cambios' : 'Crear Kit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}