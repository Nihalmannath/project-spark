# Pipeline and Backend on This Laptop

This note is specific to the current Windows laptop:

- Machine path root:
  `C:\Users\LEGION\Documents\GitHub\Urban-Food-desert-identification-Thesis\Desktop\Thesis(Sync)\Thesis (3rdterm final)\PROTOTYPE\project-spark`
- Python:
  `C:\Users\LEGION\AppData\Local\Programs\Python\Python312\python.exe`
- Backend folder:
  `...\project-spark\pipeline`

## What this backend does

The React app uses static files in `public/data/` for the baseline city maps.
The Python backend is only needed for live scenario recomputation.

Endpoints exposed by `serve.py`:

- `GET /api/health`
  checks that the service is alive and lists available cities
- `GET /api/meta/{city}`
  returns city metadata from `public/data/*_meta.json`
- `POST /api/scenario/{city}`
  recomputes the scenario effect around a placed hub using the exported graph data

## Why the original launch failed on this laptop

Two laptop-specific issues showed up:

1. Running `uvicorn serve:app` from the repo root failed because `serve.py` lives in `project-spark\pipeline`, not in the parent repository root.
2. The global Python environment had an incompatible FastAPI stack, and SciPy extension modules were blocked by Windows application control. To avoid that, the backend now:
   - runs inside a local virtual environment at `pipeline\.venv`
   - does not require SciPy at runtime for `serve.py`

## Current backend design on this laptop

The runtime path for `serve.py` now uses:

- NumPy for percentile ranking and radius filtering
- FastAPI + Uvicorn from the local `.venv`
- pre-exported JSON files in `project-spark\public\data`

SciPy is no longer required for the running API server. The export pipeline can still lazy-load the thesis feature code when `export_nodes.py` is used.

## One-time setup

From PowerShell:

```powershell
cd "C:\Users\LEGION\Documents\GitHub\Urban-Food-desert-identification-Thesis\Desktop\Thesis(Sync)\Thesis (3rdterm final)\PROTOTYPE\project-spark\pipeline"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Start the backend

```powershell
cd "C:\Users\LEGION\Documents\GitHub\Urban-Food-desert-identification-Thesis\Desktop\Thesis(Sync)\Thesis (3rdterm final)\PROTOTYPE\project-spark\pipeline"
.\.venv\Scripts\python.exe -m uvicorn serve:app --host 127.0.0.1 --port 8000
```

Expected health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

Expected response body:

```json
{"ok":true,"cities":["bengaluru","mysuru"]}
```

## Stop the backend

If it is running in the foreground, use `Ctrl+C`.

If it is already running in the background, stop it by PID:

```powershell
Stop-Process -Id <PID>
```

To discover the process using port `8000`:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess
```

## Frontend linkage

The frontend dev server is separate and normally runs on `http://127.0.0.1:5173`.

The React app reads `VITE_INFERENCE_URL` and defaults to:

```text
http://localhost:8000
```

So for this laptop, the standard local pairing is:

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:8000`

## Notes for future maintenance

- `pipeline\.venv\` is intentionally gitignored and should stay local to this laptop.
- `uvicorn.stdout.log` and `uvicorn.stderr.log` are local runtime logs and are already ignored by the repo log patterns.
- If `export_nodes.py` is rerun, it may still depend on the thesis feature module under `data visualisation\gnn_features.py`.
