
export interface Folder {
  id: string;
  name: string;
  timestamp: number;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";
export type ModelMode = 'Standard' | 'Pro';

export interface GeneratedVersion {
  id: string;
  imageUrl: string;
  description: string;
  style: string;
  lighting: string;
  scenery: string;
  resolution: string;
  groundingUrls?: string[];
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
  folderId?: string;
  analysis: string;
  confirmation: string;
  versions: GeneratedVersion[];
  originalAlignedUrl?: string;
  architecture?: ArchitectureInfo;
  logs: SystemLog[];
  timestamp: number;
  config?: {
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    mode: ModelMode;
  };
}

export enum ViewMode {
  GALLERY = 'GALLERY',
  COMPARISON = 'COMPARISON',
  ARCHITECT = 'ARCHITECT',
  CONTACT_SHEET = 'CONTACT_SHEET',
  TELEMETRY = 'TELEMETRY',
  HISTORY = 'HISTORY',
  PICK_SOURCE = 'PICK_SOURCE'
}
