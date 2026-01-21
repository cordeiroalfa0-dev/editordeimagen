
export interface Folder {
  id: string;
  name: string;
  timestamp: number;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";
export type ModelMode = 'Standard' | 'Pro';

export interface PSDLayer {
  id: string;
  name: string;
  type: 'subject' | 'background' | 'foreground' | 'fx' | 'lighting';
  visibility: boolean;
  opacity: number;
  imageUrl?: string;
}

export interface GeneratedVersion {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  description: string;
  refinedPrompt?: string;
  style: string;
  lighting: string;
  scenery: string;
  resolution: string;
  groundingUrls?: string[];
  layers?: PSDLayer[];
}

export interface SystemLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'api' | 'telemetry';
}

export interface ProcessingResult {
  id: string;
  folderId?: string;
  operatorEmail?: string;
  analysis?: string;
  confirmation?: string;
  versions: GeneratedVersion[];
  originalAlignedUrl?: string;
  logs: SystemLog[];
  timestamp: number;
  isLocked?: boolean;
  config?: {
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    mode: ModelMode;
  };
  error?: string;
}

export enum ViewMode {
  GALLERY = 'GALLERY',
  COMPARISON = 'COMPARISON',
  HISTORY = 'HISTORY',
  PRESETS = 'PRESETS'
}
