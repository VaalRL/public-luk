const { app, BrowserWindow, shell } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

// 判斷是否為開發環境
const isDev = !app.isPackaged;
const PORT = 3001;

let mainWindow;
let serverProcess;

async function startNextServer() {
    if (isDev) {
        console.log('Running in development mode - expecting Next.js dev server on port 3001');
        return;
    }

    console.log('Starting Next.js server in production mode...');

    // 設定資料庫路徑
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'spreadsheet-comparator.db');

    console.log(`User data path: ${userDataPath}`);
    console.log(`Database path: ${dbPath}`);

    // 確保 userData 目錄存在
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }

    // 如果資料庫不存在，從資源中複製模板
    const templateDbPath = path.join(process.resourcesPath, 'prisma', 'dev.db');

    if (!fs.existsSync(dbPath)) {
        if (fs.existsSync(templateDbPath)) {
            fs.copyFileSync(templateDbPath, dbPath);
            console.log('Initialized database from template');
        } else {
            console.warn('Template database not found at:', templateDbPath);
        }
    }

    try {
        // 在打包後，standalone 會在 resources/standalone 中
        const possiblePaths = [];

        // 1. 標準打包路徑: resources/standalone/server.js
        if (app.isPackaged) {
            possiblePaths.push(path.join(process.resourcesPath, 'standalone', 'server.js'));
        }

        // 2. 開發環境路徑
        possiblePaths.push(path.join(__dirname, '..', '.next', 'standalone', 'server.js'));

        console.log(`Looking for server...`);
        possiblePaths.forEach(p => {
            try {
                const exists = fs.existsSync(p);
                console.log(`  Checking: ${p} (${exists ? 'FOUND' : 'Not found'})`);
            } catch (e) {
                console.log(`  Error checking ${p}: ${e.message}`);
            }
        });

        const serverPath = possiblePaths.find(p => {
            try {
                return fs.existsSync(p);
            } catch (e) {
                return false;
            }
        });

        if (serverPath) {
            // 設定工作目錄
            const serverDir = path.dirname(serverPath);
            process.chdir(serverDir);

            console.log(`Changed working directory to: ${serverDir}`);
            console.log(`Starting Next.js server from: ${serverPath}`);

            // 使用 fork 啟動 Next.js server
            serverProcess = fork(serverPath, [], {
                cwd: serverDir,
                env: {
                    ...process.env,
                    DATABASE_URL: `file:${dbPath.replace(/\\/g, '/')}`,
                    PORT: PORT.toString(),
                    HOSTNAME: 'localhost',
                    NODE_ENV: 'production',
                    PDF_BACKUP_DIR: path.join(userDataPath, 'backups', 'pdfs'),
                    // Explicitly set Prisma Query Engine path for Electron environment
                    PRISMA_QUERY_ENGINE_LIBRARY: path.join(serverDir, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node')
                },
                stdio: ['ignore', 'pipe', 'pipe', 'ipc']
            });

            const prismaEnginePath = path.join(serverDir, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node');
            console.log(`[Electron] Prisma Engine Path: ${prismaEnginePath}`);
            console.log(`[Electron] Prisma Engine Exists: ${fs.existsSync(prismaEnginePath)}`);

            const logFile = path.join(userDataPath, 'server.log');
            const logStream = fs.createWriteStream(logFile, { flags: 'a' });
            console.log(`[Electron] Writing server logs to: ${logFile}`);

            serverProcess.stdout.on('data', (data) => {
                const msg = `[Next.js] ${data.toString()}`;
                console.log(msg);
                logStream.write(msg);
            });

            serverProcess.stderr.on('data', (data) => {
                const msg = `[Next.js Error] ${data.toString()}`;
                console.error(msg);
                logStream.write(msg);
            });

            serverProcess.on('error', (err) => {
                const msg = `[Next.js Process Error] ${err.toString()}\n`;
                console.error('Failed to start Next.js server:', err);
                logStream.write(msg);
            });

            serverProcess.on('exit', (code, signal) => {
                console.log(`Next.js server exited with code ${code} and signal ${signal}`);
            });

            console.log('Next.js server process started');
        } else {
            console.error('Next.js server not found!');
        }
    } catch (err) {
        console.error('Failed to start Next.js server:', err);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        title: 'luk',
        icon: app.isPackaged
            ? path.join(process.resourcesPath, 'standalone', 'public', 'luk-logo.png')
            : path.join(__dirname, '../public/luk-logo.png')
    });

    const url = `http://localhost:${PORT}`;

    console.log(`Loading URL: ${url}`);

    // 載入 URL 的函數，帶重試機制
    const loadUrl = () => {
        mainWindow.loadURL(url).catch((err) => {
            console.log('Server not ready, retrying...', err.message);
            setTimeout(loadUrl, 1000);
        });
    };

    if (isDev) {
        // 開發模式下，假設 server 已經在 3001 端口運行
        setTimeout(() => {
            mainWindow.loadURL('http://localhost:3001');
            mainWindow.webContents.openDevTools();
        }, 1000);
    } else {
        // 生產模式下，等待 server 啟動
        setTimeout(loadUrl, 3000);
    }

    // 添加快捷鍵 F12 打開開發者工具（用於調試）
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        }
    });

    // 監聽網頁控制台訊息
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levelMap = ['LOG', 'WARNING', 'ERROR'];
        console.log(`[Renderer ${levelMap[level] || 'INFO'}] ${message}`);
    });

    // 處理外部連結
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    await startNextServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // 終止 Next.js server
    if (serverProcess) {
        serverProcess.kill();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // 確保 server 被終止
    if (serverProcess) {
        serverProcess.kill();
    }
});

