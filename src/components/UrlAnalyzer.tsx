import React, { useState } from 'react';
import { Search, Globe, CheckCircle2, AlertTriangle, ShieldCheck, Zap, FileText } from 'lucide-react';
import { AnalysisResult } from '../types';

interface UrlAnalyzerProps {
  currentUrl: string;
  onAnalyzeSuccess: (result: AnalysisResult) => void;
}

export const UrlAnalyzer: React.FC<UrlAnalyzerProps> = ({ currentUrl, onAnalyzeSuccess }) => {
  const [urlInput, setUrlInput] = useState<string>(currentUrl || 'https://en.m.wikipedia.org');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  const sampleSites = [
    { label: 'Wikipedia Mobile', url: 'https://en.m.wikipedia.org' },
    { label: 'Hacker News', url: 'https://news.ycombinator.com' },
    { label: 'GitHub Docs', url: 'https://docs.github.com' },
    { label: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  ];

  const handleAnalyze = async (targetUrlToUse?: string) => {
    const raw = (targetUrlToUse || urlInput).trim();
    if (!raw) {
      setErrorMsg('Please enter a website URL.');
      return;
    }

    let formatted = raw;
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
      setUrlInput(formatted);
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formatted }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach or analyze website');
      }

      setLastResult(data);
      onAnalyzeSuccess(data);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Analysis failed. Check the URL and server connectivity.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-base font-semibold text-white">01. Target Website Analyzer</h2>
        <p className="text-xs text-slate-400">
          Enter any public website URL. The system validates network reachability, SSRF safety, mobile responsiveness, and offline readiness.
        </p>
      </div>

      {/* URL Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAnalyze();
        }}
        className="flex flex-col sm:flex-row items-stretch gap-2"
      >
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Globe className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg transition-colors shrink-0"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Inspect & Validate</span>
            </>
          )}
        </button>
      </form>

      {/* Sample presets */}
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 flex-wrap">
        <span className="text-slate-500">Presets:</span>
        {sampleSites.map((site) => (
          <button
            key={site.url}
            type="button"
            onClick={() => {
              setUrlInput(site.url);
              handleAnalyze(site.url);
            }}
            className="hover:text-sky-300 text-slate-400 transition-colors underline decoration-slate-700 underline-offset-2"
          >
            {site.label}
          </button>
        ))}
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="font-semibold text-red-200">Validation Issue</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Analysis Results Grid */}
      {lastResult && (
        <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <div className="text-slate-500 mb-1">HTTP Status</div>
            <div className="font-mono text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lastResult.statusCode} OK</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 tabular-nums">Latency: {lastResult.responseTimeMs}ms</div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <div className="text-slate-500 mb-1">SSL & Security</div>
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{lastResult.isHttps ? 'HTTPS Enforced' : 'HTTP Only'}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">SSRF Verified Safe</div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <div className="text-slate-500 mb-1">Mobile Viewport</div>
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{lastResult.isResponsive ? 'Responsive Ready' : 'Non-Responsive'}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {lastResult.isResponsive ? 'Auto-adapts to screen' : 'Desktop viewport'}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <div className="text-slate-500 mb-1">Offline & PDFs</div>
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="tabular-nums">{lastResult.offlineAnalysis.downloadablePdfCount} PDFs Found</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {lastResult.offlineAnalysis.formsCount} Forms Detected
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
