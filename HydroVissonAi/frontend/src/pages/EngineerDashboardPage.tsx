import React, { useEffect, useState } from 'react';
import { Inspection, Defect } from '../types';
import { InspectionService, DefectService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { 
  ClipboardCheck, Upload, Cpu, CheckSquare, 
  FileText, RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EngineerDashboardPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  const loadEngineerData = async () => {
    setLoading(true);
    try {
      const [inspsData, defectsData] = await Promise.all([
        InspectionService.getInspections(),
        DefectService.getDefects()
      ]);
      setInspections(inspsData);
      setDefects(defectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEngineerData();
  }, []);

  const unverifiedDefects = defects.filter(d => d.status === 'AI_DETECTED' || d.status === 'UNDER_REVIEW');

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'तकनीकी निरीक्षण एवं एआई सत्यापन हब' : 'Technical Inspection & AI Verification Hub'}
        description={language === 'HI' ? 'इंजीनियरिंग कार्यस्थल: ड्रोन मीडिया अपलोड, YOLO11 एआई दोष पहचान, मानव सत्यापन हस्ताक्षर, जीआईएस/3डी डिजिटल ट्विन मैपिंग, तथा निरीक्षण रिपोर्ट जनरेशन।' : 'Engineering workspace for drone media ingestion, YOLO11 AI defect detection, human verification sign-off, GIS/3D digital twin mapping, and inspection report generation.'}
        category={t('role_engineer')}
        breadcrumbs={[{ name: t('role_engineer'), path: '/engineer/dashboard' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={loadEngineerData}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
            <Link
              to="/drone-data"
              className="bg-govt-blue hover:bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm flex items-center space-x-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('nav_drone_data')}</span>
            </Link>
            <Link
              to="/reports"
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रिपोर्ट्स' : 'Reports'}</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Active Inspections</div>
          <div className="text-3xl font-bold text-govt-navy mt-1">{loading ? '...' : inspections.length}</div>
          <div className="text-xs text-slate-500 mt-1">Under engineering evaluation</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Pending AI Verification</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">{loading ? '...' : unverifiedDefects.length}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting human sign-off</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Verified Defects</div>
          <div className="text-3xl font-bold text-emerald-800 mt-1">
            {loading ? '...' : defects.filter(d => d.status === 'VERIFIED' || d.status === 'WORK_ORDER_CREATED').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Confirmed by engineer</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">AI Inference Engine</div>
          <div className="text-xs font-bold text-emerald-800 mt-2 flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>YOLO11 PIPELINE READY</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Real inference engine</div>
        </div>
      </div>

      {/* Human In The Loop Verification Queue */}
      <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-emerald-800" />
            <span>Engineer Defect Verification Queue</span>
          </h2>
          <Link to="/defect-verification" className="text-xs font-bold text-govt-blue hover:underline">
            View All Defects
          </Link>
        </div>

        {defects.length === 0 ? (
          <EmptyState
            title="No defects detected or recorded"
            description="No AI defect detections are currently pending engineer verification. Upload drone imagery to an inspection to run the YOLO11 defect pipeline."
            actionLabel="Go to Inspections"
            onAction={() => window.location.href = '/inspections'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Defect Code</th>
                  <th className="p-3.5">Target Dam</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5">AI Confidence</th>
                  <th className="p-3.5">Est. Length</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {defects.map((defc) => (
                  <tr key={defc.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{defc.defect_code}</td>
                    <td className="p-3.5 font-medium text-slate-800">{defc.dam_name || 'Dam'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{defc.defect_type}</td>
                    <td className="p-3.5 font-semibold text-emerald-800">{(defc.confidence * 100).toFixed(0)}%</td>
                    <td className="p-3.5 font-mono text-xs">{defc.estimated_length_mm || 0} mm</td>
                    <td className="p-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        defc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                        defc.severity === 'HIGH' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        {defc.severity}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{defc.status}</td>
                    <td className="p-3.5 text-right">
                      <Link
                        to="/defect-verification"
                        className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                      >
                        Verify Sign-off
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
