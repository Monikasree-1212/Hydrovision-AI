import React, { useEffect, useState } from 'react';
import { AuditLog } from '../types';
import { AuditService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { FileCheck2, RefreshCw } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const data = await AuditService.getAuditTrail();
      setAudits(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail & Compliance Log"
        description="Immutable government audit trail recording user logins, dam registry changes, drone data uploads, human defect verifications, work orders, and PDF report generations."
        category="MODULE 18 — AUDIT TRAIL"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Audit Trail' }]}
        actions={
          <button
            onClick={fetchAudits}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Audit Log</span>
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading system audit trail...</div>
      ) : audits.length === 0 ? (
        <EmptyState
          title="No audit log entries recorded"
          description="The system audit trail is currently empty."
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">User Account</th>
                  <th className="p-3.5">Entity Type</th>
                  <th className="p-3.5">Audit Value Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-slate-500 text-xs font-mono">{new Date(a.timestamp).toLocaleString()}</td>
                    <td className="p-3.5 font-bold text-govt-navy">{a.action}</td>
                    <td className="p-3.5 font-medium text-slate-800">{a.user_email || 'System'}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{a.entity_type || 'System'}</td>
                    <td className="p-3.5 font-medium text-slate-700">{a.new_value || a.old_value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
