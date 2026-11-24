# PitStop 🛵⚡

**PitStop** is a standalone, personal full-stack web application and progressive web app (PWA) built specifically for **ONE owner and ONE vehicle: a TVS NTORQ scooter**.

It replaces the official Bluetooth app with reliable telemetry, offline-capable tracking, full-to-full mileage insights, high-contrast GPS ride tracking, a parking finder with compass direction, automated service and document expiry countdowns, and an experimental read-only Bluetooth GATT laboratory.

---

## 🚀 Key Features

1. **Single-Owner Authentication & Security**:
   - First registered user automatically becomes the owner; subsequent registrations are permanently locked (`ALLOW_REGISTRATION=false`).
   - `httpOnly`, `secure`, `sameSite: strict` JWT cookies, bcrypt password hashing.
   - Helmet headers, MongoDB sanitization, input validation with Zod, and rate-limiting.
2. **Setup Wizard**:
   - Collects scooter nickname, model variant, year, registration number, tank capacity in litres (entered by the user—never strictly hardcoded), reserve level (default 1.0 L), and initial odometer.
3. **Cockpit Dashboard**:
   - Hero animated odometer, estimated fuel remaining (litres and %) with range countdown, average mileage (overall and last 5 fills), cost per km, next service due, nearest document expiry, and one-tap quick actions (*Start ride*, *Park here*, *Update odometer*, *Log fuel*).
4. **Odometer Tracker**:
   - Tagged by source: `manual`, `ride`, `fuel`, `service`.
   - Prevents readings lower than previous entries.
   - Explicit "Correct previous reading" bottom-sheet with an immutable audit trail.
   - 14-day inactivity reminder and numeric keypad (`inputmode="numeric"`).
5. **Fuel Log & Personal Mileage Tracker**:
   - Auto-calculating fields: Litres, Rate (₹/L), and Total Cost.
   - Rigorous **full-to-full** mileage calculation between consecutive full fills; intermediate partial fills are accumulated until the next full fill.
   - Estimated fuel left countdown: `capacity - (kmSinceFill / avgMileage)`, labeled as an ESTIMATE, with manual visual level correction.
   - Trip cost estimator with round-trip toggle and fuel sufficiency warning.
   - Rule-based insights: alerts when mileage drops >20% versus recent average.
6. **Ride Tracker & Live GPS**:
   - High-accuracy GPS with `watchPosition` and Screen Wake Lock API.
   - Haversine distance with stationary jitter filtering (<3 m) and poor accuracy filtering (>30 m).
   - High-contrast sunlight readability mode.
   - Restores in-progress ride from `localStorage` upon page reload.
   - Douglas-Peucker route simplification with choice to store route or only statistics.
   - One-tap "Add to odometer" post-ride.
   - Route map detail with Leaflet OpenStreetMap.
7. **Parking Finder & Compass**:
   - "Park here" saves GPS location, time, slot note, and photo.
   - "Find my scooter" shows live distance, compass bearing, time elapsed, and one-tap "Navigate" opening Google Maps / Apple Maps.
   - Retains last 20 parking spots with "Mark as picked up".
8. **Service & Component Log**:
   - Tracks general service, oil changes, tyres, batteries, brakes, and belts.
   - Configurable service intervals (km and months) with 80% warning and 100%+ overdue states.
   - Tyre and battery health tracker with installation odometer and lifespan estimate.
9. **Vehicle Documents & Expiry**:
   - Insurance, PUC, RC, road tax, fitness, and driving license.
   - Urgency status badges: Valid, Expiring Soon (30d), Expiring Very Soon (7d), Expired.
   - "Mark as renewed" maintains historical renewal records.
10. **Bluetooth Lab (Experimental, Read-Only)**:
    - Web Bluetooth API exploration for the TVS NTORQ cluster.
    - Graceful fallback and explanation on unsupported browsers (iOS Safari, Firefox).
    - Read-only GATT service & characteristic discovery tree with standard SIG names.
    - Live raw hex, ASCII, and little/big-endian telemetry packet viewer with JSON/CSV export.
    - Custom "Decoder" gauge experiment to parse byte offsets, scale, and endianness.
