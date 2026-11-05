# Deployment Guide: AegisPay Sentinel

AegisPay Sentinel is configured for flexible deployment across **Render**, **Vercel**, **Railway**, and any **Docker / Container** cloud provider.

---

## Architecture in Production

In production, AegisPay Sentinel can run as a **unified full-stack application**:
- The **Express Node.js engine** serves all REST endpoints (`/api/merchants`, `/api/transactions`, `/api/ml`, `/api/ai`, `/api/syndicate`).
- The Express engine automatically detects and serves the built **React frontend** from `frontend/dist` on the exact same domain.
- **Benefits:** Single public URL, zero CORS setup needed, automatic client-side routing fallback, and built-in ML heuristic fallback engine if the Python microservice is not hosted separately.

---

## Option 1: Render (Recommended for Full-Stack Monorepo)

Render gives you a free URL (e.g. `https://aegispay-sentinel.onrender.com`) that hosts both the frontend and backend together.

### Method A: Blueprint (1-Click via `render.yaml`)
1. Go to [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** &rarr; **Blueprint**.
3. Select your GitHub repository: `https://github.com/ShauryaSambyal/AegisPay`.
4. Render will automatically read [`render.yaml`](../render.yaml) and configure:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start:prod`
   - **Environment:** Node
5. Click **Apply**. Your app will build and go live within 2–3 minutes.

### Method B: Manual Web Service
1. On [Render](https://dashboard.render.com/), click **New +** &rarr; **Web Service**.
2. Connect `https://github.com/ShauryaSambyal/AegisPay`.
3. Fill in the service settings:
   - **Name:** `aegispay-sentinel`
   - **Region:** Any (e.g. Oregon or Frankfurt)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start:prod`
   - **Instance Type:** `Free`
4. Add Environment Variables (under **Advanced**):
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key for live AI investigations.
5. Click **Create Web Service**.

---

## Option 2: Vercel (Frontend SPA)

If you prefer hosting the React frontend on Vercel's global CDN:

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import the Git repository `ShauryaSambyal/AegisPay`.
3. In the project setup screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `frontend`
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `dist`
4. Environment Variables:
   - Set `VITE_API_URL` to your backend URL (e.g. `https://aegispay-sentinel.onrender.com`).
   - *(If left blank, frontend assumes backend is hosted on the same origin).*
5. Click **Deploy**. Vercel will build and give you a live `*.vercel.app` preview URL.
6. The included [`frontend/vercel.json`](../frontend/vercel.json) automatically handles SPA client-side route rewrites.

---

## Option 3: Railway / Docker

A production-ready multi-stage [`Dockerfile`](../Dockerfile) is included in the root directory:

```bash
# Build the container locally or push to any container registry
docker build -t aegispay-sentinel .

# Run container on port 5000
docker run -p 5000:5000 -e PORT=5000 aegispay-sentinel
```

On **Railway**:
1. Go to [railway.app](https://railway.app/new).
2. Click **Deploy from GitHub repo** &rarr; Select `ShauryaSambyal/AegisPay`.
3. Railway automatically detects the `Dockerfile` and deploys your fullstack service.
4. Add your domain under **Settings &rarr; Networking &rarr; Generate Domain**.
