export type UserRole = 'AUTHORITY' | 'DAM_OPERATOR' | 'INSPECTION_ENGINEER' | 'MAINTENANCE_MANAGER' | 'SUPREME_COMMAND';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
}

export interface DamZone {
  id: number;
  dam_id: number;
  zone_name: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
}

export interface Dam {
  id: number;
  name: string;
  code: string;
  state: string;
  district: string;
  dam_type: string;
  height_meters: number;
  length_meters?: number;
  storage_capacity_mcm?: number;
  river_basin?: string;
  commission_year?: number;
  latitude: number;
  longitude: number;
  operator_name?: string;
  status: string;
  created_at: string;
  zones?: DamZone[];
}

export type InspectionStatus = 
  | 'PLANNED'
  | 'SCHEDULED'
  | 'DATA_UPLOADED'
  | 'VALIDATING'
  | 'AI_PROCESSING'
  | 'ENGINEER_REVIEW'
  | 'CONDITION_ASSESSED'
  | 'RISK_ASSESSED'
  | 'REPORT_GENERATED'
  | 'COMPLETED';

export interface Inspection {
  id: number;
  inspection_code: string;
  dam_id: number;
  dam_name?: string;
  zone_id?: number;
  inspection_type: string;
  assigned_engineer_id?: number;
  inspection_date: string;
  status: InspectionStatus;
  coverage_percentage: number;
  weather_conditions?: string;
  created_at: string;
}

export interface DroneImage {
  id: number;
  dataset_id: number;
  filename: string;
  file_path: string;
  storage_key?: string;
  storage_provider?: string;
  mime_type?: string;
  media_type?: string;
  file_size_bytes: number;
  file_hash_sha256?: string;
  resolution_w?: number;
  resolution_h?: number;
  width?: number;
  height?: number;
  blur_score?: number;
  brightness_score?: number;
  duration_seconds?: number;
  fps?: number;
  frame_count?: number;
  gps_status?: 'EXIF_EXTRACTED' | 'MANUALLY_GEOREFERENCED' | 'UNAVAILABLE' | 'INVALID';
  latitude?: number;
  longitude?: number;
  altitude?: number;
  camera_make?: string;
  camera_model?: string;
  capture_time?: string;
  georeference_method?: string;
  georeferenced_by_id?: number;
  georeferenced_at?: string;
  quality_status: 'VALID' | 'WARNING' | 'REJECTED';
  quality_issues?: string;
  created_at: string;
  updated_at?: string;
}

export interface DroneDataset {
  id: number;
  inspection_id: number;
  dataset_name: string;
  drone_model?: string;
  total_files: number;
  valid_files: number;
  warning_files: number;
  rejected_files: number;
  upload_status: string;
  uploaded_at: string;
  images?: DroneImage[];
}

export type DefectStatus = 
  | 'AI_DETECTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'RISK_ASSESSED'
  | 'MAINTENANCE_REQUIRED'
  | 'WORK_ORDER_CREATED'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIR_COMPLETED'
  | 'REINSPECTION'
  | 'RESOLVED'
  | 'MONITOR';

export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Defect {
  id: number;
  defect_code: string;
  dam_id: number;
  dam_name?: string;
  inspection_id: number;
  zone_id?: number;
  image_id?: number;
  defect_type: string;
  severity: DefectSeverity;
  confidence: number;
  estimated_length_mm?: number;
  estimated_width_mm?: number;
  estimated_area_sq_cm?: number;
  measurement_type: string;
  latitude?: number;
  longitude?: number;
  coordinate_source?: string;
  location_precision?: string;
  pos_x_3d: number;
  pos_y_3d: number;
  pos_z_3d: number;
  status: DefectStatus;
  engineer_verified_by_id?: number;
  engineer_comments?: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
}


export interface RiskAssessment {
  id: number;
  dam_id: number;
  inspection_id?: number;
  risk_score: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  condition_index: number;
  condition_rating: 'GOOD' | 'WATCH' | 'ATTENTION_REQUIRED' | 'CRITICAL';
  contributing_factors?: string[];
  assessed_at: string;
}

