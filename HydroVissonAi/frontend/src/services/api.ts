import axios from 'axios';
import { 
  User, Dam, DamZone, Inspection, DroneDataset, DroneImage, Defect, 
  RiskAssessment, WorkOrder, Report, Alert, AuditLog, UserRole, DefectSeverity, DefectStatus,
  ModelStatus, AIJob, AIDetection, BatchAnalysisSummary,
  DamGIS, DefectGeoJSONFeature, DefectGeoJSONFeatureCollection,
  DigitalTwinSummary, DigitalTwinModel, DigitalTwinDefectOverlay,
  HistoricalInspectionTimelineItem, HistoricalComparisonResponse, DefectHistoryResponse, DamHistoricalSummaryResponse,
  PublicComplaint, PublicComplaintCreate, DamPublicRef
} from '../types';


const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to attach Authorization JWT Header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hydrovision_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const DamService = {
  getDams: async (search?: string): Promise<Dam[]> => {
    const res = await api.get('/dams', { params: { search } });
    return res.data;
  },
  getDam: async (id: number): Promise<Dam> => {
    const res = await api.get(`/dams/${id}`);
    return res.data;
  },
  createDam: async (damData: Partial<Dam>): Promise<Dam> => {
    const res = await api.post('/dams', damData);
    return res.data;
  },
  getDamZones: async (damId: number): Promise<DamZone[]> => {
    const res = await api.get(`/dams/${damId}/zones`);
    return res.data;
  },
  addZone: async (damId: number, zoneData: Partial<DamZone>): Promise<DamZone> => {
    const res = await api.post(`/dams/${damId}/zones`, zoneData);
    return res.data;
  },
  simulateInundation: async (damId: number, payload: { water_level_m?: number; discharge_cusecs?: number; gate_open_percent?: number; rainfall_intensity_mm_hr?: number }) => {
    const res = await api.post(`/dams/${damId}/simulate-inundation`, payload);
    return res.data;
  },
};

export const InspectionService = {
  getInspections: async (damId?: number): Promise<Inspection[]> => {
    const res = await api.get('/inspections', { params: { dam_id: damId } });
    return res.data;
  },
  getInspection: async (id: number): Promise<Inspection> => {
    const res = await api.get(`/inspections/${id}`);
    return res.data;
  },
  createInspection: async (data: { dam_id: number; inspection_type?: string; inspection_date?: string; weather_conditions?: string }): Promise<Inspection> => {
    const res = await api.post('/inspections', data);
    return res.data;
  },
  updateInspectionStatus: async (id: number, status: string): Promise<Inspection> => {
    const res = await api.patch(`/inspections/${id}/status`, null, { params: { status_str: status } });
    return res.data;
  },
};

export const UploadService = {
  getDatasets: async (inspectionId: number): Promise<DroneDataset[]> => {
    const res = await api.get(`/uploads/inspections/${inspectionId}/datasets`);
    return res.data;
  },
  uploadImage: async (inspectionId: number, file: File, datasetName?: string): Promise<DroneImage> => {
    const formData = new FormData();
    formData.append('files', file);
    if (datasetName) formData.append('dataset_name', datasetName);
    const res = await api.post(`/uploads/inspections/${inspectionId}/upload`, formData);
    return res.data;
  },
  uploadDroneData: async (inspectionId: number, files: File[], datasetName?: string): Promise<DroneDataset> => {
    const formData = new FormData();
    formData.append('dataset_name', datasetName || 'Drone Surface Survey');
    files.forEach((file) => formData.append('files', file));
    const res = await api.post(`/uploads/inspections/${inspectionId}/upload-batch`, formData);
    return res.data;
  },
  getDataset: async (inspectionId: number): Promise<DroneDataset | null> => {
    const res = await api.get(`/uploads/inspections/${inspectionId}/datasets`);
    const datasets = res.data;
    return Array.isArray(datasets) && datasets.length > 0 ? datasets[0] : null;
  },
  getInspectionMedia: async (inspectionId: number): Promise<DroneImage[]> => {
    const res = await api.get(`/uploads/inspections/${inspectionId}/media`);
    return res.data;
  },
  getMediaDetail: async (mediaId: number): Promise<DroneImage> => {
    const res = await api.get(`/uploads/media/${mediaId}`);
    return res.data;
  },
  georeferenceMedia: async (mediaId: number, coords: { latitude: number; longitude: number; altitude?: number }): Promise<DroneImage> => {
    const res = await api.patch(`/uploads/media/${mediaId}/georeference`, coords);
    return res.data;
  },
  deleteMedia: async (mediaId: number): Promise<void> => {
    await api.delete(`/uploads/media/${mediaId}`);
  },
};

