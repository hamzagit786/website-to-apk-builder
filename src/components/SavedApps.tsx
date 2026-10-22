import React from 'react';
import { Smartphone, Download, Trash2, Edit3, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import { AppConfig } from '../types';

interface SavedAppsProps {
  apps: AppConfig[];
  onSelectApp: (app: AppConfig) => void;
  onDeleteApp: (id: string) => void;
  onExportAppZip: (app: AppConfig) => void;
  onNewApp: () => void;
}

export const SavedApps: React.FC<SavedAppsProps> = ({
  apps,
  onSelectApp,
  onDeleteApp,
  onExportAppZip,
  onNewApp,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Project Library & Build History</h2>
          <p className="text-xs text-slate-400">
            All Android projects configured in this browser session. Download complete source code or re-open anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewApp}
          className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
        >
          Create New Android App
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center">
          <Smartphone className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">No Android Apps Created Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-5">
            Enter a website URL in the App Builder tab to generate your first installable native Android application.
          </p>
          <button
            type="button"
            onClick={onNewApp}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
          >
            Launch Builder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: app.themeColor }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-inner overflow-hidden shrink-0 border border-slate-700/60"
                    >
                      {app.iconData ? (
                        <img src={app.iconData} alt="" className="w-full h-full object-cover" />
                      ) : (
                        app.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <h3 className="text-sm font-semibold text-white truncate">{app.name}</h3>
                      <div className="text-[11px] font-mono text-slate-400 truncate">{app.packageId}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 shrink-0">
                    v{app.versionName}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs flex flex-col gap-1.5 mb-4">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Target URL:</span>
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[170px]"
                    >
                      <span className="truncate">{app.url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Offline Fallback:</span>
                    <span className="text-slate-200">
                      {app.offlineConfig.enableFallbackPage ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>File Downloads:</span>
                    <span className="text-slate-200">
                      {app.permissions.downloads ? 'PDF & Storage OK' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onDeleteApp(app.id)}
                  title="Delete App"
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onExportAppZip(app)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Project ZIP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectApp(app)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
