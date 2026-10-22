/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlAnalyzer } from './components/UrlAnalyzer';
import { AppConfigForm } from './components/AppConfigForm';
import { MobilePreview } from './components/MobilePreview';
import { OfflineCompatibility } from './components/OfflineCompatibility';
import { CloudBuild } from './components/CloudBuild';
import { SavedApps } from './components/SavedApps';
import { SetupGuide } from './components/SetupGuide';
import { AppConfig, AnalysisResult } from './types';
import { Smartphone, CheckCircle, ArrowRight, Download, Sparkles } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  id: 'app_initial_01',
  name: 'Wikipedia Mobile',
  packageId: 'com.wikipedia.mobile',
  url: 'https://en.m.wikipedia.org',
  versionName: '1.0.0',
  versionCode: 1,
  themeColor: '#0f172a',
  permissions: {
    internet: true,
    downloads: true,
    camera: false,
    geolocation: false,
    notifications: false,
    cleartextTraffic: false,
  },
  offlineConfig: {
    enableFallbackPage: true,
    cacheStaticAssets: true,
    enableFormSyncQueue: true,
    cacheTtlHours: 72,
  },
  buildStatus: 'draft',
  createdAt: new Date().toISOString(),
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'offline' | 'cloud' | 'history' | 'guide'>('builder');
  const [currentApp, setCurrentApp] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('apk_current_app');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [savedApps, setSavedApps] = useState<AppConfig[]>(() => {
    try {
      const list = localStorage.getItem('apk_saved_apps_list');
      return list ? JSON.parse(list) : [DEFAULT_CONFIG];
    } catch {
      return [DEFAULT_CONFIG];
    }
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('apk_current_app', JSON.stringify(currentApp));
    } catch {
      // ignore
    }
  }, [currentApp]);

  useEffect(() => {
    try {
      localStorage.setItem('apk_saved_apps_list', JSON.stringify(savedApps));
    } catch {
      // ignore
    }
  }, [savedApps]);

  const handleAnalysisSuccess = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setCurrentApp((prev) => ({
      ...prev,
      url: result.finalUrl || result.url,
      name: prev.name && prev.name !== 'Wikipedia Mobile' ? prev.name : result.meta.suggestedName || prev.name,
      packageId: prev.packageId && prev.packageId !== 'com.wikipedia.mobile' ? prev.packageId : result.meta.suggestedPackageId || prev.packageId,
      themeColor: result.meta.themeColor || prev.themeColor,
      iconData: result.meta.iconUrl || prev.iconData,
      permissions: {
        ...prev.permissions,
        downloads: result.offlineAnalysis.downloadablePdfCount > 0 || prev.permissions.downloads,
      },
    }));
    showNotice(`Analysis complete for ${result.meta.title || result.url}. App config updated.`);
  };

  const handleSaveApp = () => {
    setIsSaving(true);
    setSavedApps((prev) => {
      const idx = prev.findIndex((a) => a.id === currentApp.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = currentApp;
        return updated;
      }
      return [currentApp, ...prev];
    });

    setTimeout(() => {
      setIsSaving(false);
      showNotice('App configuration successfully saved to library.');
    }, 400);
  };

  const handleExportZip = async (targetAppToExport?: AppConfig) => {
    const target = targetAppToExport || currentApp;
    setIsExporting(true);
    showNotice('Compiling Android project source tree and generating ZIP bundle...');

    try {
      const res = await fetch('/api/generate-project-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to package project ZIP');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = target.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
      a.download = `${safeName}-android-source.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showNotice(`Downloaded ${safeName}-android-source.zip. Ready for Windows build.bat or Android Studio.`);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Export error: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteApp = (id: string) => {
    if (confirm('Delete this app configuration from your library?')) {
      setSavedApps((prev) => prev.filter((a) => a.id !== id));
      showNotice('App removed from library.');
    }
  };

  const handleNewApp = () => {
    const newId = `app_${Date.now()}`;
    const fresh: AppConfig = {
      ...DEFAULT_CONFIG,
      id: newId,
      name: 'New Android App',
      packageId: `com.app.webapp${Date.now().toString().slice(-4)}`,
      url: 'https://',
      createdAt: new Date().toISOString(),
    };
    setCurrentApp(fresh);
    setAnalysisResult(null);
    setActiveTab('builder');
    showNotice('Started fresh Android application configuration.');
  };

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((current) => (current === msg ? null : current));
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickExport={() => handleExportZip()}
        isExporting={isExporting}
      />

      {/* Floating Global Status Notification */}
      {statusNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700/80 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in max-w-md">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-snug">{statusNotice}</span>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: BUILDER & ANALYZER */}
        {activeTab === 'builder' && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Convert Website to Android APK</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Works directly from any Windows laptop browser with no paid subscriptions.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Interactive Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportZip()}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Project ZIP</span>
                </button>
              </div>
            </div>

            {/* 01. URL Reachability & Inspection */}
            <UrlAnalyzer
              currentUrl={currentApp.url}
              onAnalyzeSuccess={handleAnalysisSuccess}
            />

            {/* 02. Native Identity, Package & Permissions */}
            <AppConfigForm
              config={currentApp}
              onChange={setCurrentApp}
              onSave={handleSaveApp}
              isSaving={isSaving}
            />
          </div>
        )}

        {/* TAB 2: LIVE MOBILE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex flex-col gap-6">
            <div className="pb-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Interactive Android Preview</h1>
              <p className="text-xs text-slate-400 mt-1">
                Experience your website running inside a simulated Android 14 mobile WebView with offline fallback and download interception.
              </p>
            </div>

            <MobilePreview
              config={currentApp}
              hasFrameBlock={analysisResult?.security?.hasFrameBlock}
            />
          </div>
        )}

        {/* TAB 3: OFFLINE & FORMS */}
        {activeTab === 'offline' && (
          <div className="flex flex-col gap-6">
            <div className="pb-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Offline Compatibility & Form Sync Engine</h1>
              <p className="text-xs text-slate-400 mt-1">
                Honest architectural analysis of offline capabilities, cached storage, and idempotent offline form queue.
              </p>
            </div>

            <OfflineCompatibility
              analysis={analysisResult}
              targetUrl={currentApp.url}
            />
          </div>
        )}

        {/* TAB 4: CLOUD BUILD */}
        {activeTab === 'cloud' && (
          <div className="flex flex-col gap-6">
            <div className="pb-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Cloud Android Build Pipeline</h1>
              <p className="text-xs text-slate-400 mt-1">
                Compile installable Android APKs using GitHub Actions runners. Zero token leakage and free tier eligibility.
              </p>
            </div>

            <CloudBuild
              config={currentApp}
              onExportLocalZip={() => handleExportZip()}
            />
          </div>
        )}

        {/* TAB 5: SAVED PROJECTS */}
        {activeTab === 'history' && (
          <SavedApps
            apps={savedApps}
            onSelectApp={(app) => {
              setCurrentApp(app);
              setActiveTab('builder');
              showNotice(`Loaded "${app.name}" into builder.`);
            }}
            onDeleteApp={handleDeleteApp}
            onExportAppZip={handleExportZip}
            onNewApp={handleNewApp}
          />
        )}

        {/* TAB 6: SETUP GUIDE */}
        {activeTab === 'guide' && <SetupGuide />}
      </main>

      {/* Subtle Anti-Slop Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Universal Website-to-APK Builder</span>
            <span aria-hidden="true">·</span>
            <span>Android SDK 34 / Java 17</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className="hover:text-slate-200 transition-colors"
            >
              Setup Guide
            </button>
            <button
              type="button"
              onClick={() => handleExportZip()}
              className="hover:text-slate-200 transition-colors"
            >
              Export Project
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
