import { Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard, Package, ShoppingCart, Calendar,
  Users, Truck, BarChart3, Menu, X, LogOut, Boxes, Calculator
} from 'lucide-react';

const NAV = [
  { to: '/dashboard',    label: 'Inicio',       Icon: LayoutDashboard },
  { to: '/stock',        label: 'Stock',        Icon: Package },
  { to: '/kits',         label: 'Kits',         Icon: Boxes },
  { to: '/calculadora',  label: 'Calculadora',  Icon: Calculator },
  { to: '/pedidos',      label: 'Pedidos',      Icon: ShoppingCart },
  { to: '/agenda',       label: 'Agenda',       Icon: Calendar },
  { to: '/clientes',     label: 'Clientes',     Icon: Users },
  { to: '/compras',      label: 'Compras',      Icon: Truck },
  { to: '/reportes',     label: 'Reportes',     Icon: BarChart3 }
];

const NAV_MOBILE = NAV.filter(n =>
  ['/dashboard','/stock','/pedidos','/agenda','/clientes'].includes(n.to)
);

export default function Layout() {
  const [drawer, setDrawer] = useState(false);
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-full md:grid md:grid-cols-[220px_1fr]">
      {/* Sidebar escritorio */}
      <aside className="hidden md:flex md:flex-col justify-between bg-slate-900 border-r border-slate-800">
        <div>
          <div className="px-4 py-4 border-b border-slate-800">
            <h1 className="text-xs font-bold tracking-[0.15em] uppercase">Gestión Limpieza</h1>
          </div>
          <nav className="p-2 space-y-0.5">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon size={16} /> <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Cierre de sesión Escritorio */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="text-[11px] text-slate-500 truncate px-2">{usuario?.email}</div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <h1 className="text-xs font-bold tracking-[0.15em] uppercase">Gestión Limpieza</h1>
        <button
          onClick={() => setDrawer(v => !v)}
          className="p-1 -mr-1 text-slate-300"
          aria-label="Menú"
        >
          {drawer ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Drawer móvil (acceso a todos los módulos) */}
      {drawer && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setDrawer(false)}
        >
          <div
            className="w-64 bg-slate-900 h-full pt-3 flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            <nav>
              <div className="px-4 pb-3 mb-2 border-b border-slate-800">
                <p className="text-xs text-slate-400 truncate">{usuario?.email}</p>
              </div>
              {NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDrawer(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm ${
                      isActive ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`
                  }
                >
                  <Icon size={18} /> <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-800 mb-12">
              <button
                onClick={() => { setDrawer(false); logout(); }}
                className="w-full flex items-center gap-3 text-sm text-red-400"
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="p-4 md:p-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom nav móvil */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-slate-900 border-t border-slate-800 grid grid-cols-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_MOBILE.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                isActive ? 'text-white' : 'text-slate-500'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}