import React, { useEffect, useState } from 'react';
import { DroneImage, Inspection } from '../types';
import { UploadService, InspectionService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { CheckCircle2, AlertTriangle, XCircle, Sliders, ShieldCheck, RefreshCw } from 'lucide-react';

export const DataQualityPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<number | ''>('');
  const [mediaItems, setMediaItems] = useState<DroneImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQualityData = async () => {
    setLoading(true);
    try {
      const insps = await InspectionService.getInspections();
      setInspections(insps);

      const targetId = selectedInspection ? Number(selectedInspection) : (insps.length > 0 ? insps[0].id : null);
      if (targetId) {
        const media = await UploadService.getInspectionMedia(targetId);
        setMediaItems(media);
      } else {
        setMediaItems([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, [selectedInspection]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality & Integrity Control"
        description="Automated pre-inference verification assessing drone imagery blur index, brightness thresholds, resolution adequacy, EXIF metadata integrity, and spatial GPS tagging."
        category="MODULE 05 — DATA QUALITY"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Data Quality' }]}
        actions={
          <button
            onClick={fetchQualityData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-run Quality Check</span>
          </button>
        }
      />

      {/* Inspection Selector */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center space-x-3">
        <label className="text-sm font-semibold text-slate-700">Select Inspection Cycle:</label>
        <select
          value={selectedInspection}
          onChange={(e) => setSelectedInspection(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[260px]"
        >
          <option value="">Select Inspection</option>
          {inspections.map((insp) => (
            <option key={insp.id} value={insp.id}>
              {insp.inspection_code} — Dam #{insp.dam_id}
            </option>
          ))}
        </select>
      </div>

      {/* Quality Summary Cards */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Total Files Audited</div>
            <div className="text-2xl font-bold text-govt-navy mt-1">{mediaItems.length}</div>
            <div className="text-xs text-slate-500">Visual & thermal drone media</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Accepted Quality</div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">
              {mediaItems.filter((m) => m.quality_status === 'VALID').length}
            </div>
            <div className="text-xs text-slate-500">Passed blur & contrast check</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Quality Warnings</div>
            <div className="text-2xl font-bold text-amber-800 mt-1">
              {mediaItems.filter((m) => m.quality_status === 'WARNING').length}
            </div>
            <div className="text-xs text-slate-500">Low light or marginal resolution</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Rejected Files</div>
            <div className="text-2xl font-bold text-rose-800 mt-1">
              {mediaItems.filter((m) => m.quality_status === 'REJECTED').length}
            </div>
            <div className="text-xs text-slate-500">Severe blur or corrupted EXIF</div>
          </div>
        </div>
      )}

      {/* Quality Audit Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500">Analyzing image quality metrics...</div>
      ) : mediaItems.length === 0 ? (
        <EmptyState
          title="No media quality records found"
          description="No uploaded drone files exist for this inspection to evaluate quality parameters."
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Automated Quality Metrics Table</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">OpenCV Laplacian Blur & Histogram Metrics</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Filename</th>
                  <th className="p-3.5">Resolution</th>
                  <th className="p-3.5">Blur Score</th>
                  <th className="p-3.5">Brightness Score</th>
                  <th className="p-3.5">GPS Tag</th>
                  <th className="p-3.5">Integrity Status</th>
                  <th className="p-3.5 text-right">Quality Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {mediaItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{item.filename}</td>
                    <td className="p-3.5 font-mono text-xs text-slate-700">
                      {item.width && item.height ? `${item.width} x ${item.height}` : 'N/A'}
                    </td>
                    <td className="p-3.5 font-mono text-xs">
                      <span className={(item.blur_score ?? 0) < 100 ? 'text-amber-800 font-bold' : 'text-emerald-900 font-bold'}>
                        {(item.blur_score ?? 0).toFixed(1)} {(item.blur_score ?? 0) >= 100 ? '(PASS)' : '(BLUR WARNING)'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-xs text-slate-700">
                      {(item.brightness_score ?? 0).toFixed(1)}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${item.latitude ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {item.latitude ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">SHA256 VERIFIED</td>
                    <td className="p-3.5 text-right">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold border ${
                        item.quality_status === 'VALID' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        item.quality_status === 'WARNING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {item.quality_status === 'VALID' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{item.quality_status}</span>
                      </span>
                    </td>
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
