import React, { useEffect, useState } from 'react';
import { Dam, Inspection, Defect } from '../types';
import { DamService, InspectionService, DefectService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { Building, ClipboardCheck, Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OperatorDashboardPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  const loadData = async () => {
    setLoading(true);
    try {
      const [damsData, inspsData, defectsData] = await Promise.all([
        DamService.getDams(),
        InspectionService.getInspections(),
        DefectService.getDefects()
      ]);
      setDams(damsData);
      setInspections(inspsData);
      setDefects(defectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'आवंटित बाँध स्वास्थ्य एवं परिचालन निगरानी' : 'Assigned Dam Health & Operational Monitoring'}
        description={language === 'HI' ? 'बाँध ऑपरेटर कार्यस्थल: बाँध परिसर के स्वास्थ्य की निगरानी, ड्रोन सर्वेक्षणों का निर्धारण और रखरखाव कार्य आदेशों की स्थिति दर्ज करना।' : 'Dam operator workspace tracking assigned dam facility health, scheduling drone visual/thermal surveys, and monitoring maintenance work order statuses.'}
        category={t('role_operator')}
        breadcrumbs={[{ name: t('role_operator'), path: '/operator/dashboard' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
            <Link
              to="/inspections"
              className="bg-govt-blue hover:bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'नया निरीक्षण अनुरोध' : 'New Inspection Request'}</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Assigned Dams</div>
          <div className="text-3xl font-bold text-govt-navy mt-1">{loading ? '...' : dams.length}</div>
          <div className="text-xs text-slate-500 mt-1">Operational facility records</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Inspections</div>
          <div className="text-3xl font-bold text-sky-800 mt-1">{loading ? '...' : inspections.length}</div>
          <div className="text-xs text-slate-500 mt-1">Drone survey cycles</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Verified Defects</div>
          <div className="text-3xl font-bold text-amber-800 mt-1">{loading ? '...' : defects.length}</div>
          <div className="text-xs text-slate-500 mt-1">Under structural observation</div>
        </div>
      </div>

      {/* Inspection Requests Table */}
      <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
            <ClipboardCheck className="w-4 h-4 text-govt-blue" />
            <span>Inspection Requests & Drone Survey Status</span>
          </h2>
          <Link to="/inspections" className="text-xs text-govt-blue font-bold hover:underline">
            Manage All Inspections
          </Link>
        </div>

        {inspections.length === 0 ? (
          <EmptyState
            title="No inspection records available"
            description="No drone inspection schedules have been created for your assigned dam. Create a new inspection request to begin data collection."
            actionLabel="Schedule Inspection"
            onAction={() => window.location.href = '/inspections'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Inspection Code</th>
                  <th className="p-3.5">Target Dam</th>
                  <th className="p-3.5">Survey Method</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Coverage</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{insp.inspection_code}</td>
                    <td className="p-3.5 font-medium text-slate-800">{insp.dam_name || 'Dam'}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{insp.inspection_type}</td>
                    <td className="p-3.5 text-slate-600 text-xs">{new Date(insp.inspection_date).toLocaleDateString()}</td>
                    <td className="p-3.5 font-semibold text-slate-700">{insp.coverage_percentage}%</td>
                    <td className="p-3.5">
                      <span className="bg-sky-100 text-sky-900 text-xs font-bold px-2.5 py-1 rounded border border-sky-300">
                        {insp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link to={`/inspections/${insp.id}`} className="text-xs font-bold text-govt-blue hover:underline">
                        Open Inspection
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
