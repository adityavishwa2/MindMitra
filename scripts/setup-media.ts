import "dotenv/config";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { resolveMediaTool, mediaSetupCommand } from "../lib/media-tools";
const exec = promisify(execFile);
async function check() {
  let ready = true;
  for (const name of ["ffmpeg", "ffprobe"] as const) {
    try {
      await exec(resolveMediaTool(name), ["-version"], {
        timeout: 10000,
        maxBuffer: 100000,
        windowsHide: true,
      });
      console.log(`OK: ${name} is available`);
    } catch {
      ready = false;
      console.log(`MISSING OR UNUSABLE: ${name}`);
    }
  }
  return ready;
}
function install(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error("Installer did not finish successfully")),
    );
  });
}
async function main() {
  if (await check()) {
    console.log(
      "Video tools are ready. Restart MindMitra if its configuration changed.",
    );
    return;
  }
  if (!process.argv.includes("--install")) {
    console.log(`Install on this server: ${mediaSetupCommand()}`);
    console.log(
      "Or run npm run setup:media -- --install. Close and reopen PowerShell/Terminal afterwards. Restart MindMitra.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    "Installing FFmpeg and FFprobe with the system package manager. Administrator approval may be requested by your operating system.",
  );
  if (process.platform === "win32")
    await install("winget", [
      "install",
      "--id",
      "Gyan.FFmpeg",
      "-e",
      "--accept-package-agreements",
      "--accept-source-agreements",
    ]);
  else if (process.platform === "darwin")
    await install("brew", ["install", "ffmpeg"]);
  else if (process.platform === "linux") {
    const root = process.getuid?.() === 0;
    await install(
      root ? "apt-get" : "sudo",
      root ? ["update"] : ["apt-get", "update"],
    );
    await install(
      root ? "apt-get" : "sudo",
      root
        ? ["install", "-y", "ffmpeg"]
        : ["apt-get", "install", "-y", "ffmpeg"],
    );
  } else
    throw Error(
      "Install FFmpeg/FFprobe manually and configure FFMPEG_PATH and FFPROBE_PATH.",
    );
  if (!(await check())) {
    console.log(
      "The new installation may need a fresh terminal. Restart PowerShell/Terminal and run npm run setup:media again. You can also set absolute FFMPEG_PATH and FFPROBE_PATH in .env.",
    );
    process.exitCode = 1;
  } else
    console.log(
      "Media tools are ready. Restart MindMitra and retry your upload.",
    );
}
main().catch(() => {
  console.error(
    `Setup could not complete. Run the installer manually: ${mediaSetupCommand()}. If you have FFmpeg already, set FFMPEG_PATH and FFPROBE_PATH in .env, restart the app and run npm run setup:media.`,
  );
  process.exitCode = 1;
});
