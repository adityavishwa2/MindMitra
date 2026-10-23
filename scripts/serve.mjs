import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const [mode, ...args] = process.argv.slice(2);
const children = [
  spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      mode,
      "--hostname",
      "0.0.0.0",
      ...args,
    ],
    { stdio: "inherit" },
  ),
  spawn(process.execPath, ["--import", "tsx", "scripts/pdf-worker.ts"], {
    stdio: "inherit",
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timeout = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 10_000);
  timeout.unref();
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
