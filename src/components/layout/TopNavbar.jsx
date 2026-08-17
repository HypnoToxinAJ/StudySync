import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  AlertCircle,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { UserAvatar } from '../common/UserAvatar';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const TopNavbar = ({ onOpenMobileNav, onOpenQuickAdd }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeAlerts, dismissAlert, dismissAllAlerts } = useData();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isConfirmDismissAllOpen, setIsConfirmDismissAllOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  const handleConfirmDismissAll = () => {
    dismissAllAlerts();
    setIsConfirmDismissAllOpen(false);
  };

  const handleProfileSettingsClick = () => {
    setShowProfileMenu(false);
    navigate('/settings');
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <button
          onClick={onOpenMobileNav}
          aria-label="Open mobile menu"
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, routines, tests, shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right: Date, Quick Add, Notifications, Theme Toggle, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Date Display */}
        <div className="hidden xl:block text-right">
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {todayStr}
          </p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Academic Session 2026
          </p>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications (${activeAlerts.length} unread)`}
            className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Notifications & Alerts ({activeAlerts.length})
                </h4>
                <div className="flex items-center space-x-2">
                  {activeAlerts.length > 0 && (
                    <button
                      onClick={() => setIsConfirmDismissAllOpen(true)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Dismiss all</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    aria-label="Close dropdown"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {activeAlerts.length === 0 ? (
                  <p className="text-xs text-center py-6 text-slate-400">
                    No active alerts. You are all caught up!
                  </p>
                ) : (
                  activeAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-start justify-between space-x-3"
                    >
                      <div className="flex items-start space-x-2.5">
                        <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
                          alert.priority === 'high' ? 'text-rose-500' : 'text-amber-500'
                        }`} />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {alert.message}
                          </p>
                          <span className="inline-block text-[10px] font-semibold text-brand-500 mt-1">
                            {alert.date}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-slate-400 hover:text-rose-500 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile menu"
            className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <UserAvatar user={user} size="sm" />
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50">
              <div className="flex items-center space-x-3 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <UserAvatar user={user} size="md" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Student User'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || 'student@university.edu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleProfileSettingsClick}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors mt-1 text-left"
              >
                <User className="w-4 h-4" />
                <span>Profile & Settings</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors mt-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmDismissAllOpen}
        onClose={() => setIsConfirmDismissAllOpen(false)}
        onConfirm={handleConfirmDismissAll}
        title="Dismiss All Notifications?"
        message={`Are you sure you want to dismiss all ${activeAlerts.length} visible notifications? You can undo this action from the toast message.`}
      />
    </header>
  );
};