export type MaintenanceStatus = 
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'REPAIR_COMPLETED'
  | 'REINSPECTION_REQUIRED'
  | 'CLOSED';

export interface WorkOrder {
  id: number;
  work_order_code: string;
  dam_id: number;
  dam_name?: string;
  defect_id: number;
  defect_code?: string;
  assigned_manager_id?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_team?: string;
  description: string;
  recommended_action?: string;
  due_date?: string;
  status: MaintenanceStatus;
  repair_notes?: string;
  repair_evidence_file?: string;
  completion_date?: string;
  created_at: string;
}

export interface Report {
  id: number;
  report_code: string;
  dam_id: number;
  inspection_id?: number;
  generated_by_id: number;
  report_title: string;
  file_path: string;
  generated_at: string;
}

export interface Alert {
  id: number;
  dam_id?: number;
  defect_id?: number;
  alert_type: string;
  severity: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

export type ModelStatusType = 'CONFIGURED' | 'LOADED' | 'UNAVAILABLE' | 'LOAD_FAILED';

export interface ModelStatus {
  status: ModelStatusType;
  model_name: string | null;
  model_version: string | null;
  supported_classes: string[];
  device: string;
  confidence_threshold: number;
  iou_threshold: number;
  reason: string;
}

export interface AIJob {
  id: number;
  job_code: string;
  inspection_id: number;
  media_id?: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'MODEL_UNAVAILABLE';
  total_images: number;
  processed_images: number;
  total_detections: number;
  model_name?: string;
  model_version?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export type ReviewStatusType = 'AI_DETECTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'EDITED';

export interface AIDetection {
  id: number;
  detection_code: string;
  ai_job_id?: number;
  inspection_id: number;
  media_id: number;
  image_id: number;
  dam_id: number;
  defect_type: string;
  confidence: number;
  bbox_x_min: number;
  bbox_y_min: number;
  bbox_x_max: number;
  bbox_y_max: number;
  model_name?: string;
  model_version?: string;
  inference_timestamp: string;
  review_status: ReviewStatusType;
  status: string;
  original_defect_type?: string;
  original_confidence?: number;
  original_bbox?: string;
  final_defect_type?: string;
  final_severity?: DefectSeverity;
  final_bbox?: string;
  annotated_image_key?: string;
  reviewed_by_id?: number;
  reviewed_at?: string;
  review_comment?: string;
  created_at: string;
}

export interface BatchAnalysisSummary {
  job_id: number;
  job_code: string;
  status: string;
  total_media: number;
  eligible_media: number;
  skipped_media: number;
  created_detections?: number;
  skip_reasons?: Record<string, string>;
  message: string;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[]; // [longitude, latitude]
}

export interface DefectGeoJSONProperties {
  defect_id: number;
  defect_code: string;
  dam_id: number;
  dam_name?: string;
  inspection_id: number;
  inspection_code?: string;
  defect_type: string;
  severity: string;
  status: string;
  confidence: number;
  location_source: string;
  location_precision: string;
  coordinate_accuracy_meters?: number;
  latitude?: number;
  longitude?: number;
  image_id?: number;
  image_url?: string;
  source_detection_id?: number;
  engineer_comments?: string;
  created_at: string;
}

export interface DefectGeoJSONFeature {
  type: 'Feature';
  id: number;
  geometry: GeoJSONGeometry | null;
  properties: DefectGeoJSONProperties;
}

export interface DefectGeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: DefectGeoJSONFeature[];
}

export interface DamGIS {
  id: number;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  geometry: GeoJSONGeometry | null;
  location_label: string;
  state: string;
  district: string;
  dam_type: string;
  height_meters: number;
  total_defects: number;
  spatially_mapped_defects: number;
}

export interface DigitalTwinModel {
  id: number;
  dam_id: number;
  name: string;
  description?: string;
  file_name: string;
  storage_key: string;
  storage_provider: string;
  file_size_bytes: number;
  mime_type: string;
  model_format: string;
  version: string;
  is_active: boolean;
  uploaded_by_id: number;
  uploader_name?: string;
  download_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface DigitalTwinDefectOverlay {
  defect_id: number;
  defect_code: string;
  defect_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  inspection_id: number;
  inspection_code?: string;
  inspection_date?: string;
  location_source: string;
  location_precision: 'MEDIA_REFERENCE' | 'MANUAL_GEOREFERENCE' | 'PRECISE_SURVEY' | 'UNAVAILABLE';
  position_available: boolean;
  latitude?: number;
  longitude?: number;
  coordinate_accuracy_meters?: number;
  position_3d: Position3D;
  ai_detection_confidence: number;
  source_image_id?: number;
  source_image_url?: string;
  annotated_image_url?: string;
  status: string;
  verification_date?: string;
  verified_by_name?: string;
}

export interface DigitalTwinSummary {
  dam_id: number;
  dam_name: string;
  dam_code: string;
  dam_type: string;
  height_meters: number;
  length_meters?: number;
  latitude: number;
  longitude: number;
  has_active_model: boolean;
  active_model?: DigitalTwinModel;
  total_models: number;
  total_defects: number;
  spatially_located_defects: number;
  missing_location_defects: number;
  defects: DigitalTwinDefectOverlay[];
}

export type ComparisonStatus = 
  | 'NEW'
  | 'UNCHANGED'
  | 'INCREASING'
  | 'DECREASING'
  | 'RESOLVED'
  | 'NOT_OBSERVED'
  | 'RECURRING';

export type DeteriorationStatus = 
  | 'STABLE'
  | 'MONITORING'
  | 'DETERIORATING'
  | 'SIGNIFICANTLY_DETERIORATING';

export interface DefectComparisonItem {
  dam_id: number;
  current_inspection_id: number;
  historical_inspection_id: number;
  current_defect_id?: number | null;
  historical_defect_id?: number | null;
  match_method: string;
  match_distance_meters?: number | null;
  match_confidence?: number | null;
  comparison_status: ComparisonStatus;
  measurement_change_mm?: number | null;
  measurement_change_pct?: number | null;
  severity_change?: string | null;
  deterioration_status: DeteriorationStatus;
  current_defect?: Defect | null;
  historical_defect?: Defect | null;
}

export interface HistoricalInspectionTimelineItem {
  id: number;
  inspection_code: string;
  inspection_date: string;
  inspection_type: string;
  status: string;
  coverage_percentage: number;
  verified_defects: number;
  spatially_located_defects: number;
  unmapped_defects: number;
}

export interface DefectHistoryNode {
  inspection_id: number;
  inspection_code: string;
  inspection_date: string;
  defect_id: number;
  defect_code: string;
  defect_type: string;
  severity: string;
  estimated_length_mm?: number;
  estimated_width_mm?: number;
  estimated_area_sq_cm?: number;
  measurement_type: string;
  latitude?: number;
  longitude?: number;
  coordinate_source: string;
  location_precision: string;
  status: string;
  source_image_id?: number;
}

export interface DefectHistoryResponse {
  defect_id: number;
  defect_code: string;
  defect_type: string;
  dam_id: number;
  current_severity: string;
  location_precision: string;
  history_count: number;
  history: DefectHistoryNode[];
}

export interface HistoricalComparisonResponse {
  status: 'SUCCESS' | 'UNAVAILABLE' | 'NO_MATCHABLE_DEFECTS';
  message: string;
  current_inspection?: {
    id: number;
    inspection_code: string;
    inspection_date: string;
    coverage_percentage?: number;
  };
  historical_inspection?: {
    id: number;
    inspection_code: string;
    inspection_date: string;
    coverage_percentage?: number;
  } | null;
  match_distance_meters?: number;
  summary: {
    total_current_defects: number;
    total_historical_defects: number;
    matched_count: number;
    new_count: number;
    unchanged_count: number;
    increasing_count: number;
    decreasing_count: number;
    resolved_count: number;
    not_observed_count: number;
    recurring_count: number;
  };
  comparisons: DefectComparisonItem[];
}

export interface DamHistoricalSummaryResponse {
  dam_id: number;
  dam_name?: string;
  total_historical_inspections: number;
  current_inspection?: {
    id: number;
    inspection_code: string;
    inspection_date: string;
  } | null;
  historical_inspection?: {
    id: number;
    inspection_code: string;
    inspection_date: string;
  } | null;
  current_defects_count: number;
  historical_defects_count: number;
  summary: {
    new_count: number;
    unchanged_count: number;
    increasing_count: number;
    decreasing_count: number;
    resolved_count: number;
    not_observed_count: number;
    recurring_count: number;
  };
}

export interface SupremeDirective {
  id: number;
  directive_code: string;
  title: string;
  command_text: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'ROUTINE';
  status: string;
  issued_at: string;
  issued_by_name?: string;
}

export interface StateHierarchy {
  state: string;
  total_dams: number;
  major_dams: number;
  minor_dams: number;
  districts: string[];
  total_storage_mcm: number;
}

export interface SupremeHierarchyResponse {
  summary: {
    total_states: number;
    total_dams: number;
    major_dams: number;
    minor_dams: number;
    active_alerts: number;
    issued_directives: number;
    command_authority: string;
  };
  states: StateHierarchy[];
}

export interface SupremeDamSummary {
  id: number;
  name: string;
  code: string;
  state: string;
  district: string;
  dam_type: string;
  dam_category: 'MAJOR' | 'MEDIUM' | 'MINOR';
  height_meters: number;
  length_meters?: number;
  storage_capacity_mcm?: number;
  river_basin?: string;
  commission_year?: number;
  latitude: number;
  longitude: number;
  operator_name?: string;
  engineer_in_charge?: string;
  status: string;
  supreme_rating: number;
  rating_grade: string;
  active_issues_count: number;
  active_directives_count: number;
  photos_json?: string[];
}

export interface SupremeDamDossier {
  dam: SupremeDamSummary & {
    location_label?: string;
    history_summary?: string;
    rating_comments?: string;
    photos: string[];
  };
  registered_issues: {
    total_defects: number;
    critical_defects: number;
    active_alerts: number;
    work_orders: number;
    alerts_list: {
      id: number;
      title: string;
      severity: string;
      created_at: string;
    }[];
  };
  inspections_history: {
    id: number;
    inspection_code: string;
    inspection_type: string;
    status: string;
    date: string;
  }[];
  directives: SupremeDirective[];
}

export type ComplaintStatus = 
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INSPECTION_ASSIGNED'
  | 'REPAIR_IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type ComplaintCategory =
  | 'SEEPAGE'
  | 'STRUCTURAL_CRACK'
  | 'SPILLWAY_MALFUNCTION'
  | 'FLOODING_RISK'
  | 'SILTATION'
  | 'ENCROACHMENT'
  | 'OTHER';

export interface DamPublicRef {
  id: number;
  name: string;
  code: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  dam_type: string;
}

export interface PublicComplaint {
  id: number;
  tracking_code: string;
  citizen_name?: string;
  citizen_phone?: string;
  citizen_email?: string;
  dam_id?: number;
  dam_name?: string;
  category: ComplaintCategory | string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  location_address?: string;
  photo_urls_json?: string[];
  ai_risk_score: number;
  status: ComplaintStatus;
  authority_notes?: string;
  resolution_photo_url?: string;
  work_order_id?: number;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  distance_to_dam_km?: number;
}

export interface PublicComplaintCreate {
  citizen_name: string;
  citizen_phone: string;
  citizen_email?: string;
  dam_id?: number;
  category: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  location_address?: string;
  photo_urls_json?: string[];
}
