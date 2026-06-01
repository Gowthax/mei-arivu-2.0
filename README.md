# 🌿 Mei Arivu — Smart Waste Intelligence Platform

## Quick Start

### 1. Add your Groq API Key
Open `backend/.env` and replace the placeholder:
```
GROQ_API_KEY=your_actual_groq_api_key_here
```
Get a free key at: https://console.groq.com

---

### 2. Start the Backend
Open a terminal in the `backend/` folder and run:
```bash
npm start
```
Backend will be live at: `http://localhost:8000`

---

### 3. Start the Frontend
Open a **separate terminal** in the `frontend/` folder and run:
```bash
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

## First-Time Setup (only needed once)

### Backend Dependencies
```bash
# In the backend/ folder:
npm run install-deps
```

### Frontend Dependencies
```bash
# In the frontend/ folder:
npm install
```

---

## Project Structure

```
Mei Arivu clone/
├── backend/           ← FastAPI Python server
│   ├── .env           ← 🔑 Add your GROQ_API_KEY here
│   ├── main.py        ← API endpoints + Groq AI brain
│   ├── simulator.py   ← Live IoT telemetry simulator
│   ├── db_models.py   ← SQLite database models
│   └── package.json   ← npm start → uvicorn
│
└── frontend/          ← Vite + React app
    ├── src/components/
    │   ├── TelemetryView.jsx   ← AI Diagnosis Page
    │   ├── PathogenRadar.jsx   ← Incident Management
    │   ├── CommandCenter.jsx   ← Madurai Map
    │   └── BioSupplyInventory.jsx
    └── package.json   ← npm run dev → Vite
```

---

## Available Commands

| Location   | Command              | Action                    |
|------------|----------------------|---------------------------|
| `backend/` | `npm start`          | Start FastAPI server      |
| `backend/` | `npm run install-deps` | Install Python packages |
| `frontend/`| `npm run dev`        | Start React dev server    |
| `frontend/`| `npm run build`      | Build for production      |
