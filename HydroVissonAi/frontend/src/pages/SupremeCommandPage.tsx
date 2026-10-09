import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Globe, MapPin, Layers, Award, Star, Search, RefreshCw, 
  ChevronRight, Building, AlertTriangle, Send, CheckCircle2, Eye, Info, 
  FileText, Radio, Camera, Filter, X, Lock, Sparkles 
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SupremeService } from '../services/api';
import { SupremeHierarchyResponse, SupremeDamSummary, SupremeDamDossier, StateHierarchy } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const SupremeCommandPage: React.FC = () => {
  const [hierarchyData, setHierarchyData] = useState<SupremeHierarchyResponse | null>(null);
  const [damsList, setDamsList] = useState<SupremeDamSummary[]>([]);
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [loadingDams, setLoadingDams] = useState(true);
  
  // Selected Dam Dossier Modal state
  const [activeDossierDamId, setActiveDossierDamId] = useState<number | null>(null);
  const [dossierData, setDossierData] = useState<SupremeDamDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Command Directive Form State
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [directiveCommand, setDirectiveCommand] = useState('');
  const [directivePriority, setDirectivePriority] = useState('HIGH');
  const [submittingDirective, setSubmittingDirective] = useState(false);

  // Rating Submission State
  const [selectedRating, setSelectedRating] = useState(4.5);
  const [selectedGrade, setSelectedGrade] = useState('A');
  const [ratingComments, setRatingComments] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Fetch Hierarchy
  const loadHierarchy = async () => {
    setLoadingHierarchy(true);
    try {
      const data = await SupremeService.getHierarchy();
      setHierarchyData(data);
    } catch (err) {
      console.error('Failed to load Supreme hierarchy:', err);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  // Fetch Dams
  const loadDams = async () => {
    setLoadingDams(true);
    try {
      const params: any = {};
      if (selectedState !== 'ALL') params.state = selectedState;
      if (selectedDistrict !== 'ALL') params.district = selectedDistrict;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await SupremeService.getDams(params);
      setDamsList(data);
    } catch (err) {
      console.error('Failed to load supreme dams:', err);
    } finally {
      setLoadingDams(false);
    }
  };

  // Open Dam Dossier
  const openDamDossier = async (damId: number) => {
    setActiveDossierDamId(damId);
    setLoadingDossier(true);
    setDossierData(null);
    try {
      const data = await SupremeService.getDamDossier(damId);
      setDossierData(data);
      setSelectedRating(data.dam.supreme_rating || 4.5);
      setSelectedGrade(data.dam.rating_grade || 'A');
      setRatingComments(data.dam.rating_comments || '');
    } catch (err) {
      console.error('Failed to load dam dossier:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Issue Directive
  const handleIssueDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDossierDamId || !directiveTitle.trim() || !directiveCommand.trim()) return;

    setSubmittingDirective(true);
    try {
      await SupremeService.issueDirective(activeDossierDamId, {
        title: directiveTitle,
        command_text: directiveCommand,
        priority: directivePriority,
      });
      setDirectiveTitle('');
      setDirectiveCommand('');
      // Refresh Dossier & Dams
      await openDamDossier(activeDossierDamId);
      loadDams();
      loadHierarchy();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to issue directive.');
    } finally {
      setSubmittingDirective(false);
    }
  };

  // Submit Rating
  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDossierDamId) return;

    setSubmittingRating(true);
    try {
      await SupremeService.submitRating(activeDossierDamId, {
        rating: selectedRating,
        grade: selectedGrade,
        comments: ratingComments,
      });
      await openDamDossier(activeDossierDamId);
      loadDams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update safety rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  useEffect(() => {
    loadDams();
  }, [selectedState, selectedDistrict, selectedCategory, searchQuery]);

  // Leaflet map ref inside Dossier Modal
  const dossierMapRef = React.useRef<HTMLDivElement>(null);
  const dossierMapInstance = React.useRef<L.Map | null>(null);

  useEffect(() => {
    if (!dossierData || !dossierMapRef.current) return;

    const lat = dossierData.dam.latitude || 22.2847;
    const lng = dossierData.dam.longitude || 76.4714;

    if (!dossierMapInstance.current) {
      const map = L.map(dossierMapRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const damIcon = L.divIcon({
        html: `<div class="w-8 h-8 rounded-lg bg-slate-900 border-2 border-amber-400 shadow-2xl flex items-center justify-center text-amber-300 font-bold text-sm">🏛️</div>`,
        className: 'supreme-dam-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([lat, lng], { icon: damIcon })
        .bindPopup(`<b>${dossierData.dam.name}</b><br/>${dossierData.dam.district}, ${dossierData.dam.state}`)
        .addTo(map);

      dossierMapInstance.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      dossierMapInstance.current.setView([lat, lng], 13);
      setTimeout(() => {
        dossierMapInstance.current?.invalidateSize();
      }, 200);
    }

    return () => {
      if (dossierMapInstance.current) {
        dossierMapInstance.current.remove();
        dossierMapInstance.current = null;
      }
    };
  }, [dossierData?.dam.id]);

  const availableDistricts = selectedState !== 'ALL'
    ? (hierarchyData?.states.find((s) => s.state === selectedState)?.districts || [])
    : [];

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      {/* Supreme Command Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-amber-500/30 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center justify-center pr-8">
          <ShieldAlert className="w-80 h-80 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                <Lock className="w-3 h-3" />
                <span>RESTRICTED ACCESS PORTAL &bull; SUPREME COMMAND HQ</span>
              </span>
              <span className="bg-indigo-950 border border-indigo-700 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                NATIONAL REGISTRY & INTERVENTION
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>National Dam Safety Authority (NDSA) Command Portal</span>
            </h1>

            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Hierarchical state & district dam monitoring, live web-reported issue auditing, photogrammetric dam dossiers, OpenStreetMap satellite spatial inspection, and binding executive command directives.
            </p>
          </div>

          {/* Fixed Credentials Info Badge */}
          <div className="bg-slate-950/90 border border-amber-500/40 p-3.5 rounded-xl shadow-xl space-y-1.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 border-b border-slate-800 pb-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>DEDICATED SUPREME CREDENTIALS</span>
            </div>
            <div className="font-mono text-[11px] space-y-0.5 text-slate-300">
              <div>Email: <strong className="text-amber-300">supreme.command@hydrovision.gov.in</strong></div>
              <div>Password: <strong className="text-amber-300">SupremeCommand#2026!</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <span className="text-slate-400 text-[11px] uppercase font-semibold block">Monitored States</span>
          <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
            {hierarchyData?.summary.total_states || 0}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <span className="text-slate-400 text-[11px] uppercase font-semibold block">Total Registered Dams</span>
          <span className="text-2xl font-bold text-white font-mono mt-1 block">
            {hierarchyData?.summary.total_dams || 0}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <span className="text-slate-400 text-[11px] uppercase font-semibold block">Major Dam Facilities</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
            {hierarchyData?.summary.major_dams || 0}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <span className="text-slate-400 text-[11px] uppercase font-semibold block">Minor & Medium Dams</span>
          <span className="text-2xl font-bold text-indigo-400 font-mono mt-1 block">
            {hierarchyData?.summary.minor_dams || 0}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <span className="text-slate-400 text-[11px] uppercase font-semibold block">Web-Reported Alerts</span>
          <span className="text-2xl font-bold text-rose-400 font-mono mt-1 block">
            {hierarchyData?.summary.active_alerts || 0}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <span className="text-slate-400 text-[11px] uppercase font-semibold block">Directives Issued</span>
          <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
            {hierarchyData?.summary.issued_directives || 0}
          </span>
        </div>
      </div>

      {/* STATE SELECTION HIERARCHY GRID (LEVEL 1) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Step 1: State-Wise National Dam Distribution</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any Indian State to filter major and minor hydro facilities and district breakups.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectedState('ALL'); setSelectedDistrict('ALL'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedState === 'ALL'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All States ({hierarchyData?.summary.total_dams || 0})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {hierarchyData?.states.map((st) => {
            const isSel = selectedState === st.state;
            return (
              <div
                key={st.state}
                onClick={() => {
                  setSelectedState(st.state);
                  setSelectedDistrict('ALL');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSel
                    ? 'bg-blue-950/80 border-blue-400 text-white ring-2 ring-blue-500/50 shadow-xl'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs truncate">{st.state}</span>
                  <span className="text-[10px] font-mono font-bold bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded">
                    {st.total_dams} Dams
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Major / Minor:</span>
                    <span className="font-mono text-slate-200">{st.major_dams} / {st.minor_dams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Districts:</span>
                    <span className="font-mono text-slate-200">{st.districts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Cap:</span>
                    <span className="font-mono text-cyan-400 font-semibold">{st.total_storage_mcm} MCM</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DISTRICT FILTER & DAM SELECTION GRID (LEVEL 2) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              <span>Step 2: District Filter & Major/Minor Dam Dossiers</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any dam record to view technical specs, real photos, OpenStreetMap satellite map, registered issues, and issue commander directives.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search dam, code, basin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* District Selector */}
            {selectedState !== 'ALL' && (
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Districts in {selectedState}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

            {/* Category Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Categories (Major & Minor)</option>
              <option value="MAJOR">Major Dams Only</option>
              <option value="MINOR">Minor / Medium Dams Only</option>
            </select>
          </div>
        </div>

        {/* Dams List / Grid */}
        {loadingDams ? (
          <div className="h-48 flex items-center justify-center space-x-2 text-slate-400 text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span>Fetching National Dam Registry Records...</span>
          </div>
        ) : damsList.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="font-bold text-slate-200">No dams found for selected filters.</p>
            <p className="text-[11px] text-slate-500">Try clearing state/district filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {damsList.map((d) => (
              <div
                key={d.id}
                onClick={() => openDamDossier(d.id)}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 cursor-pointer transition-all shadow-lg space-y-3 group"
              >
                <div className="flex justify-between items-start border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded">
                        {d.code}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        d.dam_category === 'MAJOR' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {d.dam_category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mt-1.5">
                      {d.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{d.district}, {d.state}</span>
                    </p>
                  </div>

                  {/* Rating Grade Badge */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 font-bold text-xs px-2 py-1 bg-amber-950/80 text-amber-300 border border-amber-700 rounded-lg">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{d.supreme_rating}</span>
                      <span className="text-[10px] font-mono text-slate-400">({d.rating_grade})</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Structure Type</span>
                    <span className="font-semibold truncate block">{d.dam_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Height / Length</span>
                    <span className="font-mono">{d.height_meters}m / {d.length_meters || 0}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Storage Capacity</span>
                    <span className="font-mono text-cyan-400 font-bold">{d.storage_capacity_mcm || 0} MCM</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Registered Issues</span>
                    <span className={`font-mono font-bold ${d.active_issues_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {d.active_issues_count} Active
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-[10px] text-slate-400">Engineer: <strong className="text-slate-200">{d.engineer_in_charge}</strong></span>
                  <span className="text-blue-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    <span>Inspect Dossier</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DAM DOSSIER MODAL (LEVEL 3) */}
      {activeDossierDamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-6 text-slate-100 font-sans my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                    {dossierData?.dam.code}
                  </span>
                  <span className="bg-indigo-950 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-800 uppercase">
                    {dossierData?.dam.dam_category} DAM DOSSIER
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>{dossierData?.dam.name || 'Dam Dossier'}</span>
                </h2>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{dossierData?.dam.district}, {dossierData?.dam.state} &bull; Coordinates: {dossierData?.dam.latitude}° N, {dossierData?.dam.longitude}° E</span>
                </p>
              </div>

              <button
                onClick={() => setActiveDossierDamId(null)}
                className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingDossier || !dossierData ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs font-mono">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <span>Compiling High-Resolution Dam Dossier & Spatial Assets...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Photo Gallery & Map Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Photo Gallery */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Camera className="w-4 h-4" />
                      <span>Infrastructure Asset Photo Dossier</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2 h-56 rounded-xl overflow-hidden border border-slate-800">
                      {dossierData.dam.photos.slice(0, 3).map((url, i) => (
                        <ImageWithFallback
                          key={i}
                          src={url}
                          alt={`${dossierData.dam.name} Photo ${i + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Leaflet OpenStreetMap Satellite GIS View */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      <span>OpenStreetMap & Satellite Location View</span>
                    </h3>
                    <div
                      ref={dossierMapRef}
                      className="w-full h-56 rounded-xl border border-slate-800 overflow-hidden shadow-inner z-10"
                    />
                  </div>
                </div>

                {/* Technical Parameters & Historical Background */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Technical Specs */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span>Technical Specs & Personnel</span>
                    </h4>
                    <div className="space-y-2 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dam Height:</span>
                        <span className="font-bold font-mono">{dossierData.dam.height_meters} meters</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Crest Length:</span>
                        <span className="font-bold font-mono">{dossierData.dam.length_meters || 0} meters</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gross Storage:</span>
                        <span className="font-bold font-mono text-cyan-400">{dossierData.dam.storage_capacity_mcm} MCM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">River Basin:</span>
                        <span className="font-semibold">{dossierData.dam.river_basin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Commission Year:</span>
                        <span className="font-mono text-amber-300 font-bold">{dossierData.dam.commission_year}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-2">
                        <span className="text-slate-400">Operating Agency:</span>
                        <span className="font-semibold text-slate-100">{dossierData.dam.operator_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chief Engineer:</span>
                        <span className="font-semibold text-emerald-400">{dossierData.dam.engineer_in_charge}</span>
                      </div>
                    </div>
                  </div>

                  {/* Construction History Summary */}
                  <div className="lg:col-span-2 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Construction History & Strategic Overview</span>
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {dossierData.dam.history_summary}
                    </p>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Current Operational Status:</span>
                      <span className="px-2.5 py-0.5 rounded font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        🟢 {dossierData.dam.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registered Web Issues & Alerts */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Registered Web Issues & Active Structural Alerts</span>
                    </span>
                    <span className="font-mono text-rose-400 font-bold">
                      {dossierData.registered_issues.total_defects} Total Defects ({dossierData.registered_issues.critical_defects} High/Critical)
                    </span>
                  </h4>

                  {dossierData.registered_issues.alerts_list.length === 0 ? (
                    <div className="text-slate-400 py-2 text-[11px]">No active web alerts logged for this facility.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {dossierData.registered_issues.alerts_list.map((alt) => (
                        <div key={alt.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-200">{alt.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            {alt.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* COMMAND DIRECTIVE INTERVENTION & RATING PANEL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
                  {/* Issue Directive Form */}
                  <form onSubmit={handleIssueDirective} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-amber-300 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-amber-400" />
                      <span>Issue Executive Command Directive</span>
                    </h4>

                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Directive Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Mandatory Spillway Gate Opening Test"
                        value={directiveTitle}
                        onChange={(e) => setDirectiveTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Command Instructions</label>
                      <textarea
                        rows={3}
                        placeholder="Enter binding operational command instructions for field dam engineers..."
                        value={directiveCommand}
                        onChange={(e) => setDirectiveCommand(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <select
                        value={directivePriority}
                        onChange={(e) => setDirectivePriority(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-bold focus:outline-none"
                      >
                        <option value="URGENT">URGENT PRIORITY</option>
                        <option value="HIGH">HIGH PRIORITY</option>
                        <option value="MEDIUM">MEDIUM PRIORITY</option>
                        <option value="ROUTINE">ROUTINE</option>
                      </select>

                      <button
                        type="submit"
                        disabled={submittingDirective}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-colors flex items-center gap-1.5"
                      >
                        {submittingDirective ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Issue Command Directive</span>
                      </button>
                    </div>
                  </form>

                  {/* Submit Safety Rating Panel */}
                  <form onSubmit={handleSubmitRating} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-emerald-300 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Submit Supreme Safety Rating & Evaluation</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Star Score (1.0 - 5.0)</label>
                        <input
                          type="number"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={selectedRating}
                          onChange={(e) => setSelectedRating(parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-amber-300 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Safety Grade</label>
                        <select
                          value={selectedGrade}
                          onChange={(e) => setSelectedGrade(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-emerald-400 focus:outline-none"
                        >
                          <option value="A+">Grade A+ (Optimal Safety)</option>
                          <option value="A">Grade A (Satisfactory)</option>
                          <option value="B">Grade B (Minor Maintenance Needed)</option>
                          <option value="C">Grade C (Heightened Attention)</option>
                          <option value="D">Grade D (Critical Intervention Required)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Evaluation Comments</label>
                      <input
                        type="text"
                        placeholder="e.g. Outstanding structural compliance under NDSA audit..."
                        value={ratingComments}
                        onChange={(e) => setRatingComments(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submittingRating}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors flex items-center gap-1.5"
                      >
                        {submittingRating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                        <span>Update Official Rating</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Issued Directives History Log */}
                {dossierData.directives.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-2">
                      Active Supreme Command Directives Log ({dossierData.directives.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {dossierData.directives.map((dir) => (
                        <div key={dir.id} className="p-3 bg-slate-900 rounded-lg border border-amber-500/30 space-y-1">
                          <div className="flex justify-between items-center font-mono">
                            <span className="font-bold text-amber-300">{dir.directive_code} &bull; {dir.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              {dir.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{dir.command_text}</p>
                          <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                            <span>Issued By: {dir.issued_by_name}</span>
                            <span>Date: {new Date(dir.issued_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
