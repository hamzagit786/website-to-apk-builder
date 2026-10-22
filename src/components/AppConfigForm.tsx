import React, { useState } from 'react';
import { Sparkles, Palette, Shield, Wifi, HardDrive, Smartphone, Check, HelpCircle } from 'lucide-react';
import { AppConfig } from '../types';
import { IconGeneratorModal } from './IconGeneratorModal';

interface AppConfigFormProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const AppConfigForm: React.FC<AppConfigFormProps> = ({
  config,
  onChange,
  onSave,
  isSaving,
}) => {
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [packageIdError, setPackageIdError] = useState<string | null>(null);

  const presetColors = ['#0f172a', '#1e293b', '#2563eb', '#0d9488', '#4f46e5', '#7c3aed', '#be123c', '#15803d'];

  const validatePackageId = (id: string) => {
    // Android package name regex: lowercase words separated by dots, minimum 2 parts
    const regex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
    if (!regex.test(id)) {
      setPackageIdError('Must be lowercase dot-separated (e.g. com.company.myapp)');
    } else {
      setPackageIdError(null);
    }
  };

  const handleNameChange = (name: string) => {
    const sanitizedName = name.replace(/["\\]/g, '');
    let newPkg = config.packageId;
    if (!config.packageId || config.packageId.startsWith('com.app.')) {
      const slug = sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '');
      newPkg = `com.app.${slug || 'webview'}`;
    }
    onChange({
      ...config,
      name: sanitizedName,
      packageId: newPkg,
    });
    validatePackageId(newPkg);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-white">02. Android Application Identity & Manifest</h2>
        <p className="text-xs text-slate-400">
          Configure native package identifiers, branding icons, hardware permissions, and offline strategies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* App Name */}
        <div>
          <label className="text-xs font-medium text-slate-300">Android Application Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Web App"
            className="mt-1.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">Displayed on Android Home Screen and App Launcher.</span>
        </div>

        {/* Package ID */}
        <div>
          <label className="text-xs font-medium text-slate-300">Application Package ID</label>
          <input
            type="text"
            value={config.packageId}
            onChange={(e) => {
              const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
              onChange({ ...config, packageId: val });
              validatePackageId(val);
            }}
            placeholder="com.example.myapp"
            className={`mt-1.5 w-full bg-slate-950/80 border rounded-lg px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 ${
              packageIdError ? 'border-red-600 focus:ring-red-500' : 'border-slate-700/80 focus:ring-sky-500'
            }`}
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            {packageIdError ? <span className="text-red-400">{packageIdError}</span> : 'Unique ID for Google Play / device installation.'}
          </span>
        </div>
      </div>

      {/* Version and Theme Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className="text-xs font-medium text-slate-300">Version Name</label>
          <input
            type="text"
            value={config.versionName}
            onChange={(e) => onChange({ ...config, versionName: e.target.value })}
            placeholder="1.0.0"
            className="mt-1.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300">Version Code</label>
          <input
            type="number"
            min={1}
            value={config.versionCode}
            onChange={(e) => onChange({ ...config, versionCode: parseInt(e.target.value, 10) || 1 })}
            className="mt-1.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300">Theme / Status Bar Color</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              value={config.themeColor}
              onChange={(e) => onChange({ ...config, themeColor: e.target.value })}
              className="w-9 h-9 rounded cursor-pointer border border-slate-700 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={config.themeColor}
              onChange={(e) => onChange({ ...config, themeColor: e.target.value })}
              className="w-28 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs font-mono text-white"
            />
            <div className="flex items-center gap-1">
              {presetColors.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...config, themeColor: c })}
                  style={{ backgroundColor: c }}
                  className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* App Icon Section */}
      <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div
            style={{ backgroundColor: config.themeColor }}
            className="w-14 h-14 rounded-2xl border border-slate-700/80 shadow-md flex items-center justify-center overflow-hidden shrink-0"
          >
            {config.iconData ? (
              <img src={config.iconData} alt="App Icon" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-white text-lg">
                {config.name ? config.name.slice(0, 2).toUpperCase() : 'AP'}
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-white">App Launcher & Adaptive Icon</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Generates mipmap densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) and round icon mask.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsIconModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          Customize Icon & Upload
        </button>
      </div>

      {/* Native Android Permissions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Android Device Permissions</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.permissions.internet}
              onChange={(e) =>
                onChange({
                  ...config,
                  permissions: { ...config.permissions, internet: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Internet & Network</div>
              <div className="text-[11px] text-slate-500">INTERNET, ACCESS_NETWORK_STATE</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.permissions.downloads}
              onChange={(e) =>
                onChange({
                  ...config,
                  permissions: { ...config.permissions, downloads: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">File & PDF Downloads</div>
              <div className="text-[11px] text-slate-500">DownloadManager + FileProvider</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.permissions.camera}
              onChange={(e) =>
                onChange({
                  ...config,
                  permissions: { ...config.permissions, camera: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Camera & File Chooser</div>
              <div className="text-[11px] text-slate-500">HTML5 file input & camera capture</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.permissions.geolocation}
              onChange={(e) =>
                onChange({
                  ...config,
                  permissions: { ...config.permissions, geolocation: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Geolocation</div>
              <div className="text-[11px] text-slate-500">ACCESS_FINE_LOCATION</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.permissions.notifications}
              onChange={(e) =>
                onChange({
                  ...config,
                  permissions: { ...config.permissions, notifications: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Push Notifications</div>
              <div className="text-[11px] text-slate-500">POST_NOTIFICATIONS (Android 13+)</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.permissions.cleartextTraffic}
              onChange={(e) =>
                onChange({
                  ...config,
                  permissions: { ...config.permissions, cleartextTraffic: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Cleartext HTTP Traffic</div>
              <div className="text-[11px] text-slate-500">Allow non-HTTPS intranet URLs</div>
            </div>
          </label>
        </div>
      </div>

      {/* Offline System Options */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Offline Behavior & Caching</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.offlineConfig.enableFallbackPage}
              onChange={(e) =>
                onChange({
                  ...config,
                  offlineConfig: { ...config.offlineConfig, enableFallbackPage: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Offline Fallback Screen</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Displays embedded <code className="text-sky-300">offline.html</code> with connection retry button and saved downloads viewer when network is lost.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.offlineConfig.enableFormSyncQueue}
              onChange={(e) =>
                onChange({
                  ...config,
                  offlineConfig: { ...config.offlineConfig, enableFormSyncQueue: e.target.checked },
                })
              }
              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <div className="text-xs font-medium text-white">Offline Form Queue & Replay Bridge</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Intercepts disconnected form POSTs in IndexedDB and automatically syncs when network returns with idempotency keys.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !!packageIdError}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
        >
          <Check className="w-4 h-4" />
          {isSaving ? 'Saving App...' : 'Save App Configuration'}
        </button>
      </div>

      {/* Icon Modal */}
      <IconGeneratorModal
        isOpen={isIconModalOpen}
        onClose={() => setIsIconModalOpen(false)}
        initialName={config.name}
        initialColor={config.themeColor}
        onSelectIcon={(dataUrl) => onChange({ ...config, iconData: dataUrl })}
      />
    </div>
  );
};
