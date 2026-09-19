import { useEffect, useState } from 'react';
import { listarClientes, eliminarCliente } from '../modules/clientes/clientes.repo.js';
import ClienteModal from '../components/ClienteModal.jsx';
import { Plus, Edit2, Trash2, AlertCircle, Search, Phone, Mail } from 'lucide-react';

export default function ClientesView() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditar, setClienteEditar] = useState(null);

  useEffect(() => {
    cargarLista();
  }, []);

  const cargarLista = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarClientes({ soloActivos: false });
      setClientes(data);
    } catch (err) {
      setError(err.detalle || 'Error al cargar los clientes');
    } finally {
      setCargando(false);
    }
  };

  const handleNuevo = () => {
    setClienteEditar(null);
    setModalAbierto(true);
  };

  const handleEditar = (cliente) => {
    setClienteEditar(cliente);
    setModalAbierto(true);
  };

  const handleEliminar = async (cliente) => {
    if (!confirm(`¿Eliminar a "${cliente.razon_social}"? Si tiene pedidos, sólo se desactivará.`)) return;
    try {
      const resultado = await eliminarCliente(cliente.id);
      if (resultado.modo === 'soft') {
        alert(`Cliente desactivado. Tenía ${resultado.pedidos_asociados} pedido(s) asociado(s).`);
      }
      await cargarLista();
    } catch (err) {
      alert(`Error al eliminar: ${err.code || err.detalle}`);
    }
  };

  const filtrados = clientes.filter(c => {
    if (!busqueda.trim()) return true;
    const s = busqueda.toLowerCase();
    return (
      c.razon_social?.toLowerCase().includes(s) ||
      c.nombre_fantasia?.toLowerCase().includes(s) ||
      c.cuit?.includes(s) ||
      c.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">Gestión de Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">Datos comerciales y direcciones de entrega</p>
        </div>
        <button
          onClick={handleNuevo}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-2 rounded transition"
        >
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por razón social, CUIT o email…"
          className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
        />
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs rounded p-3 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {cargando ? (
        <div className="text-slate-500 text-xs py-8 text-center">Cargando clientes…</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          {busqueda ? 'Sin resultados para tu búsqueda.' : 'No hay clientes registrados.'}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map(c => (
            <div
              key={c.id}
              className={`bg-slate-900 border border-slate-800 rounded-lg p-4 ${
                !c.activo ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-200">
                      {c.razon_social}
                    </span>
                    {c.nombre_fantasia && (
                      <span className="text-[10px] text-slate-500 italic">
                        ({c.nombre_fantasia})
                      </span>
                    )}
                    {!c.activo && (
                      <span className="text-[10px] px-2 py-0.5 rounded uppercase font-medium bg-slate-950 text-slate-500 border border-slate-800">
                        Inactivo
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 uppercase bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                      {c.condicion_iva?.replace(/_/g, ' ') || 'CONSUMIDOR FINAL'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {c.cuit && <span className="font-mono">CUIT: {c.cuit}</span>}
                    {c.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {c.telefono}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={11} /> {c.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditar(c)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded transition flex items-center gap-1"
                    title="Editar cliente"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(c)}
                    className="text-xs bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 px-2 py-1 rounded transition"
                    title="Eliminar o desactivar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClienteModal
        isOpen={modalAbierto}
        cliente={clienteEditar}
        onClose={() => setModalAbierto(false)}
        onGuardado={cargarLista}
      />
    </div>
  );
}