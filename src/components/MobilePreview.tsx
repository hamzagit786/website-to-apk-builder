import React, { useState, useRef } from 'react';
import {
  Smartphone,
  RotateCw,
  ArrowLeft,
  Wifi,
  WifiOff,
  FileDown,
  ExternalLink,
  ShieldAlert,
  FolderOpen,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { AppConfig } from '../types';

interface MobilePreviewProps {
  config: AppConfig;
  hasFrameBlock?: boolean;
}

export const MobilePreview: React.FC<MobilePreviewProps> = ({ config, hasFrameBlock = false }) => {
  const [useProxy, setUseProxy] = useState<boolean>(hasFrameBlock);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Array<{ name: string; size: string; time: string; url: string }>>([
    {
      name: 'annual_report_2026.pdf',
      size: '1.4 MB',
      time: 'Just now',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
  ]);
  const [activeTab, setActiveTab] = useState<'webview' | 'downloads'>('webview');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const targetUrl = config.url || 'https://en.m.wikipedia.org';
  const iframeSrc = useProxy ? `/api/proxy-preview?url=${encodeURIComponent(targetUrl)}` : targetUrl;

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (iframeRef.current) {
      iframeRef.current.src = isOfflineSimulated ? 'about:blank' : iframeSrc;
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const handleBackNavigation = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.history.back();
      }
    } catch {
      // Cross-origin fallback
    }
  };

  const simulatePdfDownload = () => {
    const fileName = `${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_document.pdf`;
    setDownloadToast(`DownloadManager: "${fileName}" saved to /sdcard/Download`);
    setDownloadedFiles((prev) => [
      {
        name: fileName,
        size: '840 KB',
        time: 'Just now',
        url: '#',
      },
      ...prev,
    ]);
    setTimeout(() => {
      setDownloadToast(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      {/* Left Column: Interactive Simulation Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-white mb-1">Android Environment Test Bench</h2>
          <p className="text-xs text-slate-400 mb-4">
            Test device navigation, network disconnection fallback, and file download behaviors.
          </p>

          <div className="flex flex-col gap-4 text-xs">
            {/* Network Offline Switch */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-200">Network Connection</div>
                <div className="text-[11px] text-slate-500">
                  {isOfflineSimulated ? 'Simulating Airplane / No Signal' : 'Connected to 5G / Wi-Fi'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
                className={`p-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  isOfflineSimulated
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-800/80'
                    : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80'
                }`}
              >
                {isOfflineSimulated ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                <span>{isOfflineSimulated ? 'Offline' : 'Online'}</span>
              </button>
            </div>

            {/* Proxy Toggle */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-200">Preview Render Mode</div>
                <div className="text-[11px] text-slate-500">
                  {useProxy ? 'Proxy (Bypasses browser X-Frame-Options)' : 'Direct Iframe'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUseProxy(!useProxy)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  useProxy
                    ? 'bg-sky-950/70 text-sky-300 border-sky-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {useProxy ? 'Proxy ON' : 'Direct'}
              </button>
            </div>

            {/* Test Download Manager */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
              <div className="font-medium text-slate-200 mb-1">Android DownloadManager Test</div>
              <div className="text-[11px] text-slate-400 mb-2">
                Simulates intercepting a PDF URL and downloading via Android system storage.
              </div>
              <button
                type="button"
                onClick={simulatePdfDownload}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                Simulate PDF Download
              </button>
            </div>

            {/* Offline Files Drawer Switch */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('webview')}
                className={`flex-1 py-1.5 rounded-md border text-center transition-colors ${
                  activeTab === 'webview'
                    ? 'border-sky-500 bg-sky-950/60 text-sky-300 font-semibold'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                App Screen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('downloads')}
                className={`flex-1 py-1.5 rounded-md border text-center transition-colors ${
                  activeTab === 'downloads'
                    ? 'border-sky-500 bg-sky-950/60 text-sky-300 font-semibold'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Saved Files ({downloadedFiles.length})
              </button>
            </div>
          </div>
        </div>

        {/* Informative Notice */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Native Android WebView Advantage</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Unlike desktop browser iframes, Android's native <code className="text-sky-300">WebView</code> runs inside an isolated OS process and ignores browser <code className="text-slate-300">X-Frame-Options: SAMEORIGIN</code> restrictions, allowing your site to render in full fidelity.
          </p>
        </div>
      </div>

      {/* Right Column: Realistic Android Phone Frame */}
      <div className="flex flex-col items-center">
        {/* Device Wrapper */}
        <div className="relative w-[340px] h-[680px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-700/80 flex flex-col overflow-hidden">
          {/* Punch-hole Front Camera */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-30 border border-slate-800" />

          {/* Android Status Bar */}
          <div
            style={{ backgroundColor: config.themeColor || '#0f172a' }}
            className="h-7 w-full px-5 flex items-center justify-between text-[11px] font-mono text-white/90 z-20 shrink-0 select-none transition-colors"
          >
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              {isOfflineSimulated ? <WifiOff className="w-3 h-3 text-amber-300" /> : <Wifi className="w-3 h-3" />}
              <span className="text-[10px]">5G</span>
              <div className="w-4 h-2 border border-white/80 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-white rounded-xs" />
              </div>
            </div>
          </div>

          {/* Android App Top Bar */}
          <div
            style={{ backgroundColor: config.themeColor || '#0f172a' }}
            className="px-4 py-2 flex items-center justify-between text-white border-b border-white/10 shrink-0 select-none shadow-sm transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              {config.iconData ? (
                <img src={config.iconData} alt="" className="w-5 h-5 rounded-md object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {config.name ? config.name[0] : 'A'}
                </div>
              )}
              <span className="text-xs font-semibold truncate">{config.name || 'My Android App'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                title="Pull-to-refresh"
                className={`p-1 rounded text-white/80 hover:text-white transition-transform ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main App Content Viewport */}
          <div className="relative flex-1 bg-white overflow-hidden">
            {/* Pull-to-refresh Indicator */}
            {isRefreshing && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-sky-400 p-2 rounded-full shadow-lg border border-slate-700 animate-spin">
                <RotateCw className="w-4 h-4" />
              </div>
            )}

            {/* Offline Simulation Screen */}
            {isOfflineSimulated ? (
              <div className="w-full h-full bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center mb-3">
                  <WifiOff className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">No Connection Available</h3>
                <p className="text-xs text-slate-400 mb-5 max-w-[220px]">
                  Could not load {config.name}. Showing cached fallback page.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOfflineSimulated(false)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Reconnect Network
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('downloads')}
                  className="mt-3 text-xs text-sky-400 underline underline-offset-2"
                >
                  View Saved Offline Documents
                </button>
              </div>
            ) : activeTab === 'downloads' ? (
              /* Downloads / Saved Files Screen */
              <div className="w-full h-full bg-slate-950 p-4 flex flex-col text-xs text-slate-300 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="font-semibold text-white">Downloaded Files & PDFs</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('webview')}
                    className="text-sky-400 hover:underline"
                  >
                    Back to App
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {downloadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="font-medium text-white truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {file.size} · {file.time}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 shrink-0">Offline Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Webview Iframe */
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title="Mobile Android Webview Preview"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}

            {/* Simulated Android Download Toast */}
            {downloadToast && (
              <div className="absolute bottom-4 left-3 right-3 z-40 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{downloadToast}</span>
              </div>
            )}
          </div>

          {/* Android Navigation Bar (Back, Home, Recents) */}
          <div className="h-9 w-full bg-black/90 flex items-center justify-around px-8 shrink-0 z-20">
            <button
              type="button"
              onClick={handleBackNavigation}
              title="Android Back"
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('webview');
                handleRefresh();
              }}
              title="Android Home"
              className="w-3.5 h-3.5 border-2 border-slate-400 hover:border-white rounded-full transition-colors"
            />
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'webview' ? 'downloads' : 'webview')}
              title="Android Recents / Switcher"
              className="w-3.5 h-3.5 border border-slate-400 hover:border-white rounded-xs transition-colors"
            />
          </div>
        </div>

        <span className="text-xs text-slate-500 mt-3 font-mono">Simulated Pixel 8 (Android 14 API 34)</span>
      </div>
    </div>
  );
};
