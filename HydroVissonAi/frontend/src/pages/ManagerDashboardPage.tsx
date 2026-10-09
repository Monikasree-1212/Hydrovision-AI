import React, { useEffect, useState } from 'react';
import { WorkOrder, Defect } from '../types';
import { MaintenanceService, DefectService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { Wrench, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ManagerDashboardPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [criticalDefects, setCriticalDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  const loadManagerData = async () => {
    setLoading(true);
    try {
      const [woData, defectsData] = await Promise.all([
        MaintenanceService.getWorkOrders(),
        DefectService.getDefects({ severity: 'HIGH' })
      ]);
      setWorkOrders(woData);
      setCriticalDefects(defectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'जोखिम-आधारित रखरखाव योजना एवं मरम्मत संचालन' : 'Risk-Based Maintenance Planning & Repair Operations'}
        description={language === 'HI' ? 'रखरखाव प्रबंधक पोर्टल: सत्यापित दोष मरम्मत का विवरण, कार्य आदेश जारी करना और मरम्मत पश्चात पुनः निरीक्षण अनुरोध प्रबंधित करना।' : 'Maintenance manager portal tracking verified defect repairs, assigning engineering units, monitoring work order lifecycles, and initiating post-repair reinspections.'}
        category={t('role_manager')}
        breadcrumbs={[{ name: t('role_manager'), path: '/manager/dashboard' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={loadManagerData}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
            <Link
              to="/maintenance-planning"
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'कार्य आदेश जारी करें' : 'Issue Work Order'}</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Active Work Orders</div>
          <div className="text-3xl font-bold text-govt-navy mt-1">{loading ? '...' : workOrders.length}</div>
          <div className="text-xs text-slate-500 mt-1">Scheduled civil repairs</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Pending Assignment</div>
          <div className="text-3xl font-bold text-amber-700 mt-1">
            {loading ? '...' : workOrders.filter(w => w.status === 'OPEN').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Requires team allocation</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Reinspection Required</div>
          <div className="text-3xl font-bold text-sky-800 mt-1">
            {loading ? '...' : workOrders.filter(w => w.status === 'REINSPECTION_REQUIRED' || w.status === 'REPAIR_COMPLETED').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Awaiting engineer sign-off</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">High Priority Defects</div>
          <div className="text-3xl font-bold text-rose-800 mt-1">{loading ? '...' : criticalDefects.length}</div>
          <div className="text-xs text-slate-500 mt-1">Verified structural defects</div>
        </div>
      </div>

      {/* Maintenance Work Orders Table */}
      <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-amber-800" />
            <span>Structural Work Order Directory</span>
          </h2>
          <Link to="/work-orders" className="text-xs font-bold text-govt-blue hover:underline">
            Open Work Order Lifecycle
          </Link>
        </div>

        {workOrders.length === 0 ? (
          <EmptyState
            title="No maintenance work orders found"
            description="No maintenance work orders have been created. Create a work order from verified high-risk defect records to assign civil repair teams."
            actionLabel="Create Work Order"
            onAction={() => window.location.href = '/maintenance-planning'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Work Order Code</th>
                  <th className="p-3.5">Target Dam</th>
                  <th className="p-3.5">Defect Code</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Assigned Team</th>
                  <th className="p-3.5">Lifecycle Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{wo.work_order_code}</td>
                    <td className="p-3.5 font-medium text-slate-800">{wo.dam_name || 'Dam'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{wo.defect_code || 'DEF-01'}</td>
                    <td className="p-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        wo.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{wo.assigned_team || 'Unassigned'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{wo.status}</td>
                    <td className="p-3.5 text-right">
                      <Link to="/work-orders" className="text-amber-800 font-bold hover:underline">
                        Update Status
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
