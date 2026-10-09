import React from 'react';
import { SpatialInspectionWorkspace } from '../components/spatial/SpatialInspectionWorkspace';
import { ShieldCheck, MapPin, Compass } from 'lucide-react';

export const SpatialInputPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title Context */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          <span>Dam Safety Portal</span>
          <span>/</span>
          <span>Inspections</span>
          <span>/</span>
          <span className="text-govt-navy font-bold">Spatial Input & GIS Fly-To Hub</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-700">NDSA Compliant Spatial Lineage Layer</span>
        </div>
      </div>

      {/* Main Workspace Component */}
      <SpatialInspectionWorkspace />
    </div>
  );
};
