import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    icon: path.join(__dirname, 'icon.ico')
  });
  const filePath = path.join(__dirname, 'dist', 'index.html');
  const url = app.isPackaged ? `file://${filePath}` : 'http://localhost:5173';
  win.loadURL(url);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
