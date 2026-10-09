import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PublicGrievanceService } from '../services/api';
import { PublicComplaint, DamPublicRef, PublicComplaintCreate } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { 
  Building2, ShieldAlert, MapPin, Camera, Search, CheckCircle2, 
  Clock, AlertTriangle, AlertCircle, Sparkles, FileText, Phone, 
  Mail, ArrowRight, ExternalLink, RefreshCw, Copy, Printer, Check,
  Upload, X, Video, Image as ImageIcon
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'SEEPAGE', label: 'Dam Seepage / Weeping', icon: '💧', risk: 'HIGH', desc: 'Water leakage through embankment, dam body, or abutments' },
  { value: 'STRUCTURAL_CRACK', label: 'Structural Concrete Crack', icon: '🧱', risk: 'HIGH', desc: 'Fissures, spalling, or deep cracks on dam face or crest' },
  { value: 'SPILLWAY_MALFUNCTION', label: 'Spillway & Gate Issue', icon: '🌊', risk: 'CRITICAL', desc: 'Stilling basin damage, gate obstruction, or cavitation' },
  { value: 'FLOODING_RISK', label: 'Flooding & Overflow Hazard', icon: '⚠️', risk: 'CRITICAL', desc: 'Riverbank erosion, abnormal discharge, downstream threat' },
  { value: 'SILTATION', label: 'Siltation & Debris Accumulation', icon: '🪵', risk: 'MEDIUM', desc: 'Reservoir sedimentation or intake gate clogging' },
  { value: 'ENCROACHMENT', label: 'Buffer Zone Encroachment', icon: '🚧', risk: 'MEDIUM', desc: 'Unauthorized construction near dam safety zone' },
  { value: 'OTHER', label: 'General Water Infrastructure Issue', icon: '🛠️', risk: 'LOW', desc: 'General observation or minor maintenance requirement' },
];



