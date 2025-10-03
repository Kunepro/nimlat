import { initDatabases } from "@nimlat/database";
import { Database } from "better-sqlite3";
import { app } from "electron";
import { createWindow } from "./init/create-window";
import { registerIpcMainHandlers } from "./ipc-handlers";

// Ensure required folders exist before anything else
import "./init/create-folders";

let db: Database | null = null;

app.whenReady().then(() => {
  db = initDatabases();
  registerIpcMainHandlers();
  createWindow();
});

app.on(
  "before-quit",
  () => {
    if (db) db.close();
  },
);

app.on(
  "window-all-closed",
  () => {
    if (process.platform !== "darwin") app.quit();
  },
);
