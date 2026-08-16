const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
    const logPath = path.join(app.getPath('userData'), 'electron-debug.log');
    const log = (msg) => {
        const message = `[${new Date().toISOString()}] ${msg}\n`;
        console.log(message);
        fs.appendFileSync(logPath, message);
    };

    log('=== Electron Debug Info ===');
    log(`app.isPackaged: ${app.isPackaged}`);
    log(`__dirname: ${__dirname}`);
    log(`process.resourcesPath: ${process.resourcesPath}`);
    log(`app.getAppPath(): ${app.getAppPath()}`);
    log(`app.getPath('userData'): ${app.getPath('userData')}`);
    log(`app.getPath('exe'): ${app.getPath('exe')}`);

    log('\n=== Checking paths ===');
    const pathsToCheck = [
        process.resourcesPath,
        path.join(process.resourcesPath, 'standalone'),
        path.join(process.resourcesPath, 'standalone', 'server.js'),
        path.join(process.resourcesPath, 'prisma'),
        path.join(process.resourcesPath, 'prisma', 'dev.db'),
    ];

    pathsToCheck.forEach(p => {
        log(`${p}: ${fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND'}`);
    });

    log('\n=== Contents of process.resourcesPath ===');
    try {
        const files = fs.readdirSync(process.resourcesPath);
        files.forEach(f => {
            const fullPath = path.join(process.resourcesPath, f);
            const stats = fs.statSync(fullPath);
            log(`  ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${f}`);
        });
    } catch (err) {
        log(`Error reading resourcesPath: ${err.message}`);
    }

    log('\n=== Log saved to: ' + logPath + ' ===');

    setTimeout(() => {
        app.quit();
    }, 1000);
});