export const PublicGrievancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'report' | 'track'>('report');
  const [dams, setDams] = useState<DamPublicRef[]>([]);
  const [loadingDams, setLoadingDams] = useState(true);

  // Form State
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [selectedDamId, setSelectedDamId] = useState<number | ''>('');
  const [category, setCategory] = useState('SEEPAGE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number>(30.3751); // Default Tehri area
  const [longitude, setLongitude] = useState<number>(78.4852);
  const [locationAddress, setLocationAddress] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');

  // Spot Camera & Upload Refs & State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<PublicComplaint | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Tracking State
  const [trackSearchCode, setTrackSearchCode] = useState('');
  const [trackingComplaint, setTrackingComplaint] = useState<PublicComplaint | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Map Ref & Satellite Tile Provider State for Report tab
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [tileProvider, setTileProvider] = useState<'satellite' | 'street' | 'terrain'>('satellite');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  useEffect(() => {
    loadPublicDams();
  }, []);

  const loadPublicDams = async () => {
    try {
      const data = await PublicGrievanceService.getPublicDams();
      setDams(data);
    } catch (err) {
      console.error('Failed to load public dams', err);
    } finally {
      setLoadingDams(false);
    }
  };

  // Helper: Extract numeric coordinates from text if formatted like "11.80502, 77.82298" or "(approx. 11.8050262°, 77.8229845°)"
  const parseCoordinatesFromText = (text: string): { lat: number; lng: number } | null => {
    if (!text) return null;
    const match = text.match(/(-?\d+\.\d+)\s*°?\s*,\s*(-?\d+\.\d+)\s*°?/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  };

  const handleLocationAddressChange = (val: string) => {
    setLocationAddress(val);
    const coords = parseCoordinatesFromText(val);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 1.2 });
        markerRef.current.setLatLng([coords.lat, coords.lng]);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      }
    }
  };

  const handleGeocodeSearch = async (queryToSearch?: string) => {
    const q = queryToSearch || locationAddress;
    if (!q || !q.trim()) return;

    setIsSearchingLocation(true);
    try {
      const cleanQ = q.replace(/\(approx\..*?\)/i, '').trim();
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = Number(parseFloat(first.lat).toFixed(5));
          const lng = Number(parseFloat(first.lon).toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          setLocationAddress(first.display_name || q);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.5 });
            markerRef.current.setLatLng([lat, lng]);
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
          }
        } else {
          alert(`Could not find GIS coordinates for "${cleanQ}". Try dropping the red pin directly on the map.`);
        }
      }
    } catch (err) {
      console.error('Geocoding search error:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          setLocationAddress(data.display_name);
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  };

  // Leaflet Map Initialization for Location Picker (Esri World Imagery Real View + OSM Vector + Topo)
  useEffect(() => {
    if (activeTab !== 'report') return;

    const timer = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      if (!mapInstanceRef.current) {
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
        }

        const map = L.map(container, {
          center: [latitude, longitude],
          zoom: 13,
          zoomControl: true,
        });

        const pinIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; color:white; font-size:18px; font-weight:bold;">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([latitude, longitude], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const lat = Number(pos.lat.toFixed(5));
          const lng = Number(pos.lng.toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          fetchAddressFromCoords(lat, lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const lat = Number(e.latlng.lat.toFixed(5));
          const lng = Number(e.latlng.lng.toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          marker.setLatLng([lat, lng]);
          fetchAddressFromCoords(lat, lng);
        });

        mapInstanceRef.current = map;

        // ResizeObserver to ensure zero blank/black box glitches when layout resizes
        const resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(container);
      }

      const map = mapInstanceRef.current;
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();

        if (tileProvider === 'satellite') {
          // Esri Satellite Imagery + Boundaries and Place Names Overlay
          const satelliteLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { attribution: '&copy; Esri World Imagery &mdash; High-Resolution Satellite Real View', maxZoom: 19 }
          );
          const labelsLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            { attribution: '', maxZoom: 19, opacity: 0.85 }
          );
          layerGroupRef.current.addLayer(satelliteLayer);
          layerGroupRef.current.addLayer(labelsLayer);
        } else if (tileProvider === 'terrain') {
          const terrainLayer = L.tileLayer(
            'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            { attribution: '&copy; OpenTopoMap contributors', maxZoom: 17 }
          );
          layerGroupRef.current.addLayer(terrainLayer);
        } else {
          const streetLayer = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }
          );
          layerGroupRef.current.addLayer(streetLayer);
        }
      }

      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 600);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [activeTab, tileProvider]);

  // Synchronize Latitude & Longitude state changes to Map center and Marker
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Update pin position & fly to dam location when dam selection changes
  const handleDamSelectChange = (damIdVal: number | '') => {
    setSelectedDamId(damIdVal);
    if (damIdVal !== '') {
      const dam = dams.find(d => d.id === damIdVal);
      if (dam) {
        const lat = Number(dam.latitude.toFixed(5));
        const lng = Number(dam.longitude.toFixed(5));
        setLatitude(lat);
        setLongitude(lng);
        setLocationAddress(`${dam.name}, ${dam.district}, ${dam.state}, India`);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.5 });
          markerRef.current.setLatLng([lat, lng]);
          setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
        }
      }
    }
  };

  const addPhotoUrl = (url: string) => {
    if (url && !photoUrls.includes(url)) {
      setPhotoUrls([...photoUrls, url]);
      setCustomPhotoInput('');
    }
  };

  const removePhotoUrl = (url: string) => {
    setPhotoUrls(photoUrls.filter(u => u !== url));
  };

  // Device File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          addPhotoUrl(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset file input value
    e.target.value = '';
  };

  // Spot Camera Live Stream Handlers
  const startSpotCamera = async () => {
    setIsCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      // Fallback: trigger native mobile file camera
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
      } else {
        alert('Camera access unavailable. You can upload photo directly from your device storage.');
      }
      setIsCameraModalOpen(false);
    }
  };

  const stopSpotCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setIsCameraModalOpen(false);
  };

  const captureSpotPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      addPhotoUrl(photoDataUrl);
      stopSpotCamera();
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenName || !citizenPhone || !title || !description) {
      alert('Please complete all required fields (Name, Phone, Title, Description).');
      return;
    }

    setSubmitting(true);
    try {
      const payload: PublicComplaintCreate = {
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        citizen_email: citizenEmail || undefined,
        dam_id: selectedDamId !== '' ? Number(selectedDamId) : undefined,
        category,
        title,
        description,
        latitude,
        longitude,
        location_address: locationAddress || undefined,
        photo_urls_json: photoUrls
      };

      const result = await PublicGrievanceService.submitComplaint(payload);
      setSubmittedComplaint(result);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit grievance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackSearchCode.trim()) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackingComplaint(null);

    try {
      const result = await PublicGrievanceService.trackComplaint(trackSearchCode.trim());
      setTrackingComplaint(result);
    } catch (err: any) {
      setTrackingError(err.response?.data?.detail || `No grievance record found for code "${trackSearchCode}".`);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          fetchAddressFromCoords(lat, lng);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.5 });
            markerRef.current.setLatLng([lat, lng]);
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
          }
        },
        (err) => {
          alert('Could not access device GPS location: ' + err.message);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const copyTrackingCode = () => {
    if (submittedComplaint) {
      navigator.clipboard.writeText(submittedComplaint.tracking_code);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2500);
    }
  };

  const renderStatusTimeline = (status: string) => {
    const stages = [
      { key: 'SUBMITTED', label: '1. Submitted', desc: 'Citizen report received' },
      { key: 'UNDER_REVIEW', label: '2. Under Review', desc: 'Authority initial triage' },
      { key: 'INSPECTION_ASSIGNED', label: '3. Inspection Assigned', desc: 'Engineer dispatched' },
      { key: 'REPAIR_IN_PROGRESS', label: '4. Repair in Progress', desc: 'Work order active' },
      { key: 'RESOLVED', label: '5. Resolved', desc: 'Completed & verified' },
    ];

    const getStageIndex = (st: string) => {
      switch (st) {
        case 'SUBMITTED': return 0;
        case 'UNDER_REVIEW': return 1;
        case 'INSPECTION_ASSIGNED': return 2;
        case 'REPAIR_IN_PROGRESS': return 3;
        case 'RESOLVED': return 4;
        case 'REJECTED': return -1;
        default: return 0;
      }
    };

    const currentIndex = getStageIndex(status);

    if (status === 'REJECTED') {
      return (
        <div className="bg-rose-900/20 border border-rose-500/40 p-4 rounded-xl text-rose-300 flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
          <div>
            <div className="font-bold">Grievance Status: REJECTED BY AUTHORITY</div>
            <div className="text-xs text-rose-200 mt-0.5">This report was reviewed and marked as unverified or non-actionable by official dam safety authorities.</div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          {stages.map((st, idx) => {
            const isDone = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={st.key} className="flex md:flex-col items-center gap-3 flex-1 text-left md:text-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm transition-all ${
                  isCurrent 
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/40 animate-pulse'
                    : isDone 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}>
                  {isDone && !isCurrent ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <div>
                  <div className={`text-xs font-bold ${isCurrent ? 'text-amber-400' : isDone ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {st.label}
                  </div>
                  <div className="text-[11px] text-slate-400 hidden md:block">{st.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Hidden File Inputs for Device Storage & Mobile Camera */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={mobileCameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-govt-navy to-slate-900 border-b border-slate-800 py-5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded tracking-wider">
                PUBLIC PORTAL
              </span>
              <span className="text-slate-400 text-[10px] sm:text-xs font-semibold">NATIONAL WATER & DAM SAFETY INITIATIVE</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
              <span>Public Citizen Grievance & Incident Portal</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Report dam structural defects, seepage, water level hazards, or spillway anomalies directly to the Central Dam Safety Organisation (CDSO) with spatial auto-matching.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-5">
        {/* 2. Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'report'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>1. Submit New Report</span>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'track'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>2. Track Grievance Status</span>
          </button>
        </div>

        {/* --- TAB 1: SUBMIT GRIEVANCE REPORT --- */}
        {activeTab === 'report' && (
          <div>
            {submittedComplaint ? (
              /* Success Confirmation Box */
              <div className="max-w-3xl mx-auto bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-4">
                  <CheckCircle2 className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Grievance Report Successfully Filed</h2>
                    <p className="text-xs text-emerald-300 mt-0.5">Your incident report has been auto-logged into the CDSO Dam Safety System.</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Your Official Tracking Code</span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="font-mono text-2xl font-black text-amber-400 tracking-wider">
                      {submittedComplaint.tracking_code}
                    </span>
                    <button
                      onClick={copyTrackingCode}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center space-x-1.5 transition border border-slate-700 w-fit"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{copiedTracking ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400">Citizen Name:</span>
                      <div className="font-bold text-slate-200">{submittedComplaint.citizen_name}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Contact Phone:</span>
                      <div className="font-bold text-slate-200">{submittedComplaint.citizen_phone}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Matched Dam:</span>
                      <div className="font-bold text-amber-300">
                        {submittedComplaint.dam_name || 'Spatial Matching (Nearest Regional Dam)'} 
                        {submittedComplaint.distance_to_dam_km !== undefined && ` (${submittedComplaint.distance_to_dam_km} km away)`}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">AI Risk Assessment:</span>
                      <div className="font-extrabold text-rose-400">{submittedComplaint.ai_risk_score} / 100.0</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-between items-center">
                  <button
                    onClick={() => {
                      setSubmittedComplaint(null);
                      setTitle('');
                      setDescription('');
                      setPhotoUrls([]);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                  >
                    Submit Another Grievance
                  </button>

                  <button
                    onClick={() => {
                      setTrackSearchCode(submittedComplaint.tracking_code);
                      setActiveTab('track');
                      handleTrackSearch();
                    }}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow flex items-center space-x-1.5 transition"
                  >
                    <span>Track Status Live</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Report Submission Form */
              <form onSubmit={handleSubmitGrievance} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form Inputs (7 cols on desktop, full on phone) */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Category Selector */}
                  <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800">
                    <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3">
                      1. Select Issue Category
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CATEGORY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCategory(opt.value)}
                          className={`p-3 rounded-lg border text-left flex items-start space-x-2.5 transition ${
                            category === opt.value
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <div>
                            <div className="text-xs font-extrabold">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{opt.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dam Reference Selection */}
                  <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800">
                    <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                      2. Dam Infrastructure Reference (Optional Manual Selection)
                    </label>
                    <select
                      value={selectedDamId}
                      onChange={(e) => handleDamSelectChange(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Auto-detect Nearest Dam within 50km via Map Pin --</option>
                      {dams.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.state} - {d.district})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-2">
                      If left unselected, our spatial GIS engine will auto-link your pin location to the nearest national dam within 50km.
                    </p>
                  </div>

                  {/* Incident Details Form */}
                  <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                      3. Incident Details & Description
                    </h3>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Issue Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Concrete weeping observed near spillway gate 2"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Detailed Observation Description *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Describe exact visual symptoms, water color, flow rate, date observed, or any immediate downstream safety concerns..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Location Address / Landmark</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Mettur Dam, Tamil Nadu or paste coords (11.805, 77.822)"
                          value={locationAddress}
                          onChange={(e) => handleLocationAddressChange(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleGeocodeSearch()}
                          disabled={isSearchingLocation}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition shrink-0 cursor-pointer"
                        >
                          {isSearchingLocation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          <span>Locate on Map</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Photo & Evidence Attachment with Device Upload & Spot Camera */}
                  <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span>4. Visual Evidence & Photo Upload</span>
                      <Camera className="w-4 h-4 text-amber-400" />
                    </h3>

                    {/* Action Buttons for Direct Upload & Live Spot Camera */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={startSpotCamera}
                        className="py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow flex items-center justify-center space-x-2 transition"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Live Photo (Spot Camera)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 shadow flex items-center justify-center space-x-2 transition"
                      >
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>Upload Photo from Device</span>
                      </button>
                    </div>



                    {/* Custom URL Input */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Or paste custom photo URL..."
                        value={customPhotoInput}
                        onChange={(e) => setCustomPhotoInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => addPhotoUrl(customPhotoInput)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
                      >
                        Add Photo
                      </button>
                    </div>

                    {/* Attached Photo List Preview */}
                    {photoUrls.length > 0 && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">Attached Photos ({photoUrls.length}):</span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {photoUrls.map((url, idx) => (
                            <div key={idx} className="relative group">
                              <ImageWithFallback
                                src={url}
                                alt={`Proof ${idx + 1}`}
                                className="h-16 w-20 object-cover rounded-lg border border-amber-500/50"
                              />
                              <button
                                type="button"
                                onClick={() => removePhotoUrl(url)}
                                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Citizen Contact Info */}
                  <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                      5. Citizen Contact Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={citizenName}
                          onChange={(e) => setCitizenName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Mobile Phone Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={citizenPhone}
                          onChange={(e) => setCitizenPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Email Address (Optional for status updates)</label>
                        <input
                          type="email"
                          placeholder="your.email@example.com"
                          value={citizenEmail}
                          onChange={(e) => setCitizenEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Spatially Matching & Transmitting Report...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-5 h-5" />
                        <span>Submit Grievance to Dam Safety Authority</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: GIS Pin Location Picker (5 cols on desktop, stacked on phone) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800 lg:sticky lg:top-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                      <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <span>GIS Geo-Location Pin Drop</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span>Use My GPS</span>
                        </button>
                      </div>
                    </div>

                    {/* Satellite Real View vs Street Map vs Topo Toggle Bar */}
                    <div className="flex items-center justify-between mb-3 bg-slate-950 p-1.5 rounded-lg border border-slate-800 flex-wrap gap-2">
                      <span className="text-[11px] font-extrabold text-slate-400 pl-1 uppercase tracking-wider">GIS Map Layer:</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setTileProvider('satellite')}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            tileProvider === 'satellite'
                              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          🌐 Satellite Real View
                        </button>
                        <button
                          type="button"
                          onClick={() => setTileProvider('street')}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            tileProvider === 'street'
                              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          🗺️ Street Map
                        </button>
                        <button
                          type="button"
                          onClick={() => setTileProvider('terrain')}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            tileProvider === 'terrain'
                              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          ⛰️ Topo
                        </button>
                      </div>
                    </div>

                    {/* Quick Latitude / Longitude Numeric Input Controls */}
                    <div className="flex gap-2 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-800 items-center">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">GIS Coords:</span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={latitude}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setLatitude(val);
                              if (mapInstanceRef.current && markerRef.current) {
                                mapInstanceRef.current.panTo([val, longitude]);
                                markerRef.current.setLatLng([val, longitude]);
                              }
                            }
                          }}
                          placeholder="Latitude"
                          className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="number"
                          step="any"
                          value={longitude}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setLongitude(val);
                              if (mapInstanceRef.current && markerRef.current) {
                                mapInstanceRef.current.panTo([latitude, val]);
                                markerRef.current.setLatLng([latitude, val]);
                              }
                            }
                          }}
                          placeholder="Longitude"
                          className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                      Click anywhere on the interactive GIS satellite map or drag the red pin to mark exact incident location.
                    </p>

                    <div ref={mapContainerRef} className="h-72 sm:h-96 w-full rounded-xl border border-slate-800 overflow-hidden shadow-2xl z-0 relative bg-slate-950" />

                    <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-amber-400 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Spatial Matching Guarantee</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Citizen locations are automatically checked against all 10 national dam reservoirs to compute spatial distance and direct triage priority.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- TAB 2: TRACK GRIEVANCE STATUS --- */}
        {activeTab === 'track' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search Input Box */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                Enter Citizen Tracking Code
              </label>
              <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. GRV-2026-8942"
                    value={trackSearchCode}
                    onChange={(e) => setTrackSearchCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 font-mono tracking-wider focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  {trackingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Lookup Progress</span>
                </button>
              </form>

              {trackingError && (
                <div className="mt-4 p-3 bg-rose-900/30 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>{trackingError}</span>
                </div>
              )}
            </div>

            {/* Tracking Result Card */}
            {trackingComplaint && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 space-y-6 shadow-2xl">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xl font-black text-amber-400">{trackingComplaint.tracking_code}</span>
                      <span className="bg-slate-800 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-700">
                        {trackingComplaint.category}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">{trackingComplaint.title}</h2>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      trackingComplaint.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' :
                      trackingComplaint.status === 'REPAIR_IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                      trackingComplaint.status === 'INSPECTION_ASSIGNED' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {trackingComplaint.status.replace(/_/g, ' ')}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">Submitted: {new Date(trackingComplaint.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {/* 5-Stage Timeline */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Live Progress Timeline</h3>
                  {renderStatusTimeline(trackingComplaint.status)}
                </div>

                {/* Authority Official Response Section */}
                {trackingComplaint.authority_notes && (
                  <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-amber-500/40 space-y-3">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Building2 className="w-5 h-5" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">Official Dam Safety Authority Remarks</span>
                    </div>
                    <p className="text-sm text-slate-200 italic leading-relaxed">
                      "{trackingComplaint.authority_notes}"
                    </p>

                    {/* Completion Photo Proof if resolved */}
                    {trackingComplaint.resolution_photo_url && (
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <span className="text-xs font-extrabold text-emerald-400 block mb-2">Verified Repair Completion Photo:</span>
                        <ImageWithFallback
                          src={trackingComplaint.resolution_photo_url}
                          alt="Resolution Proof"
                          className="h-48 w-full max-w-md object-cover rounded-xl border border-emerald-500/50 shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Complaint Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400">Location Address:</span>
                    <div className="font-semibold text-slate-200">{trackingComplaint.location_address || 'Pin drop location'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Spatially Matched Dam:</span>
                    <div className="font-semibold text-amber-300">
                      {trackingComplaint.dam_name || 'Regional Dam Reference'} 
                      {trackingComplaint.distance_to_dam_km !== undefined && ` (${trackingComplaint.distance_to_dam_km} km away)`}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-400">Citizen Description:</span>
                    <div className="text-slate-300 mt-1">{trackingComplaint.description}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spot Camera Webcam Live Stream Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-sm">
                <Camera className="w-5 h-5 animate-pulse" />
                <span>SPOT CAMERA &bull; LIVE VIEW</span>
              </div>
              <button
                type="button"
                onClick={stopSpotCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Stream Container */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viewfinder Overlay Crosshairs */}
              <div className="absolute inset-0 pointer-events-none border-2 border-amber-400/40 rounded-xl flex items-center justify-center">
                <div className="w-12 h-12 border border-amber-400/60 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Point your camera at the structural defect or seepage area and press Snap Photo.
            </p>

            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={stopSpotCamera}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureSpotPhoto}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
