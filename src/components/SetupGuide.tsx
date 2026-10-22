import React from 'react';
import { Laptop, Smartphone, Github, ShieldAlert, CheckCircle, Terminal, HelpCircle } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Windows Laptop & Android Deployment Guide</h2>
        <p className="text-xs text-slate-400">
          Everything you need to know about building, signing, and installing your APK directly on consumer Android devices.
        </p>
      </div>

      {/* Workflow Options Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Path 1: Cloud GitHub Actions */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Github className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Method A: Cloud Build via GitHub Actions</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Best for users who do not want to install Android Studio or Java locally on their Windows laptop.
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2">
              <li>
                <strong>Free GitHub Account</strong>: Create a repository on GitHub (Public repos get unlimited free build minutes; private gets 2,000 mins/mo).
              </li>
              <li>
                <strong>Export & Commit</strong>: Click &quot;Export Source ZIP&quot; and push the project files to your repo.
              </li>
              <li>
                <strong>Personal Access Token (PAT)</strong>: Create a fine-grained token with <code className="text-sky-300">Actions: Read and write</code> permission.
              </li>
              <li>
                <strong>Cloud Build</strong>: Trigger the build from our Cloud Build tab. Once complete, download the APK artifact directly in your Windows browser!
              </li>
            </ol>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-medium">
            Requires 0 local development tools installed.
          </div>
        </div>

        {/* Path 2: Local Windows Laptop Build */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Laptop className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Method B: Local Windows Laptop Build (Batch Script)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Best for offline compilation or private intranet websites.
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2">
              <li>
                <strong>Download Project ZIP</strong>: Download your generated Android Studio project.
              </li>
              <li>
                <strong>Extract Folder</strong>: Unzip the files on your Windows laptop (e.g. into <code className="text-slate-400">C:\Projects\MyApp</code>).
              </li>
              <li>
                <strong>Install JDK 17</strong>: Download free open-source Eclipse Temurin 17 or Oracle OpenJDK 17.
              </li>
              <li>
                <strong>Run build.bat</strong>: Double-click the included <code className="text-sky-300">build.bat</code> script. It automatically runs Gradle and produces the APK!
              </li>
            </ol>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-amber-400 font-medium">
            Produces instant unsigned or debug APK locally.
          </div>
        </div>
      </div>

      {/* Installing on Android Phone */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">How to Install Your APK on an Android Phone</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Once your APK is compiled, follow these steps to sideload and run it on your smartphone or tablet:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="font-semibold text-white mb-1">Step 1: Transfer APK</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Send the <code className="text-sky-300">.apk</code> file to your device via USB cable, Google Drive, WhatsApp, or download directly in Chrome mobile.
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="font-semibold text-white mb-1">Step 2: Unknown Sources</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When opening the APK, tap <strong>Settings</strong> and enable <em>&quot;Allow from this source&quot;</em> (Chrome or Files app).
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="font-semibold text-white mb-1">Step 3: Launch & Enjoy</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tap <strong>Install</strong>. Your website will launch as a full native application with offline support and PDF downloads enabled!
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting and FAQs */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-4 text-xs">
        <h3 className="text-sm font-semibold text-white">Frequently Encountered Scenarios & Troubleshooting</h3>

        <div className="space-y-3">
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="font-semibold text-slate-200">Q: Does the app work if the user loses Wi-Fi / cell signal?</div>
            <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Yes! The native Android WebView uses <code className="text-sky-300">LOAD_CACHE_ELSE_NETWORK</code> mode. When internet is lost, it automatically renders previously cached pages and static assets. If the user navigates to an uncached page, the custom embedded <code className="text-sky-300">offline.html</code> screen appears with a retry button and link to downloaded PDFs.
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="font-semibold text-slate-200">Q: Can users download and read PDF documents while offline?</div>
            <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Yes. The generated Kotlin code wires Android&apos;s native <code className="text-sky-300">DownloadManager</code> and configures a secure <code className="text-sky-300">FileProvider</code> in the AndroidManifest. When a PDF link is tapped, it saves to device storage and immediately opens in the device&apos;s default PDF viewer (e.g. Google PDF Viewer, Adobe Acrobat).
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="font-semibold text-slate-200">Q: How do I publish this to Google Play Store?</div>
            <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Google Play requires an Android App Bundle (<code className="text-sky-300">.aab</code>) signed with a production keystore. You can run <code className="text-slate-300">./gradlew bundleRelease</code> in the extracted project folder, or configure the <code className="text-slate-300">KEYSTORE_BASE64</code> secret in GitHub Actions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
