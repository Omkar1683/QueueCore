import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Briefcase, AlertTriangle, Cpu, BarChart3, LogOut, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/dead-letter', label: 'Dead Letter Queue', icon: AlertTriangle },
  { to: '/workers', label: 'Workers', icon: Cpu },
  { to: '/metrics', label: 'Metrics', icon: BarChart3 },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{ background: 'linear-gradient(180deg, #111118 0%, #0d0d15 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.06]">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #4c6ef5, #7950f2)', boxShadow: '0 0 20px rgba(92,124,250,0.4)' }}>
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none tracking-tight">QueueCore</h1>
          <p className="text-xs text-slate-500 mt-0.5 leading-none">Job Queue Service</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'text-white bg-brand-600/20 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full" />
                )}
                <Icon
                  size={18}
                  className={clsx(
                    'transition-colors duration-200 flex-shrink-0',
                    isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4c6ef5, #7950f2)' }}>
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">
              {user?.name || user?.email || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.role || 'admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
