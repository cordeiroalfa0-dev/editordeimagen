
export interface GeneratedVersion {
  id: string;
  imageUrl: string;
  description: string;
  style: string;
  lighting: string;
  scenery: string;
  resolution: string;
}

export interface ArchitectureInfo {
  frontend: string;
  backend: string;
  aiIntegration: string;
  libraries: string[];
  dataStructureExample: any;
  securityProtocol: string;
  scalabilityPlan: string;
}

export interface SystemLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'api' | 'telemetry';
}

export interface ProcessingResult {
  id: string;
  analysis: string;
  confirmation: string;
  versions: GeneratedVersion[];
  originalAlignedUrl?: string;
  architecture?: ArchitectureInfo;
  logs: SystemLog[];
  timestamp: number;
}

export enum ViewMode {
  GALLERY = 'GALLERY',
  COMPARISON = 'COMPARISON',
  ARCHITECT = 'ARCHITECT',
  CONTACT_SHEET = 'CONTACT_SHEET',
  TELEMETRY = 'TELEMETRY'
}