export const AIService = {
  getModelStatus: async (): Promise<ModelStatus> => {
    const res = await api.get('/ai/model/status');
    return res.data;
  },
  analyzeInspection: async (inspectionId: number): Promise<any> => {
    const res = await api.post(`/ai/inspections/${inspectionId}/analyze`);
    return res.data;
  },
  analyzeInspectionBatch: async (inspectionId: number): Promise<BatchAnalysisSummary> => {
    const res = await api.post(`/ai/inspections/${inspectionId}/analyze`);
    return res.data;
  },
  analyzeMedia: async (mediaId: number): Promise<AIDetection[]> => {
    const res = await api.post(`/ai/media/${mediaId}/analyze`);
    return res.data;
  },
  getInspectionResults: async (inspectionId: number): Promise<AIDetection[]> => {
    const res = await api.get(`/ai/inspections/${inspectionId}/results`);
    return res.data;
  },
  getMediaResults: async (mediaId: number): Promise<AIDetection[]> => {
    const res = await api.get(`/ai/media/${mediaId}/results`);
    return res.data;
  },
  getJob: async (jobId: number): Promise<AIJob> => {
    const res = await api.get(`/ai/jobs/${jobId}`);
    return res.data;
  },
  reviewDetection: async (
    detectionId: number,
    data: {
      action: 'ACCEPT' | 'REJECT' | 'EDIT';
      defect_type?: string;
      severity?: DefectSeverity;
      bbox_x_min?: number;
      bbox_y_min?: number;
      bbox_x_max?: number;
      bbox_y_max?: number;
      engineer_comments?: string;
    }
  ): Promise<AIDetection> => {
    const res = await api.patch(`/ai/detections/${detectionId}/review`, data);
    return res.data;
  },
  queryCopilot: async (query: string) => {
    const res = await api.post('/ai/copilot/query', { query });
    return res.data;
  },
};

export const DefectService = {
  getDefects: async (params?: { dam_id?: number; inspection_id?: number; status?: string; severity?: string }): Promise<Defect[]> => {
    const res = await api.get('/defects', { params });
    return res.data;
  },
  getDefect: async (id: number): Promise<Defect> => {
    const res = await api.get(`/defects/${id}`);
    return res.data;
  },
  verifyDefect: async (id: number, data: { defect_type?: string; severity?: DefectSeverity; engineer_comments?: string; status?: DefectStatus; estimated_length_mm?: number }): Promise<Defect> => {
    const res = await api.patch(`/defects/${id}/verify`, data);
    return res.data;
  },
  getEvolution: async (defectId: number) => {
    const res = await api.get(`/defects/${defectId}/evolution`);
    return res.data;
  },
};

