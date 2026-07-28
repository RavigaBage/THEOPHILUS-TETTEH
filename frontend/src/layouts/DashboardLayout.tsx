import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Coffee,
  Calendar,
  Monitor,
  FileText,
  QrCode,
  LogOut,
  Smartphone,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Internet Lounge', path: '/lounge', icon: Coffee },
    { label: 'Room Management', path: '/rooms', icon: Calendar },
    { label: 'Device Control', path: '/devices', icon: Monitor },
    { label: 'Reports & Issues', path: '/reports', icon: FileText },
    { label: 'Attendance QR', path: '/attendance-qr', icon: QrCode },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-slate-800 bg-slate-900/90 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-800 mb-6">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
            IAC
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight">IAC Staff Portal</h1>
            <p className="text-xs text-slate-400">Management & Control</p>
          </div>
        </div>

        {/* Visitor Hub Switcher Banner */}
        <button
          onClick={() => navigate('/hub')}
          className="mb-6 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Visitor Mobile App</span>
          </div>
          <span className="bg-emerald-500/30 text-emerald-200 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded">Hub</span>
        </button>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 pt-4 mt-auto">
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-semibold text-slate-200">{user?.name || 'Staff'}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'Staff Role'}</p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              IAC
            </div>
            <span className="font-bold text-xs text-slate-100">IAC Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hub')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 text-xs font-medium flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>The Hub</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
