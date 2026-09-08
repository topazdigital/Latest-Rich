import { spawn } from "node:child_process";

const apiPort = process.env.CHATMODZ_API_PORT || "8081";
const api = spawn(
  "pnpm",
  ["--filter", "@workspace/chatmodz-api", "run", "dev"],
  {
    cwd: process.cwd(),
    env: { ...process.env, PORT: apiPort, CHATMODZ_API_PORT: apiPort },
    stdio: "inherit",
    shell: true,
  },
);

const vite = spawn(
  "vite",
  ["--config", "vite.config.ts", "--host", "0.0.0.0"],
  { cwd: process.cwd(), env: process.env, stdio: "inherit", shell: true },
);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill("SIGTERM");
  vite.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250);
}

api.on("exit", (code, signal) => {
  if (!shuttingDown && code !== 0) shutdown(code || 1);
});
vite.on("exit", (code, signal) => {
  if (!shuttingDown && code !== 0) shutdown(code || 1);
});
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));