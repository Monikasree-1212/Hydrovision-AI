import React, { useEffect, useState } from 'react';
import { Alert } from '../types';
import { AlertService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Bell, Check, AlertCircle, RefreshCw } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await AlertService.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await AlertService.markRead(id);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Event Alerts & Safety Notifications"
        description="Real database notifications generated from critical defects, overdue inspection cycles, or unassigned maintenance tasks."
        category="MODULE 15 — ALERTS"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Alerts' }]}
        actions={
          <button
            onClick={fetchAlerts}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading system alerts...</div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No active safety alerts"
          description="There are currently no unread notifications or critical safety alerts recorded in the database."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-lg border flex items-center justify-between text-sm transition shadow-sm ${
                a.is_read ? 'bg-white border-slate-200 text-slate-600' : 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
              }`}
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${a.is_read ? 'text-slate-400' : 'text-rose-700'}`} />
                <div>
                  <div className="font-bold text-govt-navy">{a.alert_type}</div>
                  <div className="mt-0.5 text-slate-800">{a.message}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              </div>

              {!a.is_read && (
                <button
                  onClick={() => handleMarkRead(a.id)}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark as Read</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
