const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');

const { runConversion } = require(path.join(__dirname, '..', 'convert_comics.js'));

let mainWindow = null;
let isConverting = false;

app.setPath('cache', path.join(app.getPath('userData'), 'Cache'));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-input-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('start-conversion', async (_event, { inputDir, outputDir, threads }) => {
  if (isConverting) {
    return { ok: false, error: 'Conversion already in progress.' };
  }
  if (!inputDir || !outputDir) {
    return { ok: false, error: 'Please select both input and output folders.' };
  }

  isConverting = true;
  try {
    await runConversion({
      inputDir,
      outputDir,
      threads,
      onProgress: (stats) => {
        if (mainWindow) {
          mainWindow.webContents.send('conversion-progress', stats);
        }
      },
      onFailure: (filePath) => {
        if (mainWindow) {
          mainWindow.webContents.send('conversion-failed', { filePath });
        }
      }
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    isConverting = false;
  }
});

ipcMain.handle('open-output-dir', async (_event, { dir }) => {
  if (!dir) return { ok: false, error: 'Missing output folder.' };
  const result = await shell.openPath(dir);
  if (result) return { ok: false, error: result };
  return { ok: true };
});