export const GISService = {
  getDamGIS: async (damId: number): Promise<DamGIS> => {
    const res = await api.get(`/gis/dams/${damId}`);
    return res.data;
  },
  getInspectionDefectsGIS: async (inspectionId: number): Promise<DefectGeoJSONFeatureCollection> => {
    const res = await api.get(`/gis/inspections/${inspectionId}/defects`);
    return res.data;
  },
  getDefectsGIS: async (params?: {
    dam_id?: number;
    inspection_id?: number;
    defect_type?: string;
    severity?: string;
    status?: string;
    coordinate_source?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<DefectGeoJSONFeatureCollection> => {
    const res = await api.get('/gis/defects', { params });
    return res.data;
  },
  getDefectGIS: async (defectId: number): Promise<DefectGeoJSONFeature> => {
    const res = await api.get(`/gis/defects/${defectId}`);
    return res.data;
  },
  updateDefectLocation: async (
    defectId: number,
    data: {
      latitude: number;
      longitude: number;
      location_precision?: string;
      coordinate_accuracy_meters?: number;
      reason?: string;
    }
  ): Promise<DefectGeoJSONFeature> => {
    const res = await api.patch(`/gis/defects/${defectId}/location`, data);
    return res.data;
  },
};

export const DigitalTwinService = {
  getDamSummary: async (damId: number): Promise<DigitalTwinSummary> => {
    const res = await api.get(`/digital-twin/dams/${damId}`);
    return res.data;
  },
  getModels: async (damId: number): Promise<DigitalTwinModel[]> => {
    const res = await api.get(`/digital-twin/dams/${damId}/models`);
    return res.data;
  },
  getModel: async (modelId: number): Promise<DigitalTwinModel> => {
    const res = await api.get(`/digital-twin/models/${modelId}`);
    return res.data;
  },
  uploadModel: async (damId: number, formData: FormData): Promise<DigitalTwinModel> => {
    const res = await api.post(`/digital-twin/dams/${damId}/models`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  activateModel: async (modelId: number): Promise<{ model_id: number; dam_id: number; is_active: boolean; message: string }> => {
    const res = await api.patch(`/digital-twin/models/${modelId}/activate`);
    return res.data;
  },
  getDefectOverlays: async (damId: number): Promise<DigitalTwinDefectOverlay[]> => {
    const res = await api.get(`/digital-twin/dams/${damId}/defects`);
    return res.data;
  },
  generateParametricModel: async (damId: number, formData: FormData): Promise<DigitalTwinModel> => {
    const res = await api.post(`/digital-twin/dams/${damId}/generate`, formData);
    return res.data;
  },
};

export const RiskService = {
  calculateRisk: async (damId: number): Promise<RiskAssessment> => {
    const res = await api.get(`/risk/${damId}`);
    return res.data;
  },
};

export const PredictionService = {
  getPrediction: async (damId: number) => {
    const res = await api.get(`/prediction/${damId}`);
    return res.data;
  },
};

export const MaintenanceService = {
  getWorkOrders: async (damId?: number, status?: string): Promise<WorkOrder[]> => {
    const res = await api.get('/maintenance/work-orders', { params: { dam_id: damId, status } });
    return res.data;
  },
  createWorkOrder: async (data: { dam_id: number; defect_id: number; priority?: string; assigned_team?: string; description: string; recommended_action?: string }): Promise<WorkOrder> => {
    const res = await api.post('/maintenance/work-orders', data);
    return res.data;
  },
  updateWorkOrder: async (woId: number, data: { status?: string; repair_notes?: string; assigned_team?: string }): Promise<WorkOrder> => {
    const res = await api.patch(`/maintenance/work-orders/${woId}`, data);
    return res.data;
  },
  requestReinspection: async (workOrderId: number, findingsNotes?: string) => {
    const res = await api.post('/maintenance/reinspection', null, { params: { work_order_id: workOrderId, findings_notes: findingsNotes } });
    return res.data;
  },
};

export const ReportService = {
  getReports: async (damId?: number): Promise<Report[]> => {
    const res = await api.get('/reports', { params: { dam_id: damId } });
    return res.data;
  },
  generateReport: async (damId: number, inspectionId?: number): Promise<Report> => {
    const res = await api.post('/reports/generate', null, { params: { dam_id: damId, inspection_id: inspectionId } });
    return res.data;
  },
  downloadReport: async (reportId: number, reportCode: string): Promise<void> => {
    const res = await api.get(`/reports/download/${reportId}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportCode}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const AlertService = {
  getAlerts: async (unreadOnly?: boolean): Promise<Alert[]> => {
    const res = await api.get('/alerts', { params: { unread_only: unreadOnly } });
    return res.data;
  },
  markRead: async (id: number): Promise<Alert> => {
    const res = await api.patch(`/alerts/${id}/read`);
    return res.data;
  },
};

export const AuditService = {
  getAuditTrail: async (): Promise<AuditLog[]> => {
    const res = await api.get('/audit');
    return res.data;
  },
};

export const HistoricalService = {
  getDamInspectionTimeline: async (damId: number): Promise<{ dam_id: number; dam_name: string; total_inspections: number; timeline: HistoricalInspectionTimelineItem[] }> => {
    const res = await api.get(`/historical/dams/${damId}/inspections`);
    return res.data;
  },
  compareInspections: async (inspectionId: number, historicalInspectionId?: number, matchDistanceMeters: number = 10.0): Promise<HistoricalComparisonResponse> => {
    const res = await api.get(`/historical/inspections/${inspectionId}/compare`, {
      params: { historical_inspection_id: historicalInspectionId, match_distance_meters: matchDistanceMeters }
    });
    return res.data;
  },
  getDefectHistory: async (defectId: number): Promise<DefectHistoryResponse> => {
    const res = await api.get(`/historical/defects/${defectId}/history`);
    return res.data;
  },
  getDamHistoricalSummary: async (damId: number): Promise<DamHistoricalSummaryResponse> => {
    const res = await api.get(`/historical/dams/${damId}/summary`);
    return res.data;
  },
};

export const TelemetryService = {
  getLiveTelemetry: async (damId: number) => {
    const res = await api.get(`/telemetry/dams/${damId}/live`);
    return res.data;
  },
  getTelemetryHistory: async (damId: number) => {
    const res = await api.get(`/telemetry/dams/${damId}/history`);
    return res.data;
  },
};

export const EAPService = {
  getForecast: async (damId: number) => {
    const res = await api.get(`/eap/dams/${damId}/simulation`);
    return res.data;
  },
  triggerEAP: async (damId: number, level: string, reason: string) => {
    const res = await api.post(`/eap/dams/${damId}/trigger-eap`, { level, reason });
    return res.data;
  },
};

export const NDSAService = {
  getScorecard: async (damId: number) => {
    const res = await api.get(`/ndsa/dams/${damId}/audit-scorecard`);
    return res.data;
  },
  generateCertificate: async (damId: number) => {
    const res = await api.post(`/ndsa/dams/${damId}/generate-certificate`);
    return res.data;
  },
  downloadCertificate: async (certCode: string) => {
    const res = await api.get(`/ndsa/certificates/${certCode}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${certCode}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const SupremeService = {
  getHierarchy: async (): Promise<any> => {
    const res = await api.get('/supreme/hierarchy');
    return res.data;
  },
  getDams: async (params?: Record<string, any>): Promise<any[]> => {
    const res = await api.get('/supreme/dams', { params });
    return res.data;
  },
  getDamDossier: async (damId: number): Promise<any> => {
    const res = await api.get(`/supreme/dams/${damId}/dossier`);
    return res.data;
  },
  issueDirective: async (damId: number, data: { title: string; command_text: string; priority: string }): Promise<any> => {
    const res = await api.post(`/supreme/dams/${damId}/directives`, data);
    return res.data;
  },
  submitRating: async (damId: number, data: { rating: number; grade: string; comments?: string }): Promise<any> => {
    const res = await api.post(`/supreme/dams/${damId}/rating`, data);
    return res.data;
  },
};

export const PublicGrievanceService = {
  getPublicDams: async (): Promise<DamPublicRef[]> => {
    const res = await api.get('/public/dams');
    return res.data;
  },
  submitComplaint: async (payload: PublicComplaintCreate): Promise<PublicComplaint> => {
    const res = await api.post('/public/complaints', payload);
    return res.data;
  },
  trackComplaint: async (trackingCode: string): Promise<PublicComplaint> => {
    const res = await api.get(`/public/complaints/track/${trackingCode}`);
    return res.data;
  },
  getAuthorityGrievances: async (params?: { status?: string; category?: string; dam_id?: number }): Promise<PublicComplaint[]> => {
    const res = await api.get('/authority/grievances', { params });
    return res.data;
  },
  takeAuthorityAction: async (
    complaintId: number, 
    actionPayload: { 
      status?: string; 
      authority_notes?: string; 
      resolution_photo_url?: string; 
      assign_work_order?: boolean; 
      work_order_priority?: string 
    }
  ): Promise<PublicComplaint> => {
    const res = await api.patch(`/authority/grievances/${complaintId}/action`, actionPayload);
    return res.data;
  },
};

export default api;