11. **Settings, Data Backup & Reports**:
    - Complete JSON backup export and import with preview and deduplication.
    - Server-side generated **PDF Dossier** and **CSV Spreadsheet** for vehicle resale and expense audit.
    - "Erase all location data" privacy action.

---

## 🛠️ Stack & Architecture

- **Frontend**: React 19, Vite 6, Tailwind CSS, Framer Motion, Recharts, Leaflet, Lucide Icons, TanStack Query.
- **Backend**: Node.js 24, Express, Mongoose, Zod, Multer, PDFKit, Web-Push, Helmet.
- **Database**: MongoDB Atlas (or local MongoDB).
- **Deployment**: Vercel (Frontend SPA + API proxy rewrite) and Render (Backend Express API).

---

## 📁 Folder Structure

```
ntorq/
├── vercel.json                 # Vercel deployment & /api/* proxy config
├── package.json                # Root package with workspace scripts
├── scripts/
│   ├── dev.js                  # Concurrently run server and client
│   ├── generate-icons.js       # Generates SVG icons
│   └── generate-pngs.js        # Generates valid binary PNG icons for PWA
├── client/
│   ├── index.html              # HTML shell with Google Fonts & PWA meta
│   ├── vite.config.js          # Vite config with PWA Workbox runtime caching
│   ├── tailwind.config.js      # Carbon & amber cluster design tokens
│   ├── src/
│   │   ├── main.jsx            # Entry point
│   │   ├── index.css           # Instrument cluster styles & safe area insets
│   │   ├── app/
│   │   │   └── App.jsx         # QueryClient, AuthGate, Layout & Router
│   │   ├── components/common/  # BottomNav, Header, BottomSheet, Keypad, Gauges
│   │   ├── features/           # Auth, Home, Odometer, Fuel, Rides, Parking, Service, Docs, Bluetooth, Settings
│   │   ├── hooks/              # useAuth, useVehicle, usePwa, useWakeLock
│   │   └── lib/                # api client, formatters, geo calculations, constants
└── server/
    ├── src/
    │   ├── server.js           # Express app, middleware, route mounting
    │   ├── config/             # env.js, db.js
    │   ├── models/             # 14 Mongoose models (User, Vehicle, FuelEntry, etc.)
    │   ├── controllers/        # Route controllers
    │   ├── routes/             # REST route groups (/api/*)
    │   ├── middleware/         # requireAuth, errorHandler, rateLimiter, upload
    │   ├── services/           # reportsService (PDF/CSV), cloudinaryService, pushNotification
    │   ├── utils/              # Pure calculations (haversine, mileage, service due)
    │   ├── validators/         # Zod request validation schemas
    │   └── tests/              # Vitest calculation & end-to-end flow test suite
```

---

## ⚙️ Environment Variables

### Server (`server/.env`):
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=
JWT_SECRET=super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=30d
ALLOW_REGISTRATION=false
CORS_ORIGIN=http://localhost:5173

# Optional: Cloudinary for receipts and document attachments
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: Web Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:owner@ntorq-companion.local
```

### Client (`client/.env`):
```ini
VITE_APP_NAME="NTORQ Companion"
VITE_API_URL="" # Empty for same-origin proxy (recommended)
```

---

## 💻 Local Setup & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment**:
   Copy `.env.example` in both `client/` and `server/` to `.env` and fill in your MongoDB URI and JWT Secret.
3. **Run Dev Environment**:
   ```bash
   npm run dev
   ```
   - Frontend runs on: `http://localhost:5173`
   - Backend API runs on: `http://localhost:5000` (proxied via Vite)
4. **Run Unit & Flow Tests**:
   ```bash
   npm test
   ```
5. **Run Linting**:
   ```bash
   npm run lint
   ```
6. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🚢 Deployment (Vercel + Render)

