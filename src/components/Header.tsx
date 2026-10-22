import React from 'react';
import { DownloadCloud } from 'lucide-react';

interface HeaderProps {
  activeTab: 'builder' | 'preview' | 'offline' | 'cloud' | 'history' | 'guide';
  onSelectTab: (tab: 'builder' | 'preview' | 'offline' | 'cloud' | 'history' | 'guide') => void;
  onQuickExport: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onQuickExport,
  isExporting,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('builder');
        }}
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-sky-400 transition-colors"
      >
        APKBuilder
      </a>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
        <button
          type="button"
          onClick={() => onSelectTab('builder')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'builder' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          App Builder
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('preview')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'preview' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Live Preview
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('offline')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'offline' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Offline & Sync
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('cloud')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'cloud' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Cloud Build
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('history')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'history' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Saved Projects
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('guide')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'guide' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Windows Guide
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onQuickExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          {isExporting ? 'Packaging...' : 'Export Source ZIP'}
        </button>
      </div>
    </header>
  );
};
