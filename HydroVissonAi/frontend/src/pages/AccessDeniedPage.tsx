import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, ArrowLeft, Building2 } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();

  const getDashboardPath = () => {
    switch (role) {
      case 'AUTHORITY':
        return '/authority/dashboard';
      case 'DAM_OPERATOR':
        return '/operator/dashboard';
      case 'INSPECTION_ENGINEER':
        return '/engineer/dashboard';
      case 'MAINTENANCE_MANAGER':
        return '/manager/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white border border-rose-300 shadow-md rounded-md p-8 max-w-md w-full border-t-4 border-t-rose-700">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <div className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-1">
          HTTP 403 FORBIDDEN — SYSTEM ACCESS RESTRICTED
        </div>

        <h1 className="text-xl font-extrabold text-govt-navy mb-2">
          403 — Unauthorized Module Access
        </h1>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Your authenticated account is not authorized to access the module at <code className="bg-slate-100 text-rose-800 px-1 py-0.5 rounded font-mono font-bold">{location.pathname}</code>.
        </p>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded text-left text-xs mb-6 space-y-1">
          <div><span className="font-bold text-slate-700">Authenticated User:</span> {user?.full_name || 'Authorized User'}</div>
          <div><span className="font-bold text-slate-700">Assigned Role:</span> <span className="font-bold text-govt-navy uppercase">{role || 'RESTRICTED'}</span></div>
          <div><span className="font-bold text-slate-700">Department:</span> {user?.department || 'Infrastructure Dept'}</div>
        </div>

        <div className="text-[11px] text-slate-500 mb-6 italic">
          HydroVision AI enforces strict Role-Based Access Control (RBAC) to ensure structural engineering records and safety certifications are managed exclusively by authorized personnel.
        </div>

        <Link
          to={getDashboardPath()}
          className="inline-flex items-center justify-center space-x-2 bg-govt-navy hover:bg-govt-blue text-white text-xs font-bold px-4 py-2 rounded shadow transition w-full uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Permitted Role Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
