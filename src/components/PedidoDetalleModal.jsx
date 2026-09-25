import { X, FileText, Eye } from 'lucide-react';

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

export default function PedidoDetalleModal({ isOpen, pedido, onClose }) {
  if (!isOpen || !pedido) return null;

  const items = pedido.items ?? [];
  const totalFlete = Number(pedido.flete ?? 0);
  const totalDescuento = Number(pedido.descuento_devolucion ?? 0);
  const montoFinal = Number(pedido.monto ?? 0);

  // Reconstruir subtotal y neto a partir del monto final
  const neto = montoFinal - totalFlete;
  const subtotal = neto + totalDescuento;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Eye size={16} /> Resumen del Pedido
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Encabezado */}
        <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cliente</div>
              <div className="font-bold text-sm text-slate-200 truncate">
                {pedido.cliente?.razon_social ?? '—'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Estado</div>
              <div className="text-xs font-bold text-slate-200">{pedido.estado}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Prioridad</div>
              <div className="text-slate-300">{pedido.prioridad}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Creado</div>
              <div className="text-slate-300">
                {new Date(pedido.creado_en).toLocaleDateString('es-AR')}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Compromiso</div>
              <div className="text-slate-300">
                {pedido.fecha_compromiso
                  ? new Date(pedido.fecha_compromiso + 'T00:00:00').toLocaleDateString('es-AR')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Devolución</div>
              <div className="text-slate-300">
                {pedido.devuelve_envases ? 'Sí' : 'No'}
              </div>
            </div>
          </div>

          {pedido.obs && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Observaciones</div>
              <div className="text-xs text-slate-300">{pedido.obs}</div>
            </div>
          )}
        </div>

        {/* Ítems */}
        <div>
          <h3 className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
            Ítems del pedido
          </h3>
          {items.length === 0 ? (
            <div className="text-xs text-slate-600 italic text-center py-4 border border-dashed border-slate-800 rounded">
              Sin ítems.
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Ítem</th>
                    <th className="text-center p-2 w-16">Cant.</th>
                    <th className="text-right p-2 w-24">Precio u.</th>
                    <th className="text-right p-2 w-24">Subtotal</th>
                    <th className="text-center p-2 w-20">Dev.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id ?? idx} className="border-b border-slate-800/50">
                      <td className="p-2 text-slate-500">{idx + 1}</td>
                      <td className="p-2 text-slate-300">
                        <span className="font-mono text-[10px] text-slate-500 mr-1">
                          {it.tipo}
                        </span>
                        {it.item_cod}
                      </td>
                      <td className="p-2 text-center text-slate-300 tabular-nums">
                        {formatearNumero(it.cantidad)}
                      </td>
                      <td className="p-2 text-right text-slate-400 tabular-nums">
                        {formatearPrecio(it.precio_unit)}
                      </td>
                      <td className="p-2 text-right text-slate-200 font-bold tabular-nums">
                        {formatearPrecio(Number(it.precio_unit) * Number(it.cantidad))}
                      </td>
                      <td className="p-2 text-center">
                        {it.tipo === 'KIT' && it.devuelve_envases
                          ? <span className="text-emerald-400">✓</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen comercial */}
        <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-slate-200 tabular-nums font-bold">
              {formatearPrecio(subtotal)}
            </span>
          </div>

          {totalDescuento > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Subtotal devoluciones</span>
              <span className="text-emerald-400 tabular-nums font-bold">
                −{formatearPrecio(totalDescuento)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
            <span className="text-slate-400">Neto</span>
            <span className="text-slate-200 tabular-nums font-bold">
              {formatearPrecio(neto)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="text-slate-400">Flete</span>
            <span className="text-slate-200 tabular-nums font-bold">
              {totalFlete > 0 ? `+ ${formatearPrecio(totalFlete)}` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t-2 border-sky-900/50">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Total
            </span>
            <span className="text-xl font-bold text-sky-400 tabular-nums">
              {formatearPrecio(montoFinal)}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-slate-400 hover:bg-slate-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}