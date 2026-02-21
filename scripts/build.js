const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { spawn } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

let metroProcess = null;

/* ============================
   UTILS
============================ */

function exitWithError(message) {
  console.error(message);
  if (metroProcess) metroProcess.kill();
  process.exit(1);
}

function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log("Cleaning up Metro process...");
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

function stripProtocol(domain) {
  let urlString = domain.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  return new URL(urlString).host;
}

function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN)
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);

  if (process.env.REPLIT_DEV_DOMAIN)
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);

  if (process.env.EXPO_PUBLIC_DOMAIN)
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);

  exitWithError(
    "No deployment domain found. Set REPLIT_INTERNAL_APP_DOMAIN, REPLIT_DEV_DOMAIN, or EXPO_PUBLIC_DOMAIN"
  );
}

/* ============================
   PREPARE
============================ */

function prepareDirectories(timestamp) {
  console.log("Preparing build directories...");

  if (fs.existsSync("static-build")) {
    fs.rmSync("static-build", { recursive: true, force: true });
  }

  const dirs = [
    path.join("static-build", timestamp, "_expo", "static", "js", "ios"),
    path.join("static-build", timestamp, "_expo", "static", "js", "android"),
    path.join("static-build", "ios"),
    path.join("static-build", "android"),
  ];

  dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  console.log("Build:", timestamp);
}

function clearMetroCache() {
  console.log("Clearing Metro cache...");

  const cacheDirs = [
    ...glob.sync(".metro-cache"),
    ...glob.sync("node_modules/.cache/metro"),
  ];

  cacheDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  console.log("Cache cleared");
}

/* ============================
   METRO
============================ */

async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status", {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function startMetro(expoPublicDomain) {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro already running");
    return;
  }

  console.log("Starting Metro...");
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
  };

  metroProcess = spawn("npm", ["run", "expo:start:static:build"], {
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });

  metroProcess.stdout?.on("data", (d) =>
    console.log(`[Metro] ${d.toString().trim()}`)
  );

  metroProcess.stderr?.on("data", (d) =>
    console.error(`[Metro Error] ${d.toString().trim()}`)
  );

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkMetroHealth()) {
      console.log("Metro ready");
      return;
    }
  }

  exitWithError("Metro timeout");
}

/* ============================
   DOWNLOAD CORE
============================ */

async function downloadFile(url, outputPath) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const file = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(response.body), file);

    if (fs.statSync(outputPath).size === 0) {
      fs.unlinkSync(outputPath);
      throw new Error("Downloaded file is empty");
    }
  } catch (error) {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundle(platform, timestamp) {
  const url = new URL(
    "http://localhost:8081/node_modules/expo-router/entry.bundle"
  );

  url.searchParams.set("platform", platform);
  url.searchParams.set("dev", "false");
  url.searchParams.set("minify", "true");

  const output = path.join(
    "static-build",
    timestamp,
    "_expo",
    "static",
    "js",
    platform,
    "bundle.js"
  );

  await downloadFile(url.toString(), output);
}

async function downloadManifest(platform) {
  const response = await fetch("http://localhost:8081/manifest", {
    headers: { "expo-platform": platform },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  return response.json();
}

async function downloadBundlesAndManifests(timestamp) {
  const results = await Promise.all([
    downloadBundle("ios", timestamp),
    downloadBundle("android", timestamp),
    downloadManifest("ios"),
    downloadManifest("android"),
  ]);

  return {
    ios: results[2],
    android: results[3],
  };
}

/* ============================
   MAIN
============================ */

async function main() {
  console.log("Building static Expo Go deployment...");
  setupSignalHandlers();

  const domain = getDeploymentDomain();
  const baseUrl = `https://${domain}`;
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  await startMetro(domain);

  const manifests = await downloadBundlesAndManifests(timestamp);

  console.log("Build complete! Deploy to:", baseUrl);

  if (metroProcess) metroProcess.kill();
  process.exit(0);
}

main().catch((error) => {
  console.error("Build failed:", error.message);
  if (metroProcess) metroProcess.kill();
  process.exit(1);
});