// 處理未捕獲的異常
// 處理未捕獲的異常
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// --- Auto Updater Logic ---
const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

function setupAutoUpdater() {
    // 日誌記錄
    autoUpdater.logger = require("electron-log");
    autoUpdater.logger.transports.file.level = "info";

    console.log('[AutoUpdater] Setting up auto updater...');

    // 自動下載設為 false，讓使用者決定何時下載（可選）
    autoUpdater.autoDownload = false;

    // 获取当前版本号
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // 檢查更新
    ipcMain.handle('check-for-updates', async () => {
        if (!app.isPackaged) {
            console.log('[AutoUpdater] Skipping update check (dev mode)');
            return { updateAvailable: false, version: app.getVersion() };
        }
        try {
            const result = await autoUpdater.checkForUpdates();
            return {
                updateAvailable: !!result?.updateInfo,
                version: result?.updateInfo?.version,
                releaseNotes: result?.updateInfo?.releaseNotes
            };
        } catch (error) {
            console.error('[AutoUpdater] Error checking for updates:', error);
            throw error;
        }
    });

    // 開始下載
    ipcMain.handle('download-update', async () => {
        await autoUpdater.downloadUpdate();
    });

    // 安裝並重啟
    ipcMain.handle('quit-and-install', () => {
        autoUpdater.quitAndInstall();
    });

    // 事件監聽
    autoUpdater.on('checking-for-update', () => {
        if (mainWindow) mainWindow.webContents.send('update-status', 'checking');
    });

    autoUpdater.on('update-available', (info) => {
        if (mainWindow) mainWindow.webContents.send('update-status', 'available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        if (mainWindow) mainWindow.webContents.send('update-status', 'not-available', info);
    });

    autoUpdater.on('error', (err) => {
        if (mainWindow) mainWindow.webContents.send('update-status', 'error', err.toString());
    });

    autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow) mainWindow.webContents.send('update-status', 'progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow) mainWindow.webContents.send('update-status', 'downloaded', info);
    });
}

// 在 app ready 時初始化
app.whenReady().then(() => {
    setupAutoUpdater();
});
