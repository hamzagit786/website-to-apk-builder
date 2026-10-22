import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Download,
  Upload,
  Database,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Copy,
  Check,
} from 'lucide-react';
import { AnalysisResult, OfflineQueueItem } from '../types';

interface OfflineCompatibilityProps {
  analysis: AnalysisResult | null;
  targetUrl: string;
}

export const OfflineCompatibility: React.FC<OfflineCompatibilityProps> = ({ analysis, targetUrl }) => {
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([
    {
      id: 'sub_17420912401',
      url: `${targetUrl || 'https://example.com'}/api/contact`,
      method: 'POST',
      data: { name: 'Sarah Miller', email: 'sarah@example.com', notes: 'Field inspection completed offline' },
      timestamp: Date.now() - 1000 * 60 * 12,
      status: 'pending',
      idempotencyKey: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    },
    {
      id: 'sub_17420899210',
      url: `${targetUrl || 'https://example.com'}/api/feedback`,
      method: 'POST',
      data: { rating: 5, comments: 'Fast response offline' },
      timestamp: Date.now() - 1000 * 60 * 45,
      status: 'synced',
      idempotencyKey: '2b4c1103-8812-4aa8-bc91-a1b7e322cd49',
    },
  ]);

  const [simulatedNetwork, setSimulatedNetwork] = useState<'online' | 'offline'>('offline');
  const [testFormName, setTestFormName] = useState('');
  const [testFormEmail, setTestFormEmail] = useState('');
  const [testFormNotes, setTestFormNotes] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFormName) return;

    const newId = `sub_${Date.now()}`;
    const newItem: OfflineQueueItem = {
      id: newId,
      url: `${targetUrl || 'https://example.com'}/api/submit`,
      method: 'POST',
      data: { name: testFormName, email: testFormEmail, notes: testFormNotes },
      timestamp: Date.now(),
      status: simulatedNetwork === 'online' ? 'synced' : 'pending',
      idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    setOfflineQueue([newItem, ...offlineQueue]);
    setTestFormName('');
    setTestFormEmail('');
    setTestFormNotes('');
  };

  const handleSyncAll = () => {
    if (simulatedNetwork === 'offline') {
      alert('Cannot synchronize while offline. Switch the network simulator toggle to Online first.');
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      setOfflineQueue((prev) =>
        prev.map((item) => (item.status === 'pending' ? { ...item, status: 'synced' as const } : item))
      );
      setIsSyncing(false);
    }, 1200);
  };

  const exportQueueJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(offlineQueue, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `offline_queue_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setOfflineQueue(parsed);
          alert('Queue restored successfully from backup.');
        }
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const syncScriptSnippet = `<!-- Universal Offline Form Sync Snippet -->
<script>
(function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
  }
  // Intercept form submissions when offline
  window.addEventListener('submit', function(e) {
    if (!navigator.onLine) {
      e.preventDefault();
      const form = e.target;
      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : 'id_' + Date.now();
      
      // Save locally to IndexedDB queue
      if (window.OfflineSyncQueue) {
        window.OfflineSyncQueue.queueSubmission(form.action, 'POST', { 'Content-Type': 'application/json' }, JSON.stringify(payload));
        alert('You are offline. Submission safely saved to local queue and will synchronize automatically when connection returns.');
      }
    }
  });
})();
</script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(syncScriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Honest Offline Compatibility Assessment */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-1 mb-6">
          <h2 className="text-base font-semibold text-white">01. Technical Offline Compatibility Report</h2>
          <p className="text-xs text-slate-400">
            A website URL alone cannot reveal internal database schemas or private APIs. Below is an authentic technical breakdown of what works automatically vs. what requires backend integration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Level 1: Static Assets */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">Static Web Pages & Media</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  Fully Supported
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                HTML, CSS, JS, web fonts, and product images are stored via Android <code className="text-sky-300">LOAD_CACHE_ELSE_NETWORK</code> and Service Worker caches. Browsing cached pages works completely offline.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              No code changes required.
            </div>
          </div>

          {/* Level 2: PDFs & Downloads */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">PDF & File Downloads</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  Fully Supported
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Android <code className="text-sky-300">DownloadManager</code> stores PDFs in public storage. The integrated <code className="text-sky-300">FileProvider</code> allows users to open and review downloaded documents without internet.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Handled natively by APK wrapper.
            </div>
          </div>

          {/* Level 3: Auth & Sessions */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">Authentication & Login</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800">
                  Session Cached
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Active JWT tokens and cookies persist in Android CookieManager. Users remain logged in offline until token expiration. Performing a new login or OAuth handshake requires network.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Standard web security constraint.
            </div>
          </div>

          {/* Level 4: Form Data & Mutations */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">Offline Form Submissions</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-950/80 text-sky-400 border border-sky-800">
                  Sync Queue Engine
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                External servers cannot magically accept writes when disconnected. Our built-in <code className="text-sky-300">OfflineFormSync</code> intercepts submissions into IndexedDB and replays them with idempotency tokens when reconnected.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Interactive simulator below.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Offline Form Queue Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Submission Test Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Form Submission Simulator</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Network:</span>
              <button
                type="button"
                onClick={() => setSimulatedNetwork(simulatedNetwork === 'online' ? 'offline' : 'online')}
                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                  simulatedNetwork === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {simulatedNetwork}
              </button>
            </div>
          </div>

          <form onSubmit={handleTestSubmit} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Contact / Inspector Name</label>
              <input
                type="text"
                value={testFormName}
                onChange={(e) => setTestFormName(e.target.value)}
                placeholder="Alex Cooper"
                required
                className="mt-1 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Email Address</label>
              <input
                type="email"
                value={testFormEmail}
                onChange={(e) => setTestFormEmail(e.target.value)}
                placeholder="alex@company.com"
                className="mt-1 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Field Notes / Inspection Details</label>
              <textarea
                rows={2}
                value={testFormNotes}
                onChange={(e) => setTestFormNotes(e.target.value)}
                placeholder="Record collected in remote field with no cell service."
                className="mt-1 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
            >
              Submit Form (Test Local Queue)
            </button>
          </form>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            When set to <strong className="text-amber-400">Offline</strong>, entries are intercepted, tagged with a UUID, and stored in the local queue below without network failure.
          </p>
        </div>

        {/* Offline Queue Records Table */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">Local Queue & Idempotency Storage</h3>
                <span className="text-xs text-slate-500">({offlineQueue.length} items)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportQueueJson}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Backup JSON
                </button>
                <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  Restore
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync All
                </button>
              </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-2">Record ID</th>
                    <th className="py-2 px-2">Data Payload</th>
                    <th className="py-2 px-2">Idempotency UUID</th>
                    <th className="py-2 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
                  {offlineQueue.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                        Queue is clean. Submit a form in offline mode to test.
                      </td>
                    </tr>
                  ) : (
                    offlineQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-2 text-slate-300">{item.id}</td>
                        <td className="py-2.5 px-2 font-sans truncate max-w-[220px]">
                          {item.data.name as string} ({item.data.email as string})
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 truncate max-w-[140px]">{item.idempotencyKey}</td>
                        <td className="py-2.5 px-2 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-sans font-medium text-[10px] px-2 py-0.5 rounded ${
                              item.status === 'synced'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {item.status === 'synced' ? 'Synced' : 'Pending Reconnection'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Preserves records permanently in SQLite/IndexedDB until server returns 200 OK.</span>
            <span className="font-mono tabular-nums">{offlineQueue.filter((q) => q.status === 'pending').length} pending</span>
          </div>
        </div>
      </div>

      {/* 3. Optional Snippet for Website Authors */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Optional Website Integration Snippet</h3>
          </div>
          <button
            type="button"
            onClick={copySnippet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Snippet'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          If you have access to your website's source code, paste this script before <code className="text-sky-300">&lt;/body&gt;</code> to enable instant offline form queuing in standard mobile browsers. (The generated Android APK already includes this natively inside <code className="text-sky-300">assets/offline_sync.js</code>!)
        </p>
        <pre className="p-4 bg-slate-950 border border-slate-800/90 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {syncScriptSnippet}
        </pre>
      </div>
    </div>
  );
};
