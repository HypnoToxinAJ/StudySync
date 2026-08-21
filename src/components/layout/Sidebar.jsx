import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  GraduationCap,
  Banknote,
  Wallet,
  Zap,
  Calculator,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserAvatar } from '../common/UserAvatar';
import { navigationSelectors } from '../../store/selectors/navigationSelectors';

export const Sidebar = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { activeAlerts, sidebarPreferences } = useData();

  const navItems = navigationSelectors.getVisibleNavigationSections(sidebarPreferences);

  return (
    <aside
      className={`relative hidden lg:flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl transition-all duration-300 z-30 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Brand Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-brand-500/30 shrink-0">
            S
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                Study<span className="text-brand-500">Sync</span>
              </h1>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Student Hub
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all group relative ${isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}

              {/* Alert Badge for Dashboard */}
              {item.path === '/' && activeAlerts.length > 0 && (
                <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isCollapsed ? 'absolute top-1 right-1' : ''
                  } bg-rose-500 text-white shadow-sm`}>
                  {activeAlerts.length}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <UserAvatar user={user} size="sm" />
            {!isCollapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || 'Student User'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.department || 'CSE'}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
