import { UserRole } from '../types';

export type PermissionAction = 
  | 'VIEW' 
  | 'CREATE' 
  | 'EDIT' 
  | 'DELETE' 
  | 'RUN_AI' 
  | 'VERIFY_DEFECT' 
  | 'ASSIGN_MAINTENANCE' 
  | 'GENERATE_REPORT';

export type SystemModule = 
  | 'HOME'
  | 'AUTHORITY_DASHBOARD'
  | 'OPERATOR_DASHBOARD'
  | 'ENGINEER_DASHBOARD'
  | 'MANAGER_DASHBOARD'
  | 'DAM_DIRECTORY'
  | 'DAM_CREATE_EDIT'
  | 'INSPECTIONS'
  | 'INSPECTION_CREATE'
  | 'DRONE_UPLOAD'
  | 'DATA_QUALITY'
  | 'AI_ANALYSIS'
  | 'DEFECT_MANAGEMENT'
  | 'ENGINEER_VERIFICATION'
  | 'GIS'
  | 'DIGITAL_TWIN'
  | 'HISTORICAL_COMPARISON'
  | 'CONDITION_ASSESSMENT'
  | 'RISK_ASSESSMENT'
  | 'PREDICTIVE_ANALYSIS'
  | 'MAINTENANCE'
  | 'WORK_ORDER_CREATE'
  | 'WORK_ORDER_UPDATE'
  | 'REINSPECTION_REQUEST'
  | 'REINSPECTION_EXECUTE'
  | 'REPORTS'
  | 'REPORT_GENERATE'
  | 'ALERTS'
  | 'AUDIT_TRAIL';

// Central Permission Matrix for HydroVision AI
const ROLE_PERMISSIONS: Record<UserRole, Set<SystemModule>> = {
  SUPREME_COMMAND: new Set([
    'HOME',
    'AUTHORITY_DASHBOARD',
    'DAM_DIRECTORY',
    'DAM_CREATE_EDIT',
    'INSPECTIONS',
    'DATA_QUALITY',
    'AI_ANALYSIS',
    'DEFECT_MANAGEMENT',
    'GIS',
    'DIGITAL_TWIN',
    'HISTORICAL_COMPARISON',
    'CONDITION_ASSESSMENT',
    'RISK_ASSESSMENT',
    'PREDICTIVE_ANALYSIS',
    'MAINTENANCE',
    'WORK_ORDER_CREATE',
    'WORK_ORDER_UPDATE',
    'REINSPECTION_REQUEST',
    'REINSPECTION_EXECUTE',
    'REPORTS',
    'REPORT_GENERATE',
    'ALERTS',
    'AUDIT_TRAIL',
  ]),
  AUTHORITY: new Set([
    'HOME',
    'AUTHORITY_DASHBOARD',
    'DAM_DIRECTORY',
    'DAM_CREATE_EDIT',
    'INSPECTIONS',
    'DATA_QUALITY',
    'AI_ANALYSIS',
    'DEFECT_MANAGEMENT',
    'GIS',
    'DIGITAL_TWIN',
    'HISTORICAL_COMPARISON',
    'CONDITION_ASSESSMENT',
    'RISK_ASSESSMENT',
    'PREDICTIVE_ANALYSIS',
    'MAINTENANCE',
    'REINSPECTION_REQUEST',
    'REPORTS',
    'ALERTS',
    'AUDIT_TRAIL',
  ]),
  DAM_OPERATOR: new Set([
    'HOME',
    'OPERATOR_DASHBOARD',
    'DAM_DIRECTORY',
    'INSPECTIONS',
    'INSPECTION_CREATE',
    'DRONE_UPLOAD',
    'DATA_QUALITY',
    'AI_ANALYSIS',
    'DEFECT_MANAGEMENT',
    'GIS',
    'DIGITAL_TWIN',
    'HISTORICAL_COMPARISON',
    'CONDITION_ASSESSMENT',
    'RISK_ASSESSMENT',
    'PREDICTIVE_ANALYSIS',
    'MAINTENANCE',
    'REINSPECTION_REQUEST',
    'REPORTS',
    'ALERTS',
  ]),
  INSPECTION_ENGINEER: new Set([
    'HOME',
    'ENGINEER_DASHBOARD',
    'DAM_DIRECTORY',
    'INSPECTIONS',
    'INSPECTION_CREATE',
    'DRONE_UPLOAD',
    'DATA_QUALITY',
    'AI_ANALYSIS',
    'DEFECT_MANAGEMENT',
    'ENGINEER_VERIFICATION',
    'GIS',
    'DIGITAL_TWIN',
    'HISTORICAL_COMPARISON',
    'CONDITION_ASSESSMENT',
    'RISK_ASSESSMENT',
    'PREDICTIVE_ANALYSIS',
    'MAINTENANCE',
    'REINSPECTION_EXECUTE',
    'REPORTS',
    'REPORT_GENERATE',
    'ALERTS',
  ]),
  MAINTENANCE_MANAGER: new Set([
    'HOME',
    'MANAGER_DASHBOARD',
    'DAM_DIRECTORY',
    'INSPECTIONS',
    'DATA_QUALITY',
    'AI_ANALYSIS',
    'DEFECT_MANAGEMENT',
    'GIS',
    'DIGITAL_TWIN',
    'HISTORICAL_COMPARISON',
    'CONDITION_ASSESSMENT',
    'RISK_ASSESSMENT',
    'PREDICTIVE_ANALYSIS',
    'MAINTENANCE',
    'WORK_ORDER_CREATE',
    'WORK_ORDER_UPDATE',
    'REINSPECTION_REQUEST',
    'REPORTS',
    'ALERTS',
    'AUDIT_TRAIL',
  ]),
};

export const hasPermission = (role: UserRole | null, module: SystemModule): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(module) ?? false;
};

export const isRouteAllowed = (role: UserRole | null, path: string): boolean => {
  if (!role) return false;

  if (path === '/' || path === '/home' || path === '/about') return true;

  if (path.startsWith('/supreme-command') && role !== 'SUPREME_COMMAND') return false;
  if (path.startsWith('/authority') && role !== 'AUTHORITY') return false;
  if (path.startsWith('/operator') && role !== 'DAM_OPERATOR') return false;
  if (path.startsWith('/engineer') && role !== 'INSPECTION_ENGINEER') return false;
  if (path.startsWith('/manager') && role !== 'MAINTENANCE_MANAGER') return false;

  if (path.startsWith('/audit') && !(role === 'AUTHORITY' || role === 'MAINTENANCE_MANAGER' || role === 'SUPREME_COMMAND' || role === 'INSPECTION_ENGINEER')) return false;

  return true;
};
