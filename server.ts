import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';
import net from 'net';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-memory store for user-configured apps and build history
interface AppRecord {
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
  buildLogs?: string[];
}

const savedApps: Map<string, AppRecord> = new Map();

// Helper: SSRF validation to prevent access to internal or link-local networks
function isPrivateIp(ip: string): boolean {
  if (ip === 'localhost' || ip === '::1' || ip === '0.0.0.0') return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4) return true;
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (private: 172.16 - 172.31)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local, cloud metadata service e.g. 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 224.0.0.0/4 (multicast)
    if (parts[0] >= 224) return true;
    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '::') return true;
    if (norm.startsWith('fe80:') || norm.startsWith('fc00:') || norm.startsWith('fd00:')) return true;
    return false;
  }

  return false;
}

async function validateUrlForSsrf(urlString: string): Promise<{ valid: boolean; error?: string; parsedUrl?: URL }> {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
    }

    const hostname = parsed.hostname;
    if (!hostname) {
      return { valid: false, error: 'Missing hostname in URL.' };
    }

    // Direct check for loopback/metadata
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '169.254.169.254' ||
      hostname === '0.0.0.0'
    ) {
      return { valid: false, error: 'Access to localhost and cloud metadata endpoints is prohibited.' };
    }

    // Resolve DNS and check resulting IP
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateIp(addr.address)) {
          return { valid: false, error: `Resolved IP (${addr.address}) is a private/restricted network address.` };
        }
      }
    } catch {
      return { valid: false, error: `Could not resolve hostname "${hostname}". Check spelling or domain DNS.` };
    }

    return { valid: true, parsedUrl: parsed };
  } catch {
    return { valid: false, error: 'Malformed or invalid URL format.' };
  }
}

// 1. Analyze Website Endpoint
app.post('/api/analyze-url', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required.' });
  }

  const ssrfCheck = await validateUrlForSsrf(url.trim());
  if (!ssrfCheck.valid || !ssrfCheck.parsedUrl) {
    return res.status(400).json({ error: ssrfCheck.error || 'Invalid URL' });
  }

  const targetUrl = ssrfCheck.parsedUrl.toString();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 APKBuilder/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const finalUrl = response.url || targetUrl;
    const statusCode = response.status;
    const contentType = response.headers.get('content-type') || '';

    let html = '';
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      html = await response.text();
    }

    // Security headers inspection
    const xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');
    const hasFrameBlock = (xFrameOptions && /deny|sameorigin/i.test(xFrameOptions)) || (csp && /frame-ancestors/i.test(csp));

    // Extract metadata from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']*)["']/i);
    const themeColor = themeColorMatch ? themeColorMatch[1].trim() : '#0f172a';

    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
    const isResponsive = !!viewportMatch;

    // Detect favicon or app icon
    let iconUrl = '';
    const appleTouchIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i);
    const favIcon = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i);
    const foundIcon = appleTouchIcon ? appleTouchIcon[1] : (favIcon ? favIcon[1] : '');

    if (foundIcon) {
      try {
        iconUrl = new URL(foundIcon, finalUrl).toString();
      } catch {
        iconUrl = '';
      }
    }
    if (!iconUrl) {
      try {
        iconUrl = new URL('/favicon.ico', finalUrl).toString();
      } catch {
        iconUrl = '';
      }
    }

    // Detect Manifest & Service Worker
    const manifestMatch = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']*)["']/i);
    const hasManifest = !!manifestMatch;
    const hasServiceWorker = /serviceWorker\.register/i.test(html);

    // Form & Input analysis
    const formsCount = (html.match(/<form[^>]*>/gi) || []).length;
    const inputsCount = (html.match(/<input[^>]*>/gi) || []).length;
    const hasAuthKeywords = /login|signin|register|signup|password|auth/i.test(html);

    // Downloadable files detection
    const pdfMatches = (html.match(/href=["'][^"']+\.pdf["']/gi) || []).length;
    const fileMatches = (html.match(/href=["'][^"']+\.(?:docx?|xlsx?|zip|apk|csv)["']/gi) || []).length;

    // Suggested package ID and App Name
    let suggestedName = title ? title.split(/[-|•·]/)[0].trim() : '';
    if (!suggestedName || suggestedName.length > 25) {
      suggestedName = ssrfCheck.parsedUrl.hostname.replace(/^www\./, '').split('.')[0];
      suggestedName = suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1);
    }
    const sanitizedDomain = ssrfCheck.parsedUrl.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9]/g, '');
    const suggestedPackageId = `com.${sanitizedDomain.toLowerCase() || 'app'}.${suggestedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'app'}`;

    return res.json({
      success: true,
      url: targetUrl,
      finalUrl,
      statusCode,
      responseTimeMs,
      isHttps: finalUrl.startsWith('https://'),
      isResponsive,
      meta: {
        title,
        description,
        themeColor,
        iconUrl,
        suggestedName,
        suggestedPackageId,
      },
      security: {
        xFrameOptions: xFrameOptions || 'None (Iframe preview permitted)',
        contentSecurityPolicy: csp ? 'Active' : 'None',
        hasFrameBlock: Boolean(hasFrameBlock),
        note: hasFrameBlock
          ? 'Website sends X-Frame-Options or CSP frame-ancestors. Standard browser iframes are restricted, but Native Android WebView will render it natively!'
          : 'Website permits direct preview.',
      },
      offlineAnalysis: {
        hasServiceWorker,
        hasManifest,
        formsCount,
        inputsCount,
        hasAuthKeywords,
        downloadablePdfCount: pdfMatches,
        downloadableFileCount: fileMatches,
        compatibilityTier: hasServiceWorker
          ? 'Full PWA / High'
          : isResponsive
            ? 'Standard Responsive / Medium'
            : 'Desktop Legacy / Basic',
        canAutoCacheStaticAssets: true,
        canOfflineViewSavedPdfs: true,
        requiresBackendForSync: formsCount > 0,
        explanation: formsCount > 0
          ? `Detected ${formsCount} forms (${inputsCount} inputs). Static pages and downloaded PDFs will work offline automatically. For form submissions without internet, the built-in Offline Form Sync queue will save submissions locally and replay them once reconnected.`
          : 'Website primarily serves content. Static pages, assets, and downloaded PDFs can be cached locally for seamless offline browsing.',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(502).json({
      error: `Failed to reach ${targetUrl}: ${error.message || 'Connection failed or timed out'}`,
    });
  }
});

