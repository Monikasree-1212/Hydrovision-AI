import React from 'react';
import { ShieldCheck, Cpu, Box, FileText, Lock, Building2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs">
      <div className="bg-white p-6 rounded border border-govt-border shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-govt-navy p-3 rounded text-amber-400">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-govt-navy uppercase">HYDROVISION AI</h1>
            <div className="text-xs text-govt-blue font-semibold">
              AI-Assisted Dam Inspection & Predictive Maintenance Decision Support System
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-slate-700 space-y-3 leading-relaxed">
          <p>
            HydroVision AI is a serious government-grade platform designed for structural safety monitoring and maintenance of large dams, reservoirs, and hydroelectric power infrastructure.
          </p>
          <p>
            The platform establishes a complete end-to-end data pipeline connecting drone visual/thermal surveys, EXIF GPS metadata validation, YOLO11 AI computer vision defect detection, OpenCV measurement estimation, Leaflet GIS mapping, Three.js 3D Digital Twins, explainable risk scoring, XGBoost deterioration forecasting, civil work order lifecycle management, and official ReportLab PDF generation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded border border-govt-border shadow-sm space-y-2">
          <h2 className="font-bold text-govt-navy uppercase flex items-center space-x-1.5 border-b border-slate-200 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>Human-in-the-Loop Architecture</span>
          </h2>
          <p className="text-slate-600 leading-relaxed">
            AI detections serve as decision-support indicators. Every structural defect classification and severity rating requires explicit verification and digital sign-off from an authorized Inspection Engineer before contributing to official dam safety indices.
          </p>
        </div>

        <div className="bg-white p-4 rounded border border-govt-border shadow-sm space-y-2">
          <h2 className="font-bold text-govt-navy uppercase flex items-center space-x-1.5 border-b border-slate-200 pb-2">
            <Lock className="w-4 h-4 text-govt-blue" />
            <span>Role-Based Access Control (RBAC)</span>
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Enforces strict backend authorization across four distinct government roles: <strong>Government Authority</strong>, <strong>Dam Operator</strong>, <strong>Inspection Engineer</strong>, and <strong>Maintenance Manager</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