### 1. Backend on Render:
- Option A (Blueprint): In Render, click **New +** -> **Blueprint**, select your repo, and Render will auto-deploy the backend using `render.yaml` with your `MONGODB_URI`!
- Option B (Manual): Create a new **Web Service** on Render.
  - Root Directory: `server`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Name: `pitstop-backend` (produces `https://pitstop-backend.onrender.com`)
  - Set Environment Variables:
    - `NODE_ENV=production`
    - `MONGODB_URI=
    - `JWT_SECRET=<your-random-32-char-secret>`
    - `ALLOW_REGISTRATION=false`
    - `CORS_ORIGIN=https://<your-vercel-domain>.vercel.app`

### 2. Frontend on Vercel:
- In Vercel, click **Add New...** -> **Project** and import your repository.
- Root Directory: Leave as `./` (or select `client`).
  - If `./`: Vercel reads `vercel.json` and automatically builds `client/dist`.
  - If `client`: Build Command `npm run build`, Output Directory `dist`.
- In `vercel.json`, requests to `/api/(.*)` automatically proxy to your live Render backend:
  `https://pitstop-g87m.onrender.com/api/$1`
- **Why this proxy?** By proxying `/api/*` through Vercel, the browser treats API requests as same-origin, eliminating third-party cookie restrictions on iOS Safari and installed PWAs!

---

## 🧮 Telemetry & Calculation Logic

### 1. Full-to-Full Mileage Method:
- Mileage is calculated strictly between consecutive **full-tank** refills:
  $$\text{Mileage (km/l)} = \frac{\text{Current Odometer} - \text{Previous Full Odometer}}{\sum \text{Litres (intermediate partial fills)} + \text{Current Full Fill Litres}}$$
- Partial fills are recorded without falsifying mileage figures and accumulated into the next full fill calculation.

### 2. Estimated Fuel Remaining & Range:
- Following a full fill:
  $$\text{Fuel Left (L)} = \text{Capacity} - \left(\frac{\text{KM Driven Since Full Fill}}{\text{Current Average Mileage}}\right)$$
- If the owner sets a manual correction (e.g. "I see about 2.5 litres left"), the algorithm decrements from that visual reference.
- Estimated Range = $\text{Fuel Left} \times \text{Average Mileage}$.
- When fuel left $\le \text{Reserve Level}$ (default 1.0 L), a persistent cockpit alert is triggered.

### 3. Service Due Projection:
- Progress is computed against both distance ($\text{KM Driven} / \text{Interval KM}$) and elapsed time ($\text{Days} / \text{Interval Days}$).
- State is flagged as **Warning** at $\ge 80\%$ and **Overdue** at $\ge 100\%$ or passed target date.
- Next service date is projected dynamically based on the owner's average km/day.

---

## 📱 PWA Installation Guide

### On Android (Chrome / Edge):
1. Navigate to the deployed URL.
2. Tap the in-app **"Install NTORQ"** button or the browser menu (**⋮**) -> **"Install App"** / **"Add to Home screen"**.
3. Launch from your home screen for fullscreen cockpit display and offline telemetry access.

### On iOS (Safari):
1. Open the URL in Safari.
2. Tap the **Share** button (box with upward arrow) at the bottom toolbar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top-right corner.
5. The standalone PWA is now accessible directly from your home screen.

---

## ⚠️ Ride Tracker Limitations Notice

Mobile web browsers (especially Safari on iOS and Chrome with aggressive battery optimization on Android) suspend background JavaScript timers and throttle GPS `watchPosition` once the screen is locked or the app is minimized.
- **Keep the screen on during rides**: The app automatically activates the **Screen Wake Lock API** with an on-screen status indicator.
- If the tab or browser reloads mid-ride, the in-progress trip is automatically restored from local storage.

---

## 🔬 Bluetooth Lab Usage

1. Open **Menu -> Bluetooth Lab**.
2. Tap **Scan Scooter** (requires a user gesture).
3. Select your scooter's Bluetooth cluster from the browser device picker.
4. The lab connects to GATT, discovers accessible services, and displays characteristics with standard Bluetooth SIG identifiers.
5. Tap **Read** or **Notify** to stream unencrypted packets into the live hex/ASCII log.
6. Configure the **Live Decoder** to extract telemetry bytes (speed, battery, status flags) into an animated gauge.
