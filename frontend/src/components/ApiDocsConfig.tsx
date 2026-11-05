import React, { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Server,
  Code2,
  Cpu,
  Database,
  MapPin,
  Globe,
  Sparkles,
} from 'lucide-react';

export const ApiDocsConfig: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const backendEnvContent = `# ==========================================================
# AegisPay - Backend Settings (.env)
# ==========================================================

# Port for Backend Server
PORT=5000

# ---------------------------------------------------------------------------
# 1. OpenStreetMap / Overpass API  (FREE - NO API KEY REQUIRED)
# ---------------------------------------------------------------------------
# Overpass is the public query engine for OpenStreetMap. No signup, token,
# or secret is needed. A descriptive User-Agent is the only requirement.
#   Docs ......... https://wiki.openstreetmap.org/wiki/Overpass_API
#   Test queries . https://overpass-turbo.eu
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OVERPASS_FALLBACK_URLS=https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter
OVERPASS_USER_AGENT=AegisPaySentinel/1.0 (IIM Bangalore hackathon demo)
OVERPASS_TIMEOUT_SECONDS=45
OVERPASS_MAX_RETRIES=3
OVERPASS_BACKOFF_MS=3000
OVERPASS_CATEGORY_DELAY_MS=1200

# Search area: south,west,north,east around central Bengaluru.
# Pick any bbox at https://www.openstreetmap.org/export
OSM_BBOX=12.93,77.56,13.02,77.65
OSM_CITY=Bengaluru
OSM_STATE=Karnataka
OSM_MAX_PER_CATEGORY=8

# Normalized cache / bundled snapshot directory (relative to backend/)
OSM_DATA_DIR=src/data
OSM_CACHE_TTL_MINUTES=720

# ---------------------------------------------------------------------------
# 2. Google Gemini API Key (optional - powers the AI Investigation tab)
# Get a free key at: https://aistudio.google.com/apikey
# ---------------------------------------------------------------------------
GEMINI_API_KEY=your_gemini_api_key_here

# ---------------------------------------------------------------------------
# 3. (Optional) PayU Payment Gateway Test Keys
# Get test credentials at: https://dashboard.payu.in/
# ---------------------------------------------------------------------------
PAYU_MERCHANT_KEY=your_payu_merchant_key_here
PAYU_MERCHANT_SALT=your_payu_merchant_salt_here
PAYU_ENV=test

# ---------------------------------------------------------------------------
# OPTIONAL commercial geodata upgrades (NOT required by this project)
# ---------------------------------------------------------------------------
# The app only reads the Overpass variables above. If you later want an
# SLA-backed provider with richer place metadata, get a free key here and add
# a matching adapter:
#   Geoapify ......... https://myprojects.geoapify.com
#   Foursquare Places  https://foursquare.com/developers
#   Google Places ..... https://console.cloud.google.com/google/maps-apis
#   Mapbox ............ https://account.mapbox.com/access-tokens
# GEOAPIFY_API_KEY=
# FOURSQUARE_API_KEY=
# GOOGLE_PLACES_API_KEY=
# MAPBOX_ACCESS_TOKEN=
`;

  const frontendEnvContent = `# ==========================================================
# AegisPay - Frontend Settings (.env)
# ==========================================================

# Address of Backend API Server (default is http://localhost:5000)
VITE_API_URL=http://localhost:5000
`;

  const endpoints = [
    {
      method: 'GET',
      path: '/api/osm/status',
      desc: 'Provider, endpoint, cache freshness, and key-less status.',
    },
    {
      method: 'GET',
      path: '/api/osm/shops',
      desc: 'Normalized real OSM shops across all nine categories (display only, no risk data).',
    },
    {
      method: 'POST',
      path: '/api/osm/refresh',
      desc: 'Force a live Overpass fetch and rewrite the cache.',
    },
    {
      method: 'GET',
      path: '/api/merchants?origin=real_osm|simulated|all',
      desc: 'Real OSM identities (display only) and simulated merchants with fictional risk profiles.',
    },
    {
      method: 'GET',
      path: '/api/risk/merchant/:id',
      desc: 'Simulated merchants only; a real OSM id returns HTTP 409.',
    },
    {
      method: 'GET',
      path: '/api/syndicate/graph',
      desc: 'Simulated SIM-* merchant and infrastructure nodes only.',
    },
    {
      method: 'GET',
      path: '/api/ml/model/info',
      desc: 'Measured metrics, provenance and limitations from the FastAPI ML service.',
    },
    {
      method: 'POST',
      path: '/api/ml/score/transaction',
      desc: 'Blended rule + model + graph score for one simulated transaction.',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bf-card rounded-2xl p-6 border border-white/[0.08]">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <Key className="w-3.5 h-3.5 text-emerald-400" />
          Settings Guide &bull; Simple Setup
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          API Setup &amp; Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          The shop data comes from <strong className="text-white">OpenStreetMap via the Overpass API</strong>, which is
          free and key-less. Gemini and PayU are optional. Here is exactly what goes into{' '}
          <code className="text-emerald-400 font-mono">backend/.env</code> and{' '}
          <code className="text-emerald-400 font-mono">frontend/.env</code>.
        </p>
      </div>

      {/* Which APIs to Put Section */}
      <div className="bf-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Which APIs You Need to Put
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Overpass / OSM */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  OpenStreetMap / Overpass
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold whitespace-nowrap">
                  PRIMARY DATA
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Fetches real bakeries, restaurants, grocery stores, pharmacies, electronics shops, clothing stores,
                hotels, and convenience stores. No signup and no API key. Only a descriptive User-Agent is required.
              </p>
              <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>Setting Names: <span className="text-emerald-400 font-bold">OVERPASS_* , OSM_*</span></div>
                <div>Where to Put: <span className="text-slate-300">backend/.env</span></div>
                <div>Cost: <span className="text-slate-300">Free &bull; no key</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
              <a
                href="https://wiki.openstreetmap.org/wiki/Overpass_API"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>Overpass API Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://overpass-turbo.eu"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <span>Test queries in Overpass Turbo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Gemini API */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Google Gemini API Key
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold whitespace-nowrap">
                  OPTIONAL AI
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Powers the AI investigation dossier. Without it, the backend falls back to a deterministic heuristic
                report so the demo still works end to end.
              </p>
              <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>Setting Name: <span className="text-amber-400 font-bold">GEMINI_API_KEY</span></div>
                <div>Where to Put: <span className="text-slate-300">backend/.env</span></div>
                <div>Model Used: <span className="text-slate-300">gemini-2.5-flash</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
              >
                <span>Get Free Gemini Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] text-slate-500">AI Studio</span>
            </div>
          </div>

          {/* PayU Credentials */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  PayU Gateway Keys
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold whitespace-nowrap">
                  OPTIONAL
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Only needed to connect a real PayU test account. The website already includes a built-in live test
                simulator, so everything can be demonstrated without these.
              </p>
              <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>Setting Names: <span className="text-sky-400 font-bold">PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT</span></div>
                <div>Where to Put: <span className="text-slate-300">backend/.env</span></div>
                <div>Env: <span className="text-slate-300">test</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <a
                href="https://dashboard.payu.in/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <span>PayU Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] text-slate-500">Optional</span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional keyed providers */}
      <div className="bf-card rounded-2xl p-6 border border-white/[0.08] space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" />
          Optional Keyed Geodata Upgrades
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          These are <strong className="text-white">not required</strong> and are not read by the current code. They are
          listed only if you later want an SLA-backed provider with richer place metadata.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { name: 'Geoapify', env: 'GEOAPIFY_API_KEY', url: 'https://myprojects.geoapify.com' },
            { name: 'Foursquare Places', env: 'FOURSQUARE_API_KEY', url: 'https://foursquare.com/developers' },
            { name: 'Google Places', env: 'GOOGLE_PLACES_API_KEY', url: 'https://console.cloud.google.com/google/maps-apis' },
            { name: 'Mapbox', env: 'MAPBOX_ACCESS_TOKEN', url: 'https://account.mapbox.com/access-tokens' },
          ].map((provider) => (
            <a
              key={provider.env}
              href={provider.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/40 transition-colors"
            >
              <span className="min-w-0">
                <span className="text-slate-200 font-semibold block truncate">{provider.name}</span>
                <span className="text-[10px] font-mono text-slate-500 block truncate">{provider.env}</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Env File Snippets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend .env */}
        <div className="bf-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white font-mono">backend/.env</h4>
            </div>
            <button
              onClick={() => copyToClipboard(backendEnvContent, 'backend')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'backend' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 max-h-[420px] overflow-y-auto">
            {backendEnvContent}
          </pre>
        </div>

        {/* Frontend .env */}
        <div className="bf-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white font-mono">frontend/.env</h4>
            </div>
            <button
              onClick={() => copyToClipboard(frontendEnvContent, 'frontend')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              {copiedKey === 'frontend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'frontend' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
            {frontendEnvContent}
          </pre>

          <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Want a different city? Change <code className="text-emerald-400 font-mono">OSM_BBOX</code> in{' '}
              <code className="text-emerald-400 font-mono">backend/.env</code>. Grab coordinates from{' '}
              <a
                href="https://www.openstreetmap.org/export"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                openstreetmap.org/export
              </a>
              , then restart the backend.
            </p>
          </div>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="bf-card rounded-2xl p-6 border border-white/[0.08] space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Data Endpoints
        </h3>
        <div className="space-y-2">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800"
            >
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 w-fit ${
                  endpoint.method === 'POST'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {endpoint.method}
              </span>
              <code className="text-xs text-slate-200 font-mono shrink-0">{endpoint.path}</code>
              <span className="text-[11px] text-slate-500 sm:ml-auto">{endpoint.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          Base URL: http://localhost:5000 &bull; the frontend reads it from VITE_API_URL
        </p>
      </div>

      {/* Terminal Instructions */}
      <div className="bf-card rounded-2xl p-6 border border-white/[0.08]">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          How to Start the Website
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 block font-sans font-semibold">1. Start Backend:</span>
            <div className="text-emerald-400">cd backend</div>
            <div className="text-slate-300">npm install</div>
            <div className="text-slate-300">npm run build</div>
            <div className="text-slate-300">npm start</div>
            <span className="text-[10px] text-slate-500 block font-sans">
              Runs on http://localhost:5000
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 block font-sans font-semibold">2. Start Frontend:</span>
            <div className="text-emerald-400">cd frontend</div>
            <div className="text-slate-300">npm install</div>
            <div className="text-slate-300">npm run build</div>
            <div className="text-slate-300">npm run dev</div>
            <span className="text-[10px] text-slate-500 block font-sans">
              Runs on http://localhost:5173
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 block font-sans font-semibold">3. Refresh real shop data:</span>
            <div className="text-slate-300">cd backend</div>
            <div className="text-emerald-400">npm run osm:sync</div>
            <span className="text-[10px] text-slate-500 block font-sans">
              Live Overpass fetch &bull; rewrites src/data/osm_shops.json
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 block font-sans font-semibold">4. Offline fallback sync:</span>
            <div className="text-slate-300">cd backend</div>
            <div className="text-emerald-400">npm run osm:sync:snapshot</div>
            <span className="text-[10px] text-slate-500 block font-sans">
              Uses the bundled snapshot when Overpass is unreachable
            </span>
          </div>
        </div>
      </div>

      {/* Honesty note */}
      <div className="bf-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/[0.03]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Demo Data Honesty Note</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Shop names and addresses are real OpenStreetMap records. Every risk score, transaction, tier, intervention,
              and syndicate link is synthetic demo data. No real business is being accused of fraud. Synthetic merchant
              identities use <code className="text-amber-300 font-mono">DEMO-PAN-*</code> and{' '}
              <code className="text-amber-300 font-mono">DEMO-GSTIN-*</code> placeholders.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono pb-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        Overpass is key-less. Gemini and PayU keys are optional.
      </div>
    </div>
  );
};
