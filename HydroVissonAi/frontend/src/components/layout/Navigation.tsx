import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Building, ClipboardCheck, Box, ShieldAlert, 
  Wrench, FileText, Bell, LayoutDashboard, MapPin, 
  History, AlertTriangle, FileCheck2, Camera, CheckCircle2, Cpu, 
  Activity, CalendarClock, RefreshCw, Radio, Compass, Award
} from 'lucide-react';
import { UserRole } from '../../types';

interface NavItem {
  nameKey: string;
  path: string;
  icon: React.ElementType;
}

export const Navigation: React.FC = () => {
  const { role } = useAuth();
  const { t } = useLanguage();

  const getRoleNavItems = (currentRole: UserRole | null): NavItem[] => {
    switch (currentRole) {
      case 'SUPREME_COMMAND':
        return [
          { nameKey: 'Supreme Command HQ', path: '/supreme-command', icon: ShieldAlert },
          { nameKey: 'nav_dams', path: '/dams', icon: Building },
          { nameKey: 'nav_inspections', path: '/inspections', icon: ClipboardCheck },
          { nameKey: 'nav_digital_twin', path: '/digital-twin', icon: Box },
          { nameKey: 'nav_maintenance', path: '/maintenance', icon: Wrench },
          { nameKey: 'nav_reports', path: '/reports', icon: FileText },
          { nameKey: 'nav_audit', path: '/audit', icon: FileCheck2 },
        ];

      case 'AUTHORITY':
        return [
          { nameKey: 'nav_dashboard', path: '/authority/dashboard', icon: LayoutDashboard },
          { nameKey: 'Citizen Grievances', path: '/authority/grievances', icon: AlertTriangle },
          { nameKey: 'nav_dams', path: '/dams', icon: Building },
          { nameKey: 'nav_inspections', path: '/inspections', icon: ClipboardCheck },
          { nameKey: 'nav_digital_twin', path: '/digital-twin', icon: Box },
          { nameKey: 'nav_maintenance', path: '/maintenance', icon: Wrench },
          { nameKey: 'nav_reports', path: '/reports', icon: FileText },
          { nameKey: 'nav_alerts', path: '/alerts', icon: Bell },
          { nameKey: 'nav_audit', path: '/audit', icon: FileCheck2 },
        ];

      case 'DAM_OPERATOR':
        return [
          { nameKey: 'nav_dashboard', path: '/operator/dashboard', icon: LayoutDashboard },
          { nameKey: 'nav_dams', path: '/dams', icon: Building },
          { nameKey: 'nav_inspections', path: '/inspections', icon: ClipboardCheck },
          { nameKey: 'nav_digital_twin', path: '/digital-twin', icon: Box },
          { nameKey: 'nav_maintenance', path: '/maintenance', icon: Wrench },
          { nameKey: 'nav_reports', path: '/reports', icon: FileText },
        ];

      case 'INSPECTION_ENGINEER':
        return [
          { nameKey: 'nav_dashboard', path: '/engineer/dashboard', icon: LayoutDashboard },
          { nameKey: 'nav_dams', path: '/dams', icon: Building },
          { nameKey: 'nav_inspections', path: '/inspections', icon: ClipboardCheck },
          { nameKey: 'nav_digital_twin', path: '/digital-twin', icon: Box },
          { nameKey: 'nav_maintenance', path: '/maintenance', icon: Wrench },
          { nameKey: 'nav_reports', path: '/reports', icon: FileText },
          { nameKey: 'nav_audit', path: '/audit', icon: FileCheck2 },
        ];

      case 'MAINTENANCE_MANAGER':
        return [
          { nameKey: 'nav_dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
          { nameKey: 'nav_dams', path: '/dams', icon: Building },
          { nameKey: 'nav_inspections', path: '/inspections', icon: ClipboardCheck },
          { nameKey: 'nav_digital_twin', path: '/digital-twin', icon: Box },
          { nameKey: 'nav_maintenance', path: '/maintenance', icon: Wrench },
          { nameKey: 'nav_reports', path: '/reports', icon: FileText },
        ];

      default:
        return [
          { nameKey: 'nav_dashboard', path: '/', icon: LayoutDashboard },
          { nameKey: 'nav_dams', path: '/dams', icon: Building },
          { nameKey: 'nav_inspections', path: '/inspections', icon: ClipboardCheck },
          { nameKey: 'nav_digital_twin', path: '/digital-twin', icon: Box },
          { nameKey: 'nav_maintenance', path: '/maintenance', icon: Wrench },
          { nameKey: 'nav_reports', path: '/reports', icon: FileText },
        ];
    }
  };

  const navItems = getRoleNavItems(role);

  return (
    <nav className="bg-govt-blue text-white shadow border-b border-govt-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-11 overflow-x-auto scrollbar-none">
          <div className="flex space-x-1 sm:space-x-2 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.nameKey}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition uppercase whitespace-nowrap ${
                      isActive
                        ? 'bg-govt-navy text-white border-b-2 border-amber-400 shadow-sm'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t(item.nameKey)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
