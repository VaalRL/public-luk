const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'luk-logo.png');
const outputPath = path.join(__dirname, 'public', 'luk-logo.ico');

try {
    const pngBuffer = fs.readFileSync(inputPath);
    const size = pngBuffer.length;

    // ICO Header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = Icon)
    header.writeUInt16LE(1, 4); // Count (1 image)

    // Directory Entry (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0);  // Width (0 = 256px or larger)
    entry.writeUInt8(0, 1);  // Height (0 = 256px or larger)
    entry.writeUInt8(0, 2);  // Color count
    entry.writeUInt8(0, 3);  // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // Bit count
    entry.writeUInt32LE(size, 8); // Size of image data
    entry.writeUInt32LE(22, 12); // Offset of image data (6 + 16)

    const icoBuffer = Buffer.concat([header, entry, pngBuffer]);

    fs.writeFileSync(outputPath, icoBuffer);
    console.log(`Successfully converted ${inputPath} to ${outputPath}`);
} catch (error) {
    console.error('Error converting icon:', error);
    process.exit(1);
}