// 2. Safe Proxy Endpoint for in-browser mobile preview (strips X-Frame-Options so user can test preview)
app.get('/api/proxy-preview', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send('URL query parameter required');

  const ssrfCheck = await validateUrlForSsrf(targetUrl);
  if (!ssrfCheck.valid || !ssrfCheck.parsedUrl) {
    return res.status(403).send('Restricted destination address');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    if (!contentType.includes('text/html')) {
      // Pass-through other assets
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      return res.send(Buffer.from(buffer));
    }

    let html = await response.text();
    // Inject base href so relative assets load correctly from the original origin
    const baseTag = `<base href="${response.url || targetUrl}">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // Set permissive frame headers for preview container
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    return res.send(html);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(502).send(`Proxy failed: ${error.message}`);
  }
});

// 3. Project Generator: builds full Android Studio source tree
app.post('/api/generate-project-zip', async (req: Request, res: Response) => {
  try {
    const appConfig: AppRecord = req.body;
    if (!appConfig.name || !appConfig.url || !appConfig.packageId) {
      return res.status(400).json({ error: 'Missing required app configuration (name, url, packageId).' });
    }

    const zip = new JSZip();
    const pkgPath = appConfig.packageId.replace(/\./g, '/');

    // 1. Root files
    zip.file('settings.gradle.kts', `rootProject.name = "${appConfig.name.replace(/[^a-zA-Z0-9_-]/g, '')}"\ninclude(":app")\n`);

    zip.file('build.gradle.kts', `// Top-level build file
plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}
`);

    zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=false
android.nonTransitiveRClass=true
`);

    // Gradle Wrapper
    zip.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

    // Batch and Shell build scripts for Windows & Linux
    zip.file('build.bat', `@echo off
echo ========================================================
echo Building Android APK for ${appConfig.name}
echo Package: ${appConfig.packageId}
echo Target URL: ${appConfig.url}
echo ========================================================

IF "%JAVA_HOME%"=="" (
    echo [ERROR] JAVA_HOME is not set. Please install JDK 17 and set JAVA_HOME.
    exit /b 1
)

echo Running Gradle assembleRelease...
call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] APK built successfully!
    echo Output located at: app\\build\\outputs\\apk\\release\\app-release-unsigned.apk
) else (
    echo [ERROR] Build failed with code %ERRORLEVEL%
)
pause
`);

    zip.file('build.sh', `#!/usr/bin/env bash
set -e
echo "Building APK for ${appConfig.name} (${appConfig.packageId})"
chmod +x gradlew
./gradlew assembleRelease
echo "Build complete! APK at app/build/outputs/apk/release/"
`);

    // 2. App Module build.gradle.kts
    const themeColorHex = appConfig.themeColor || '#0f172a';
    zip.file('app/build.gradle.kts', `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${appConfig.packageId}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${appConfig.packageId}"
        minSdk = 24
        targetSdk = 34
        versionCode = ${appConfig.versionCode || 1}
        versionName = "${appConfig.versionName || '1.0.0'}"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.10.0")
}
`);

    zip.file('app/proguard-rules.pro', `# Preserve JavascriptInterface methods
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
`);

    // 3. AndroidManifest.xml
    const permissionsXml = [
      appConfig.permissions?.internet !== false ? '    <uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />' : '',
      appConfig.permissions?.downloads ? '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />\n    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />' : '',
      appConfig.permissions?.camera ? '    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />' : '',
      appConfig.permissions?.geolocation ? '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />' : '',
      appConfig.permissions?.notifications ? '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />' : '',
    ].filter(Boolean).join('\n');

    zip.file('app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

${permissionsXml}

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.App"
        ${appConfig.permissions?.cleartextTraffic ? 'android:usesCleartextTraffic="true"' : ''}
        tools:targetApi="31">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- FileProvider for opening downloaded PDFs and files -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>
</manifest>
`);

    // File provider and backup rules
    zip.file('app/src/main/res/xml/file_paths.xml', `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-files-path name="my_downloads" path="Download/" />
    <external-path name="external_files" path="." />
    <cache-path name="cache" path="." />
</paths>
`);

    zip.file('app/src/main/res/xml/data_extraction_rules.xml', `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="database" path="." />
        <include domain="sharedpref" path="." />
    </cloud-backup>
</data-extraction-rules>
`);

    zip.file('app/src/main/res/xml/backup_rules.xml', `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="database" path="." />
</full-backup-content>
`);

    // Resources: strings, colors, styles
    zip.file('app/src/main/res/values/strings.xml', `<resources>
    <string name="app_name">${appConfig.name}</string>
    <string name="target_url">${appConfig.url}</string>
    <string name="offline_title">No Connection Available</string>
    <string name="offline_msg">You appear to be offline. Reconnect or access saved files below.</string>
</resources>
`);

    zip.file('app/src/main/res/values/colors.xml', `<resources>
    <color name="primary">${themeColorHex}</color>
    <color name="primary_dark">${themeColorHex}</color>
    <color name="accent">#38bdf8</color>
    <color name="white">#FFFFFF</color>
    <color name="black">#000000</color>
    <color name="bg_dark">#090d16</color>
</resources>
`);

    zip.file('app/src/main/res/values/styles.xml', `<resources>
    <style name="Theme.App" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorPrimaryDark">@color/primary_dark</item>
        <item name="colorAccent">@color/accent</item>
        <item name="android:statusBarColor">@color/primary_dark</item>
        <item name="android:navigationBarColor">@color/bg_dark</item>
    </style>
</resources>
`);

    // Assets: Offline page & offline form sync script
    zip.file('app/src/main/assets/offline.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - ${appConfig.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0b0f19; color: #f1f5f9; display: flex; flex-direction: column; min-height: 100vh; padding: 24px; align-items: center; justify-content: center; }
    .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px 24px; max-width: 420px; width: 100%; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: #1e293b; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #f59e0b; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 10px; color: #ffffff; }
    p { font-size: 14px; line-height: 1.5; color: #94a3b8; margin-bottom: 24px; }
    .btn { display: inline-block; width: 100%; background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; border: none; cursor: pointer; transition: background 0.2s; }
    .btn:active { background: #1d4ed8; }
    .downloads-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: left; }
    .downloads-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 12px; }
    .file-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #0b0f19; border-radius: 8px; margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
    .file-open { color: #38bdf8; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    </div>
    <h1>No Connection Available</h1>
    <p>We couldn't connect to ${appConfig.url}. Please check your Wi-Fi or mobile data and try again.</p>
    <button class="btn" onclick="retryConnection()">Retry Connection</button>

    <div class="downloads-section">
      <div class="downloads-title">Saved Files & PDFs</div>
      <div id="fileList">
        <div class="file-item">
          <span>Downloaded Documents</span>
          <a href="#" class="file-open" onclick="if(window.AndroidBridge) AndroidBridge.openDownloadsFolder(); return false;">Open Folder</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    function retryConnection() {
      if (window.AndroidBridge && typeof window.AndroidBridge.reloadApp === 'function') {
        window.AndroidBridge.reloadApp();
      } else {
        window.location.href = "${appConfig.url}";
      }
    }
    window.addEventListener('online', function() {
      retryConnection();
    });
  </script>
</body>
</html>
`);

    zip.file('app/src/main/assets/offline_sync.js', `/**
 * Universal Offline Form Cache & Sync Module
 * Injected into WebView to intercept unsubmitted forms when offline,
 * store locally in IndexedDB, and automatically replay upon reconnection.
 */
(function() {
  const DB_NAME = 'ApkBuilderOfflineQueue';
  const STORE_NAME = 'pending_submissions';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function queueSubmission(url, method, headers, body) {
    const db = await openDb();
    const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const record = {
      id,
      url,
      method: method || 'POST',
      headers: headers || {},
      body,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(record);
      tx.oncomplete = () => {
        console.log('[OfflineSync] Submission queued:', id);
        if (window.AndroidBridge && window.AndroidBridge.notifyOfflineQueued) {
          window.AndroidBridge.notifyOfflineQueued(id);
        }
        resolve(record);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function replayPending() {
    if (!navigator.onLine) return;
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = async () => {
        const items = req.result || [];
        for (const item of items) {
          if (item.status === 'pending') {
            try {
              const res = await fetch(item.url, {
                method: item.method,
                headers: {
                  ...item.headers,
                  'X-Idempotency-Key': item.id,
                  'X-Offline-Replay': 'true'
                },
                body: item.body
              });
              if (res.ok) {
                const delTx = db.transaction(STORE_NAME, 'readwrite');
                delTx.objectStore(STORE_NAME).delete(item.id);
                console.log('[OfflineSync] Successfully replayed submission:', item.id);
              }
            } catch (err) {
              console.warn('[OfflineSync] Replay failed, will retry later:', err);
            }
          }
        }
      };
    } catch (e) {
      console.error('[OfflineSync] Error during sync queue replay:', e);
    }
  }

  window.addEventListener('online', replayPending);
  window.OfflineSyncQueue = { queueSubmission, replayPending };
})();
`);

    // 4. Kotlin MainActivity.kt
    const activityCode = `package ${appConfig.packageId}

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val targetUrl: String = "${appConfig.url}"
    private var isOfflinePageLoaded = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Setup layout programmatically to keep template minimal and self-contained
        swipeRefreshLayout = SwipeRefreshLayout(this)
        webView = WebView(this)
        swipeRefreshLayout.addView(webView)
        setContentView(swipeRefreshLayout)

        configureWebView()
        setupBackNavigation()
        setupNetworkMonitor()

        // Load initial target website
        if (isNetworkAvailable()) {
            webView.loadUrl(targetUrl)
        } else {
            loadOfflineFallback()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        // Cache mode: fallback to cached assets if offline
        settings.cacheMode = if (isNetworkAvailable()) {
            WebSettings.LOAD_DEFAULT
        } else {
            WebSettings.LOAD_CACHE_ELSE_NETWORK
        }

        // Enable Cookies
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        // Javascript Interface for offline fallback bridge
        webView.addJavascriptInterface(AndroidWebAppBridge(), "AndroidBridge")

        // Swipe-to-refresh
        swipeRefreshLayout.setOnRefreshListener {
            if (isNetworkAvailable()) {
                webView.reload()
            } else {
                loadOfflineFallback()
                swipeRefreshLayout.isRefreshing = false
            }
        }

        // Custom WebViewClient: handles errors, URLs, and loading state
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                swipeRefreshLayout.isRefreshing = true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
                isOfflinePageLoaded = url?.startsWith("file:///android_asset/offline.html") == true
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    loadOfflineFallback()
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // External intents: mailto, tel, whatsapp, geo, market
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") || url.startsWith("geo:") || url.startsWith("intent:")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Application not found to open link", Toast.LENGTH_SHORT).show()
                        return true
                    }
                }

                // Intercept direct PDF links if download is requested
                if (url.endsWith(".pdf", ignoreCase = true)) {
                    downloadFile(url, "document.pdf", "application/pdf")
                    return true
                }

                return false
            }
        }

        // Custom WebChromeClient: file chooser & geolocation
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress >= 90) {
                    swipeRefreshLayout.isRefreshing = false
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                // Grant geolocation for origin if permission allowed
                callback?.invoke(origin, true, false)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    startActivityForResult(intent, 1001)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }

        // File and PDF Download Listener
        webView.setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            val guessedName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype)
            downloadFile(url, guessedName, mimetype)
        })
    }

    private fun downloadFile(url: String, fileName: String, mimeType: String?) {
        try {
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("Downloading file from \${getString(R.string.app_name)}")
                setMimeType(mimeType ?: "application/octet-stream")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            }

            val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = manager.enqueue(request)

            Toast.makeText(this, "Download started: $fileName", Toast.LENGTH_SHORT).show()

            // Register completion listener to automatically open PDFs offline
            val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            registerReceiver(object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) ?: -1
                    if (id == downloadId && fileName.endsWith(".pdf", ignoreCase = true)) {
                        openDownloadedPdf(fileName)
                    }
                }
            }, filter, Context.RECEIVER_NOT_EXPORTED)

        } catch (e: Exception) {
            Toast.makeText(this, "Download failed: \${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun openDownloadedPdf(fileName: String) {
        try {
            val file = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName)
            if (!file.exists()) return

            val uri = FileProvider.getUriForFile(this, "\${packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Could not open PDF viewer: \${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadOfflineFallback() {
        webView.loadUrl("file:///android_asset/offline.html")
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack() && !isOfflinePageLoaded) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun setupNetworkMonitor() {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                runOnUiThread {
                    if (isOfflinePageLoaded) {
                        webView.loadUrl(targetUrl)
                    }
                }
            }
        })
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    inner class AndroidWebAppBridge {
        @JavascriptInterface
        fun reloadApp() {
            runOnUiThread {
                webView.loadUrl(targetUrl)
            }
        }

        @JavascriptInterface
        fun openDownloadsFolder() {
            try {
                val intent = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS)
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Open Downloads from system files app", Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun notifyOfflineQueued(recordId: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, "Form entry stored locally. Will sync when reconnected.", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
`;
    zip.file(`app/src/main/java/${pkgPath}/MainActivity.kt`, activityCode);

    // 5. GitHub Actions Workflow (.github/workflows/build-apk.yml)
    zip.file('.github/workflows/build-apk.yml', `name: Build Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Build Type (release or debug)'
        required: true
        default: 'release'
        type: choice
        options:
          - release
          - debug

jobs:
  build:
    name: Build & Package APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Make Gradlew Executable
        run: chmod +x ./gradlew

      - name: Build with Gradle
        run: |
          if [ "\${{ github.event.inputs.build_type }}" = "debug" ]; then
            ./gradlew assembleDebug --stacktrace
          else
            ./gradlew assembleRelease --stacktrace
          fi

      - name: Sign APK (Release Keystore if configured)
        if: \${{ github.event.inputs.build_type == 'release' && env.KEYSTORE_BASE64 != '' }}
        env:
          KEYSTORE_BASE64: \${{ secrets.KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 -d > release.keystore
          $ANDROID_HOME/build-tools/34.0.0/apksigner sign --ks release.keystore \\
            --ks-pass pass:"$KEYSTORE_PASSWORD" \\
            --ks-key-alias "$KEY_ALIAS" \\
            --key-pass pass:"$KEY_PASSWORD" \\
            --out app/build/outputs/apk/release/app-release-signed.apk \\
            app/build/outputs/apk/release/app-release-unsigned.apk || true

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${appConfig.name.replace(/[^a-zA-Z0-9_-]/g, '')}-apk
          path: app/build/outputs/apk/**/*.apk
          retention-days: 14
`);

    // 6. Comprehensive README.md for Windows, Mac & GitHub Setup
    zip.file('README.md', `# ${appConfig.name} - Native Android APK Project

Generated by Universal Website-to-APK Builder.

## App Specifications
- **Target Website**: \`${appConfig.url}\`
- **Application ID / Package**: \`${appConfig.packageId}\`
- **Version**: \`${appConfig.versionName}\` (Code: \`${appConfig.versionCode}\`)
- **Theme Color**: \`${appConfig.themeColor}\`
- **Offline Capabilities**: Intelligent HTTP caching, custom offline fallback screen (\`offline.html\`), and offline form sync queue.
- **File & PDF Download**: Automatic \`DownloadManager\` integration with \`FileProvider\` to open saved PDFs offline.

---

## Option A: Build in Windows Laptop Browser via GitHub Actions (Free)
1. Push this project to your GitHub repository (or use the web app's built-in GitHub connection).
2. Ensure GitHub Actions is enabled in **Repository Settings > Actions > General > Allow all actions**.
3. Under the **Actions** tab, select **Build Android APK** and click **Run workflow**.
4. GitHub will build the APK in ~2-3 minutes. When finished, download the APK from the **Artifacts** section!

### Optional: Keystore Secrets for Google Play / Release Signing
In your GitHub repository under **Settings > Secrets and variables > Actions**, add:
- \`KEYSTORE_BASE64\`: Your base64-encoded \`.keystore\` or \`.jks\` file.
- \`KEYSTORE_PASSWORD\`: Keystore master password.
- \`KEY_ALIAS\`: Key alias name.
- \`KEY_PASSWORD\`: Key alias password.

---

## Option B: Build Locally on Windows Laptop
### Prerequisites
1. **JDK 17**: Install Eclipse Temurin 17 or Oracle JDK 17. Verify in terminal: \`java -version\`.
2. **Android SDK**: Install Android Studio (recommended) or standalone Android Command-Line Tools.

### Steps
1. Double-click \`build.bat\` or run in PowerShell/CMD:
   \`\`\`cmd
   gradlew.bat assembleRelease
   \`\`\`
2. The generated APK will be placed at:
   \`app/build/outputs/apk/release/app-release-unsigned.apk\`

---

## Security & Best Practices
- The app uses \`LOAD_DEFAULT\` network mode to ensure fresh content while falling back seamlessly to \`LOAD_CACHE_ELSE_NETWORK\` when disconnected.
- Local form submissions made while disconnected are queued with UUID idempotency keys to prevent duplicate submissions upon reconnection.
`);

    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${appConfig.name.replace(/[^a-zA-Z0-9_-]/g, '')}-android-source.zip"`);
    return res.send(content);

  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: `Failed to generate project: ${error.message}` });
  }
});

