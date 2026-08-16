const fs = require('fs-extra');
const path = require('path');

console.log('Preparing Electron build structure...');

// 源路徑
const standaloneSource = path.join(__dirname, '.next', 'standalone');
const staticSource = path.join(__dirname, '.next', 'static');
const publicSource = path.join(__dirname, 'public');

// 目標路徑
const tempDir = path.join(__dirname, 'electron-dist-temp');

// 清理並創建臨時目錄
if (fs.existsSync(tempDir)) {
    console.log('Cleaning existing temp directory...');
    fs.removeSync(tempDir);
}
fs.ensureDirSync(tempDir);

console.log('Source paths:');
console.log('  Standalone:', standaloneSource);
console.log('  Static:', staticSource);
console.log('  Public:', publicSource);
console.log('Target path:', tempDir);

// 檢查源路徑
if (!fs.existsSync(standaloneSource)) {
    console.error('Error: Standalone build not found at:', standaloneSource);
    process.exit(1);
}

// 只複製必要的檔案
console.log('\n1. Copying essential files from standalone...');
const essentialFiles = [
    'server.js',
    'package.json',
    '.env'
];

essentialFiles.forEach(file => {
    const src = path.join(standaloneSource, file);
    const dest = path.join(tempDir, file);

    if (fs.existsSync(src)) {
        console.log(`   ✓ ${file}`);
        fs.copySync(src, dest);
    } else {
        console.log(`   ⚠ ${file} not found (skipping)`);
    }
});

// 複製 .next 目錄（包含構建輸出）
console.log('\n2. Copying .next directory...');
const nextSrc = path.join(standaloneSource, '.next');
const nextDest = path.join(tempDir, '.next');
if (fs.existsSync(nextSrc)) {
    fs.copySync(nextSrc, nextDest);
    console.log('   ✓ .next directory copied');
} else {
    console.error('   ✗ .next directory not found!');
    process.exit(1);
}

// 複製 node_modules（standalone 已經包含必要的依賴）
console.log('\n3. Copying node_modules...');
const nodeModulesSrc = path.join(standaloneSource, 'node_modules');
const nodeModulesDest = path.join(tempDir, 'node_modules');
if (fs.existsSync(nodeModulesSrc)) {
    fs.copySync(nodeModulesSrc, nodeModulesDest);
    console.log('   ✓ node_modules copied');
} else {
    console.log('   ⚠ node_modules not found (may cause issues)');
}

// 複製 .next/static
console.log('\n4. Copying static files...');
if (fs.existsSync(staticSource)) {
    const staticDest = path.join(tempDir, '.next', 'static');
    fs.ensureDirSync(path.dirname(staticDest));
    fs.copySync(staticSource, staticDest);
    console.log('   ✓ Static files copied');
} else {
    console.log('   ⚠ Static files not found');
}

// 複製 public 目錄
console.log('\n5. Copying public assets...');
if (fs.existsSync(publicSource)) {
    const publicDest = path.join(tempDir, 'public');
    fs.copySync(publicSource, publicDest);
    console.log('   ✓ Public assets copied');
} else {
    console.log('   ⚠ Public assets not found');
}

console.log('\n✓ Build preparation complete!');
console.log('Temp directory ready at:', tempDir);
console.log('\nYou can now run electron-builder with this directory.');
