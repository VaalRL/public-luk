const fs = require('fs-extra');
const path = require('path');

console.log('Fixing Electron build structure...');

// 源路徑：.next/standalone 中的內容
const standaloneSource = path.join(__dirname, '.next', 'standalone');

// 目標路徑：暫存目錄
const tempDir = path.join(__dirname, 'temp-electron-build');

// 清理暫存目錄
if (fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
}
fs.ensureDirSync(tempDir);

console.log('Copying standalone files...');

// 找到實際的 server.js 和相關文件
const projectPath = path.join(standaloneSource, 'Downloads', 'git', 'spreadsheet-comparator');

if (fs.existsSync(projectPath)) {
    // 複製 server.js 和其他必要文件到暫存目錄根部
    const filesToCopy = [
        'server.js',
        'package.json',
        '.next',
        'public',
        'node_modules'
    ];

    filesToCopy.forEach(file => {
        const src = path.join(projectPath, file);
        const dest = path.join(tempDir, file);

        if (fs.existsSync(src)) {
            console.log(`Copying ${file}...`);
            fs.copySync(src, dest);
        } else {
            console.log(`Warning: ${file} not found at ${src}`);
        }
    });

    console.log('✓ Standalone files copied successfully');
} else {
    console.error('Error: Project path not found in standalone build');
    console.error('Expected path:', projectPath);
    process.exit(1);
}

// 複製 public 資源（如果需要）
const publicSource = path.join(__dirname, 'public');
const publicDest = path.join(tempDir, 'public');

if (fs.existsSync(publicSource)) {
    console.log('Copying public assets...');
    fs.copySync(publicSource, publicDest);
}

// 複製 .next/static
const staticSource = path.join(__dirname, '.next', 'static');
const staticDest = path.join(tempDir, '.next', 'static');

if (fs.existsSync(staticSource)) {
    console.log('Copying static files...');
    fs.ensureDirSync(path.dirname(staticDest));
    fs.copySync(staticSource, staticDest);
}

console.log('\n✓ Build structure fixed!');
console.log('Temp directory:', tempDir);
console.log('\nYou can now use this directory for Electron packaging.');
