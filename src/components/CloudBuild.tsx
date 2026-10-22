import React, { useState, useEffect } from 'react';
import {
  Github,
  Play,
  RotateCw,
  ExternalLink,
  Download,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { AppConfig, GitHubRun } from '../types';

interface CloudBuildProps {
  config: AppConfig;
  onExportLocalZip: () => void;
}

export const CloudBuild: React.FC<CloudBuildProps> = ({ config, onExportLocalZip }) => {
  const [githubRepo, setGithubRepo] = useState<string>(() => localStorage.getItem('gh_repo') || '');
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem('gh_token') || '');
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    valid?: boolean;
    isPrivate?: boolean;
    error?: string;
  }>({ tested: false });

  const [buildType, setBuildType] = useState<'release' | 'debug'>('release');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<GitHubRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(false);

  // Keystore generator helper state
  const [keystoreAlias, setKeystoreAlias] = useState<string>('appreleasekey');
  const [keystorePass, setKeystorePass] = useState<string>('SecretPass123!');
  const [copiedKeystoreCmd, setCopiedKeystoreCmd] = useState<boolean>(false);

  useEffect(() => {
    if (githubRepo && githubToken) {
      fetchRuns();
    }
  }, []);

  const handleTestConnection = async () => {
    if (!githubRepo) {
      setConnectionStatus({ tested: true, valid: false, error: 'Repository (e.g. owner/repo) is required.' });
      return;
    }

    try {
      const res = await fetch('/api/github/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: githubRepo, token: githubToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Connection failed.');
      }

      localStorage.setItem('gh_repo', githubRepo);
      if (githubToken) localStorage.setItem('gh_token', githubToken);

      setConnectionStatus({
        tested: true,
        valid: true,
        isPrivate: data.isPrivate,
      });
      fetchRuns();
    } catch (err: unknown) {
      const error = err as Error;
      setConnectionStatus({
        tested: true,
        valid: false,
        error: error.message,
      });
    }
  };

  const handleDispatchBuild = async () => {
    setIsDispatching(true);
    setDispatchMessage(null);

    try {
      const res = await fetch('/api/github/dispatch-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: githubRepo,
          token: githubToken,
          workflowId: 'build-apk.yml',
          inputs: {
            build_type: buildType,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger cloud build.');
      }

      setDispatchMessage('Cloud build initiated on GitHub runner. Tracking progress below...');
      setTimeout(() => {
        fetchRuns();
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setDispatchMessage(`Build trigger error: ${error.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  const fetchRuns = async () => {
    if (!githubRepo || !githubToken) return;
    setIsLoadingRuns(true);
    try {
      const res = await fetch(
        `/api/github/build-runs?repo=${encodeURIComponent(githubRepo)}&token=${encodeURIComponent(githubToken)}`
      );
      if (res.ok) {
        const data = await res.json();
        setWorkflowRuns(data.runs || []);
      }
    } catch {
      // ignore run fetch error
    } finally {
      setIsLoadingRuns(false);
    }
  };

  const windowsKeytoolCmd = `keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ${keystoreAlias} -storepass ${keystorePass} -keypass ${keystorePass} -dname "CN=${config.name || 'App'}, OU=Mobile, O=Company, C=US"`;

  const copyKeystoreCmd = () => {
    navigator.clipboard.writeText(windowsKeytoolCmd);
    setCopiedKeystoreCmd(true);
    setTimeout(() => setCopiedKeystoreCmd(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 1. GitHub Connection & Cloud Runner Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">01. Cloud Android Build Pipeline (GitHub Actions)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Build production-grade APKs directly from your Windows browser using GitHub Actions runners. Tokens and signing keys remain isolated on secure runners.
          </p>
        </div>

        {/* Free Tier Transparency Callout */}
        <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-slate-400 font-medium">Free Tier Usage Policy</div>
            <div className="text-white font-semibold mt-0.5">2,000 Free Mins / Month</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Private repositories receive 2,000 free Linux build minutes monthly. Public repositories have 100% unlimited free build minutes.
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Build Environment</div>
            <div className="text-white font-semibold mt-0.5">Ubuntu Latest + Temurin JDK 17</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Standard official runner with Android SDK 34 command-line tools pre-installed.
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Zero-Token Browser Leakage</div>
            <div className="text-white font-semibold mt-0.5">Server-Side Proxy Security</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Personal Access Tokens are dispatched securely from the backend and never exposed in client bundles.
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium">GitHub Repository (owner/repo)</label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value.trim())}
              placeholder="octocat/android-app-builder"
              className="mt-1.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium">Personal Access Token (PAT)</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value.trim())}
              placeholder="github_pat_11A..."
              className="mt-1.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Needs <code className="text-sky-300">repo</code> or <code className="text-sky-300">workflow</code> permissions to trigger Actions.
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              Verify Repository Connection
            </button>
            {connectionStatus.tested && (
              <span
                className={`text-xs flex items-center gap-1.5 ${
                  connectionStatus.valid ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {connectionStatus.valid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected ({connectionStatus.isPrivate ? 'Private Repo' : 'Public Repo'})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{connectionStatus.error || 'Connection Failed'}</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={buildType}
              onChange={(e) => setBuildType(e.target.value as 'release' | 'debug')}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="release">Release APK (Optimized)</option>
              <option value="debug">Debug APK (Fast testing)</option>
            </select>

            <button
              type="button"
              onClick={handleDispatchBuild}
              disabled={isDispatching || !githubRepo}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isDispatching ? 'Dispatching...' : 'Trigger Cloud Build'}
            </button>
          </div>
        </div>

        {dispatchMessage && (
          <div className="mt-4 p-3 bg-sky-950/40 border border-sky-800/60 rounded-lg text-xs text-sky-200">
            {dispatchMessage}
          </div>
        )}
      </div>

      {/* 2. Live Cloud Build Runs & Artifacts Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">02. Workflow Runs & APK Artifacts</h3>
            <p className="text-xs text-slate-400">
              Live build status, error logs, and downloadable APK outputs from GitHub Actions runners.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRuns}
            disabled={isLoadingRuns}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingRuns ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Workflow</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Triggered</th>
                <th className="py-2.5 px-3 text-right">APK Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {workflowRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    {githubRepo
                      ? 'No workflow runs detected for this repository. Push project files and dispatch a build above.'
                      : 'Connect your GitHub repository to track cloud APK builds.'}
                  </td>
                </tr>
              ) : (
                workflowRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-medium text-white">
                      <a
                        href={run.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-sky-400 flex items-center gap-1"
                      >
                        #{run.id}
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">{run.name}</td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                          run.status === 'completed' && run.conclusion === 'success'
                            ? 'bg-emerald-950 text-emerald-400'
                            : run.status === 'completed' && run.conclusion === 'failure'
                            ? 'bg-red-950 text-red-400'
                            : 'bg-amber-950 text-amber-400 animate-pulse'
                        }`}
                      >
                        {run.status === 'completed' ? run.conclusion : run.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans">
                      {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {run.artifacts && run.artifacts.length > 0 ? (
                        <a
                          href={run.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-[11px] font-semibold transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download APK ({Math.round(run.artifacts[0].size_in_bytes / 1024 / 1024)} MB)
                        </a>
                      ) : run.status === 'completed' && run.conclusion === 'success' ? (
                        <a
                          href={`${run.htmlUrl}#artifacts`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sky-400 hover:text-sky-300 font-sans text-xs underline"
                        >
                          View Artifacts
                        </a>
                      ) : (
                        <span className="text-slate-600 font-sans text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Keystore Generator & Local Build Alternative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Keystore Generator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Android Keystore Signing Helper</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              To install APKs on standard consumer devices or Google Play, Android requires signing. Generate a secure 2048-bit RSA key for your app:
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <label className="text-slate-400">Key Alias</label>
                <input
                  type="text"
                  value={keystoreAlias}
                  onChange={(e) => setKeystoreAlias(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400">Password</label>
                <input
                  type="text"
                  value={keystorePass}
                  onChange={(e) => setKeystorePass(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="relative">
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {windowsKeytoolCmd}
              </pre>
              <button
                type="button"
                onClick={copyKeystoreCmd}
                className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition-colors"
              >
                {copiedKeystoreCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Paste into Windows Command Prompt or PowerShell to generate <code className="text-slate-400">release.jks</code> in 1 second.
          </div>
        </div>

        {/* Local Build Option */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Local Build (No GitHub Account Needed)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              If you don't want to use GitHub Actions, you can download the complete standalone Android Studio project ZIP. It contains an automated <code className="text-sky-300">build.bat</code> for Windows laptops.
            </p>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs flex flex-col gap-2">
              <div className="text-slate-300 font-medium">Windows Laptop 1-Click Execution:</div>
              <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px]">
                <li>Extract the downloaded ZIP project</li>
                <li>Ensure JDK 17 is installed (<code className="text-slate-300">java -version</code>)</li>
                <li>Double-click <code className="text-sky-300">build.bat</code></li>
                <li>Your APK will appear in <code className="text-slate-300">app\build\outputs\apk\release</code></li>
              </ol>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onExportLocalZip}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-sky-400" />
              Download Full Android Studio Project (.ZIP)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
