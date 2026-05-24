import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";
const isDev = process.env.DOCSCALPEL_DESKTOP_DEV === "1";

let apiServer;

async function createWindow() {
  process.env.DOCSCALPEL_ENV_PATH = path.join(app.getPath("userData"), ".env");
  const { startLocalApi } = await import("../server/index.mjs");
  apiServer = startLocalApi();

  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 980,
    minHeight: 720,
    title: "DocScalpel",
    backgroundColor: "#f5efdf",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    await waitForUrl(devServerUrl);
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(path.join(rootDir, "dist", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  apiServer?.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

async function waitForUrl(url) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Timed out waiting for ${url}`);
}
