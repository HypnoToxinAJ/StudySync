import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap = {
    routine: 'Class Routine & Calendar',
    attendance: 'Attendance & CT Marks',
    assessments: 'Tests & Assignments',
    cgpa: 'CGPA Calculator',
    tuition: 'Tuition Tracker',
    expenses: 'Expense Tracker',
    focus: 'Focus Mode',
    settings: 'Settings & Data',
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-4">
      <Link to="/" className="hover:text-brand-500 flex items-center space-x-1 transition-colors">
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[value] || value;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            {isLast ? (
              <span className="text-slate-900 dark:text-white font-bold">
                {displayName}
              </span>
            ) : (
              <Link to={to} className="hover:text-brand-500 transition-colors">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
