import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Truck, AlertCircle, AlertTriangle, Users
} from 'lucide-react';
import { obtenerResumenOperativo } from '../modules/reportes/reportes.repo.js';

function Card({ label, valor, Icon, colorClass }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 border-l-4 ${colorClass} rounded-md p-3`}>
      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider">
        <span>{label}</span>
        <Icon size={13} />
      </div>
      <div className="text-2xl font-bold tabular-nums mt-1 leading-tight">
        {valor ?? '—'}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await obtenerResumenOperativo();
        if (vivo) setData(r);
      } catch (e) {
        if (vivo) setError(e);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  if (cargando) {
    return <div className="text-slate-400 text-sm">Cargando…</div>;
  }

  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-800 text-red-300 text-sm rounded p-3 space-y-1">
        <div>No se pudo cargar el resumen: {error.code ?? error.detalle ?? 'error desconocido'}</div>
        <div className="text-xs text-red-400/70">
          Verificá que tu sesión esté activa y que el rol sea admin u operador.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Dashboard operativo</h2>

      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Pedidos</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Pendientes"  valor={data.pedidos_pendientes} Icon={ShoppingCart} colorClass="border-l-amber-500" />
          <Card label="Preparados"  valor={data.pedidos_preparados} Icon={Truck}        colorClass="border-l-sky-500" />
          <Card label="En camino"   valor={data.pedidos_en_camino}  Icon={Truck}        colorClass="border-l-sky-500" />
          <Card label="Entregados"  valor={data.pedidos_entregados} Icon={Truck}        colorClass="border-l-emerald-500" />
        </div>
      </div>

      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Stock</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Crítico"     valor={data.stock_critico}  Icon={AlertCircle}   colorClass="border-l-red-500" />
          <Card label="Bajo"        valor={data.stock_bajo}     Icon={AlertTriangle} colorClass="border-l-amber-500" />
          <Card label="Atención"    valor={data.stock_atencion} Icon={AlertTriangle} colorClass="border-l-sky-500" />
          <Card label="OK"          valor={data.stock_ok}       Icon={AlertCircle}   colorClass="border-l-emerald-500" />
        </div>
      </div>

      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Terceros</div>
        <div className="grid grid-cols-2 gap-3">
          <Card label="Clientes activos"    valor={data.clientes_activos}    Icon={Users} colorClass="border-l-sky-500" />
          <Card label="Proveedores activos" valor={data.proveedores_activos} Icon={Users} colorClass="border-l-sky-500" />
        </div>
      </div>

      <Link to="/stock" className="inline-block text-sky-400 hover:text-sky-300 text-sm">
        Ver detalle de stock →
      </Link>
    </div>
  );
}