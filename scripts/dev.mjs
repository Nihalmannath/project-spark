import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pythonCandidates =
  process.platform === "win32"
    ? ["pipeline/.venv/Scripts/python.exe", "python.exe"]
    : ["pipeline/.venv/bin/python", "python3"];
const python =
  process.env.PYTHON ??
  pythonCandidates.find((candidate) => existsSync(path.resolve(root, candidate))) ??
  pythonCandidates.at(-1);

const api = spawn(
  python,
  ["-m", "uvicorn", "serve:app", "--app-dir", "pipeline", "--host", "127.0.0.1", "--port", "8000"],
  { cwd: root, stdio: "inherit" },
);
const web = spawn(
  process.execPath,
  [path.resolve(root, "node_modules/vite/bin/vite.js"), "dev", ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit" },
);

let stopping = false;
function terminate(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    child.kill("SIGTERM");
  }
}

function stop() {
  if (stopping) return;
  stopping = true;
  terminate(api);
  terminate(web);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stop();
    process.exit(0);
  });
}

api.on("error", (error) => {
  console.error(`Inference service failed to start: ${error.message}`);
});
api.on("exit", (code) => {
  if (!stopping && code) {
    console.error(`Inference service exited with code ${code}. The map will remain available.`);
  }
});
web.on("exit", (code) => {
  stop();
  process.exitCode = code ?? 0;
});
