import { useEffect, useState } from 'react';
import { crearCliente, actualizarCliente, obtenerCliente } from '../modules/clientes/clientes.repo.js';
import { X, Plus, Trash2, AlertCircle, MapPin } from 'lucide-react';

const IVA_OPCIONES = [
  { valor: 'RESPONSABLE_INSCRIPTO', etiqueta: 'Responsable Inscripto' },
  { valor: 'MONOTRIBUTO',           etiqueta: 'Monotributo' },
  { valor: 'EXENTO',                etiqueta: 'Exento' },
  { valor: 'CONSUMIDOR_FINAL',      etiqueta: 'Consumidor Final' }
];

const DIRECCION_VACIA = {
  etiqueta: '',
  direccion: '',
  localidad: '',
  provincia: '',
  es_principal: false
};

export default function ClienteModal({ isOpen, cliente, onClose, onGuardado }) {
  const modoEdicion = Boolean(cliente?.id);

  const [razonSocial, setRazonSocial]     = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [cuit, setCuit]                   = useState('');
  const [condicionIva, setCondicionIva]   = useState('CONSUMIDOR_FINAL');
  const [email, setEmail]                 = useState('');
  const [telefono, setTelefono]           = useState('');
  const [limiteCredito, setLimiteCredito] = useState(0);
  const [activo, setActivo]               = useState(true);
  const [direcciones, setDirecciones]     = useState([]);

  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (modoEdicion) {
      cargarClienteCompleto();
    } else {
      resetearFormulario();
    }
  }, [isOpen, cliente]);

  const resetearFormulario = () => {
    setRazonSocial('');
    setNombreFantasia('');
    setCuit('');
    setCondicionIva('CONSUMIDOR_FINAL');
    setEmail('');
    setTelefono('');
    setLimiteCredito(0);
    setActivo(true);
    setDirecciones([]);
  };

  const cargarClienteCompleto = async () => {
    setCargando(true);
    try {
      const completo = await obtenerCliente(cliente.id);
      if (!completo) {
        setError('No se encontró el cliente.');
        return;
      }
      setRazonSocial(completo.razon_social ?? '');
      setNombreFantasia(completo.nombre_fantasia ?? '');
      setCuit(completo.cuit ?? '');
      setCondicionIva(completo.condicion_iva ?? 'CONSUMIDOR_FINAL');
      setEmail(completo.email ?? '');
      setTelefono(completo.telefono ?? '');
      setLimiteCredito(completo.limite_credito ?? 0);
      setActivo(completo.activo ?? true);
      setDirecciones(completo.direcciones ?? []);
    } catch (err) {
      setError(err.detalle || 'Error al cargar el cliente');
    } finally {
      setCargando(false);
    }
  };

  const agregarDireccion = () => {
    setDirecciones(prev => [
      ...prev,
      { ...DIRECCION_VACIA, es_principal: prev.length === 0 }
    ]);
  };

  const eliminarDireccion = (idx) => {
    setDirecciones(prev => prev.filter((_, i) => i !== idx));
  };

  const actualizarDireccion = (idx, campo, valor) => {
    setDirecciones(prev => {
      const copia = [...prev];
      if (campo === 'es_principal' && valor === true) {
        // Sólo una principal: desmarcar las demás
        for (let i = 0; i < copia.length; i++) {
          copia[i] = { ...copia[i], es_principal: i === idx };
        }
      } else {
        copia[idx] = { ...copia[idx], [campo]: valor };
      }
      return copia;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!razonSocial.trim()) {
      setError('La razón social es obligatoria.');
      return;
    }

    for (const d of direcciones) {
      if (!d.etiqueta || !d.direccion || !d.localidad || !d.provincia) {
        setError('Cada dirección requiere etiqueta, dirección, localidad y provincia.');
        return;
      }
    }

    setEnviando(true);
    try {
      const payload = {
        razon_social:    razonSocial.trim(),
        nombre_fantasia: nombreFantasia.trim() || null,
        cuit:            cuit.trim() || null,
        condicion_iva:   condicionIva,
        email:           email.trim() || null,
        telefono:        telefono.trim() || null,
        limite_credito:  Number(limiteCredito) || 0,
        activo,
        direcciones
      };

      if (modoEdicion) {
        await actualizarCliente(cliente.id, payload);
      } else {
        await crearCliente(payload);
      }

      onGuardado();
      onClose();
    } catch (err) {
      const code = err.code || '';
      if (code === 'CUIT_DUPLICADO') {
        setError('Ya existe un cliente con ese CUIT.');
      } else {
        setError(err.detalle || err.message || 'Error al guardar el cliente');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider">
            {modoEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  Razón Social *
                </label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Nombre de Fantasía
                </label>
                <input
                  type="text"
                  value={nombreFantasia}
                  onChange={e => setNombreFantasia(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  CUIT
                </label>
                <input
                  type="text"
                  value={cuit}
                  onChange={e => setCuit(e.target.value)}
                  placeholder="30-12345678-9"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Condición IVA
                </label>
                <select
                  value={condicionIva}
                  onChange={e => setCondicionIva(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {IVA_OPCIONES.map(o => (
                    <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Límite de Crédito
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={limiteCredito}
                  onChange={e => setLimiteCredito(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {modoEdicion && (
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={activo}
                    onChange={e => setActivo(e.target.checked)}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <label htmlFor="activo" className="text-xs text-slate-300 cursor-pointer">
                    Cliente activo
                  </label>
                </div>
              )}
            </div>

            {/* Direcciones */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={12} /> Direcciones de entrega
                </span>
                <button
                  type="button"
                  onClick={agregarDireccion}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded flex items-center gap-1 transition"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {direcciones.length === 0 ? (
                <div className="text-xs text-slate-600 italic text-center py-3 border border-dashed border-slate-800 rounded">
                  Sin direcciones cargadas
                </div>
              ) : (
                <div className="space-y-3">
                  {direcciones.map((d, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={d.etiqueta}
                          onChange={e => actualizarDireccion(idx, 'etiqueta', e.target.value)}
                          placeholder="Etiqueta (ej. Depósito)"
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                        />
                        <input
                          type="text"
                          value={d.direccion}
                          onChange={e => actualizarDireccion(idx, 'direccion', e.target.value)}
                          placeholder="Calle y número"
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                        />
                        <input
                          type="text"
                          value={d.localidad}
                          onChange={e => actualizarDireccion(idx, 'localidad', e.target.value)}
                          placeholder="Localidad"
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                        />
                        <input
                          type="text"
                          value={d.provincia}
                          onChange={e => actualizarDireccion(idx, 'provincia', e.target.value)}
                          placeholder="Provincia"
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={d.es_principal}
                            onChange={e => actualizarDireccion(idx, 'es_principal', e.target.checked)}
                            className="w-3.5 h-3.5 accent-sky-500"
                          />
                          Dirección principal
                        </label>
                        <button
                          type="button"
                          onClick={() => eliminarDireccion(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {enviando ? 'Guardando…' : (modoEdicion ? 'Guardar Cambios' : 'Crear Cliente')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}