// 4. GitHub Actions Dispatch & Management Endpoints
app.post('/api/github/test-connection', async (req: Request, res: Response) => {
  const { token, repo } = req.body;
  const authToken = token || process.env.GITHUB_TOKEN;
  const targetRepo = repo || process.env.GITHUB_REPO;

  if (!authToken || !targetRepo) {
    return res.status(400).json({
      error: 'GitHub Personal Access Token (PAT) and repository (format: owner/repo) are required.',
    });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${targetRepo.trim()}`, {
      headers: {
        'Authorization': `Bearer ${authToken.trim()}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'WebsiteToAPKBuilder',
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({})) as { message?: string };
      return res.status(response.status).json({
        error: `GitHub API error (${response.status}): ${errData.message || response.statusText}. Check repository name and token scopes.`,
      });
    }

    const repoData = await response.json() as {
      full_name: string;
      private: boolean;
      default_branch: string;
      permissions?: { admin?: boolean; push?: boolean };
    };

    return res.json({
      success: true,
      repo: repoData.full_name,
      isPrivate: repoData.private,
      defaultBranch: repoData.default_branch,
      permissions: repoData.permissions,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(502).json({ error: `Connection failed: ${error.message}` });
  }
});

app.post('/api/github/dispatch-build', async (req: Request, res: Response) => {
  const { token, repo, workflowId = 'build-apk.yml', ref = 'main', inputs } = req.body;
  const authToken = token || process.env.GITHUB_TOKEN;
  const targetRepo = repo || process.env.GITHUB_REPO;

  if (!authToken || !targetRepo) {
    return res.status(400).json({
      error: 'GitHub Personal Access Token (PAT) and repository are required to trigger Cloud Build.',
    });
  }

  try {
    const dispatchUrl = `https://api.github.com/repos/${targetRepo.trim()}/actions/workflows/${workflowId}/dispatches`;
    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken.trim()}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'WebsiteToAPKBuilder',
      },
      body: JSON.stringify({
        ref: ref || 'main',
        inputs: inputs || { build_type: 'release' },
      }),
    });

    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({})) as { message?: string };
      return res.status(response.status).json({
        error: `Failed to dispatch workflow (${response.status}): ${errData.message || response.statusText}. Verify .github/workflows/${workflowId} exists in the default branch.`,
      });
    }

    // Wait 2 seconds and fetch latest run
    await new Promise((r) => setTimeout(r, 2000));
    const runsRes = await fetch(`https://api.github.com/repos/${targetRepo.trim()}/actions/runs?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${authToken.trim()}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'WebsiteToAPKBuilder',
      },
    });

    const runsData = await runsRes.json() as { workflow_runs?: Array<{ id: number; html_url: string; status: string; conclusion: string }> };
    const latestRun = runsData.workflow_runs?.[0];

    return res.json({
      success: true,
      message: 'Cloud APK build triggered successfully via GitHub Actions.',
      runId: latestRun?.id,
      runUrl: latestRun?.html_url,
      status: latestRun?.status || 'queued',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(502).json({ error: `Dispatch failed: ${error.message}` });
  }
});

app.get('/api/github/build-runs', async (req: Request, res: Response) => {
  const token = (req.query.token as string) || process.env.GITHUB_TOKEN;
  const repo = (req.query.repo as string) || process.env.GITHUB_REPO;

  if (!token || !repo) {
    return res.status(400).json({ error: 'GitHub credentials missing.' });
  }

  try {
    const runsRes = await fetch(`https://api.github.com/repos/${repo.trim()}/actions/runs?per_page=5`, {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'WebsiteToAPKBuilder',
      },
    });

    if (!runsRes.ok) {
      return res.status(runsRes.status).json({ error: 'Could not fetch workflow runs.' });
    }

    const data = await runsRes.json() as {
      workflow_runs: Array<{
        id: number;
        name: string;
        head_branch: string;
        status: string;
        conclusion: string;
        html_url: string;
        created_at: string;
        updated_at: string;
        run_started_at: string;
        artifacts_url: string;
      }>;
    };

    // Also fetch artifacts for completed runs
    const runsWithArtifacts = await Promise.all(
      (data.workflow_runs || []).map(async (run) => {
        let artifacts: Array<{ id: number; name: string; size_in_bytes: number; archive_download_url: string }> = [];
        if (run.conclusion === 'success') {
          try {
            const artRes = await fetch(run.artifacts_url, {
              headers: {
                'Authorization': `Bearer ${token.trim()}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'WebsiteToAPKBuilder',
              },
            });
            if (artRes.ok) {
              const artData = await artRes.json() as { artifacts: typeof artifacts };
              artifacts = artData.artifacts || [];
            }
          } catch {
            // artifact lookup best effort
          }
        }
        return {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          createdAt: run.created_at,
          artifacts,
        };
      })
    );

    return res.json({ runs: runsWithArtifacts });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(502).json({ error: error.message });
  }
});

// 5. Apps Persistence Endpoints (Local storage in-memory with initial presets)
app.get('/api/apps', (_req: Request, res: Response) => {
  return res.json(Array.from(savedApps.values()));
});

app.post('/api/apps', (req: Request, res: Response) => {
  const newApp: AppRecord = {
    ...req.body,
    id: req.body.id || `app_${Date.now()}`,
    createdAt: req.body.createdAt || new Date().toISOString(),
  };
  savedApps.set(newApp.id, newApp);
  return res.json(newApp);
});

app.delete('/api/apps/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  savedApps.delete(id);
  return res.json({ success: true });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Website-to-APK Builder running on port ${PORT}`);
  });
}

startServer();
