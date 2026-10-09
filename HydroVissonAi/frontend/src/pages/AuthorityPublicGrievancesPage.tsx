import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PublicGrievanceService, DamService } from '../services/api';
import { PublicComplaint, Dam } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { 
  Building2, ShieldAlert, MapPin, Camera, Search, CheckCircle2, 
  Clock, AlertTriangle, AlertCircle, Sparkles, FileText, Phone, 
  Mail, User, ArrowRight, ExternalLink, RefreshCw, Filter, Wrench, 
  ChevronRight, X, Image as ImageIcon, Send, Upload
} from 'lucide-react';

export const AuthorityPublicGrievancesPage: React.FC = () => {
  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Triage Drawer State
  const [selectedComplaint, setSelectedComplaint] = useState<PublicComplaint | null>(null);
  const [actionStatus, setActionStatus] = useState<string>('');
  const [authorityNotes, setAuthorityNotes] = useState<string>('');
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState<string>('');
  const [assignWorkOrder, setAssignWorkOrder] = useState<boolean>(false);
  const [workOrderPriority, setWorkOrderPriority] = useState<string>('HIGH');
  const [savingAction, setSavingAction] = useState<boolean>(false);
  const resolutionFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleResolutionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setResolutionPhotoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    fetchGrievances();
  }, [statusFilter, categoryFilter]);

  const fetchGrievances = async () => {
    setLoading(true);
    try {
      const data = await PublicGrievanceService.getAuthorityGrievances({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setComplaints(data);
    } catch (err) {
      console.error('Failed to fetch authority grievances', err);
    } finally {
      setLoading(false);
    }
  };

  // Map Initialization & Marker Updates
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([22.5937, 78.9629], 5); // India view
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | HydroVision AI CDSO',
        maxZoom: 18,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    // Refresh Map Markers
    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();

      complaints.forEach((c) => {
        let color = '#10b981'; // Emerald
        if (c.ai_risk_score >= 80) color = '#e11d48'; // Critical Rose
        else if (c.ai_risk_score >= 65) color = '#f59e0b'; // High Amber
        else if (c.ai_risk_score >= 50) color = '#0284c7'; // Medium Sky

        const iconHtml = `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:bold;">${Math.round(c.ai_risk_score)}</div>`;
        const customIcon = L.divIcon({
          className: 'complaint-pin',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });
        marker.bindTooltip(`<b>${c.tracking_code}</b><br/>${c.title}<br/>Risk: ${c.ai_risk_score}`, { direction: 'top' });
        marker.on('click', () => {
          openTriageDrawer(c);
        });

        markersGroupRef.current?.addLayer(marker);
      });
    }
  }, [complaints]);

  const openTriageDrawer = (c: PublicComplaint) => {
    setSelectedComplaint(c);
    setActionStatus(c.status);
    setAuthorityNotes(c.authority_notes || '');
    setResolutionPhotoUrl(c.resolution_photo_url || '');
    setAssignWorkOrder(false);
    setWorkOrderPriority('HIGH');
  };

  const handleSaveTriageAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setSavingAction(true);
    try {
      const updated = await PublicGrievanceService.takeAuthorityAction(selectedComplaint.id, {
        status: actionStatus,
        authority_notes: authorityNotes,
        resolution_photo_url: resolutionPhotoUrl,
        assign_work_order: assignWorkOrder,
        work_order_priority: workOrderPriority,
      });

      // Update local state
      setComplaints(complaints.map(c => c.id === updated.id ? updated : c));
      setSelectedComplaint(updated);
      alert('Triage decision and official response published successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update grievance action.');
    } finally {
      setSavingAction(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.tracking_code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.citizen_name && c.citizen_name.toLowerCase().includes(q)) ||
      (c.dam_name && c.dam_name.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const totalCount = complaints.length;
  const pendingTriageCount = complaints.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const activeWorkOrdersCount = complaints.filter(c => c.status === 'INSPECTION_ASSIGNED' || c.status === 'REPAIR_IN_PROGRESS').length;
  const resolvedCount = complaints.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-govt-navy to-slate-900 border-b border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded tracking-wider">
                AUTHORITY PORTAL
              </span>
              <span className="text-slate-400 text-xs font-semibold">CDSO SUPREME OVERSIGHT DIRECTORATE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-amber-400" />
              Citizen Grievances & Spatial Triage Center
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Monitor, evaluate, and triage public water infrastructure complaints across national dams with automated spatial matching and work order dispatch.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchGrievances}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Complaints</div>
            <div className="text-2xl font-black text-white mt-1">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Public submitted records</div>
          </div>

          <div className="bg-slate-900 border border-amber-500/40 p-4 rounded-xl shadow">
            <div className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Pending Triage</div>
            <div className="text-2xl font-black text-amber-300 mt-1">{pendingTriageCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Submitted / Under Review</div>
          </div>

          <div className="bg-slate-900 border border-sky-500/40 p-4 rounded-xl shadow">
            <div className="text-xs font-extrabold text-sky-400 uppercase tracking-wider">Active Repairs</div>
            <div className="text-2xl font-black text-sky-300 mt-1">{activeWorkOrdersCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Inspection & Work Order active</div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/40 p-4 rounded-xl shadow">
            <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Resolved Cases</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{resolvedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Verified repair completions</div>
          </div>
        </div>

        {/* 3. GIS Hotspot Map Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                National Public Complaint GIS Hotspot Map
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Markers colored by AI Risk Score (Click marker to triage)</span>
          </div>

          <div ref={mapContainerRef} className="h-72 w-full rounded-xl overflow-hidden border border-slate-800 shadow-inner z-0" />
        </div>

        {/* 4. Filters & Search Bar */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search tracking code, title, citizen or dam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="INSPECTION_ASSIGNED">INSPECTION_ASSIGNED</option>
              <option value="REPAIR_IN_PROGRESS">REPAIR_IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Categories</option>
              <option value="SEEPAGE">SEEPAGE</option>
              <option value="STRUCTURAL_CRACK">STRUCTURAL CRACK</option>
              <option value="SPILLWAY_MALFUNCTION">SPILLWAY MALFUNCTION</option>
              <option value="FLOODING_RISK">FLOODING RISK</option>
              <option value="SILTATION">SILTATION</option>
              <option value="ENCROACHMENT">ENCROACHMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
        </div>

        {/* 5. Triage Table & List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tracking Code</th>
                  <th className="px-4 py-3">Category & Title</th>
                  <th className="px-4 py-3">Matched Dam Reference</th>
                  <th className="px-4 py-3 text-center">AI Risk Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No public complaints match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">{c.tracking_code}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-100">{c.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-amber-300">{c.dam_name || 'Spatial Matching'}</div>
                        {c.distance_to_dam_km !== undefined && (
                          <div className="text-[10px] text-slate-400">{c.distance_to_dam_km} km away</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-rose-400">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono ${
                          c.ai_risk_score >= 80 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          c.ai_risk_score >= 65 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {c.ai_risk_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          c.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' :
                          c.status === 'REPAIR_IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                          c.status === 'INSPECTION_ASSIGNED' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' :
                          c.status === 'REJECTED' ? 'bg-rose-900/30 text-rose-300 border border-rose-500/50' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openTriageDrawer(c)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg shadow flex items-center space-x-1 ml-auto transition cursor-pointer"
                        >
                          <span>Triage & Action</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- TRIAGE ACTION DRAWER / MODAL --- */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-lg font-black text-amber-400">{selectedComplaint.tracking_code}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                    {selectedComplaint.category}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1">{selectedComplaint.title}</h3>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Citizen Evidence & Details */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Citizen Name: <strong className="text-slate-200">{selectedComplaint.citizen_name || 'Anonymous'}</strong></span>
                <span>Phone: <strong className="text-slate-200">{selectedComplaint.citizen_phone || 'N/A'}</strong></span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Citizen Observation:</span>
                <p className="text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800/80">
                  {selectedComplaint.description}
                </p>
              </div>

              {selectedComplaint.photo_urls_json && selectedComplaint.photo_urls_json.length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-1.5 font-bold">Attached Citizen Evidence Photos:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedComplaint.photo_urls_json.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer">
                        <ImageWithFallback src={url} alt={`Evidence ${idx + 1}`} className="h-20 w-28 object-cover rounded-lg border border-amber-500/40 hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Triage Action Form */}
            <form onSubmit={handleSaveTriageAction} className="space-y-4 pt-2">
              <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                Official Authority Action & Resolution Protocol
              </h4>

              {/* Status Update */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Update Complaint Status</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="INSPECTION_ASSIGNED">INSPECTION_ASSIGNED</option>
                  <option value="REPAIR_IN_PROGRESS">REPAIR_IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              {/* Work Order Conversion Option */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignWorkOrder}
                    onChange={(e) => setAssignWorkOrder(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-bold text-amber-300">Auto-Generate Maintenance Work Order for Dam</span>
                </label>

                {assignWorkOrder && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Work Order Priority</label>
                    <select
                      value={workOrderPriority}
                      onChange={(e) => setWorkOrderPriority(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="CRITICAL">CRITICAL (Emergency Response)</option>
                      <option value="HIGH">HIGH (Standard Maintenance)</option>
                      <option value="MEDIUM">MEDIUM (Scheduled Check)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Authority Notes / Remarks */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Official Remarks for Public Citizen View</label>
                <textarea
                  rows={3}
                  placeholder="Enter official authority remarks, engineering assessment, or dispatched maintenance crew details..."
                  value={authorityNotes}
                  onChange={(e) => setAuthorityNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Completion Photo URL / File Upload */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Verified Resolution Proof Photo (Required for RESOLVED status)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter photo URL or upload file..."
                    value={resolutionPhotoUrl}
                    onChange={(e) => setResolutionPhotoUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="file"
                    ref={resolutionFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleResolutionFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => resolutionFileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg border border-slate-700 flex items-center space-x-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
                {resolutionPhotoUrl && (
                  <div className="mt-2 flex items-center space-x-2">
                    <ImageWithFallback
                      src={resolutionPhotoUrl}
                      alt="Resolution Proof Preview"
                      className="h-20 w-32 object-cover rounded-lg border border-emerald-500/50 shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setResolutionPhotoUrl('')}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={savingAction}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                {savingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publish Official Action & Response</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
