const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let hubProcess = null;

function startBackend() {
  // In production, hub.py is in the extraResources folder
  const isPackaged = app.isPackaged;
  const basePath = isPackaged 
    ? process.resourcesPath 
    : path.join(__dirname, '..');
  
  const hubPath = path.join(basePath, 'hub.py');
  
  console.log('Starting Lux Hub backend at:', hubPath);
  
  hubProcess = spawn('python3', [hubPath], {
    cwd: basePath,
    env: { ...process.env, FLASK_APP: 'hub.py', FLASK_ENV: 'production' }
  });

  hubProcess.stdout.on('data', (data) => {
    console.log(`[Hub] ${data}`);
  });

  hubProcess.stderr.on('data', (data) => {
    console.error(`[Hub Error] ${data}`);
  });

  hubProcess.on('close', (code) => {
    console.log(`Hub process exited with code ${code}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Lux AI Studio - developed by Lux Automaton',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#050505',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'build/icon.png')
  });

  const loadHub = () => {
    const hubUrl = 'http://localhost:1337';
    console.log('Attempting to load Hub UI at:', hubUrl);
    
    win.loadURL(hubUrl).catch(() => {
      console.log('Hub not ready yet, retrying in 500ms...');
      setTimeout(loadHub, 500);
    });
  };

  loadHub();

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (hubProcess) hubProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (hubProcess) hubProcess.kill();
});
