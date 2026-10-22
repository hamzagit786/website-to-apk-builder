export interface AppConfig {
  id: string;
  name: string;
  packageId: string;
  url: string;
  iconData?: string; // base64 or URL
  versionName: string;
  versionCode: number;
  themeColor: string;
  permissions: {
    internet: boolean;
    downloads: boolean;
    camera: boolean;
    geolocation: boolean;
    notifications: boolean;
    cleartextTraffic: boolean;
  };
  offlineConfig: {
    enableFallbackPage: boolean;
    cacheStaticAssets: boolean;
    enableFormSyncQueue: boolean;
    cacheTtlHours: number;
  };
  buildStatus: 'draft' | 'building' | 'success' | 'failed';
  githubRunId?: number;
  githubRunUrl?: string;
  apkDownloadUrl?: string;
  createdAt: string;
  lastBuiltAt?: string;
}

export interface AnalysisResult {
  success: boolean;
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  isHttps: boolean;
  isResponsive: boolean;
  meta: {
    title: string;
    description: string;
    themeColor: string;
    iconUrl: string;
    suggestedName: string;
    suggestedPackageId: string;
  };
  security: {
    xFrameOptions: string;
    contentSecurityPolicy: string;
    hasFrameBlock: boolean;
    note: string;
  };
  offlineAnalysis: {
    hasServiceWorker: boolean;
    hasManifest: boolean;
    formsCount: number;
    inputsCount: number;
    hasAuthKeywords: boolean;
    downloadablePdfCount: number;
    downloadableFileCount: number;
    compatibilityTier: string;
    canAutoCacheStaticAssets: boolean;
    canOfflineViewSavedPdfs: boolean;
    requiresBackendForSync: boolean;
    explanation: string;
  };
}

export interface GitHubRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  htmlUrl: string;
  createdAt: string;
  artifacts: Array<{
    id: number;
    name: string;
    size_in_bytes: number;
    archive_download_url: string;
  }>;
}

export interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  data: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
  idempotencyKey: string;
}
