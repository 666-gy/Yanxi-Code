import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgPath = path.join(__dirname, '..', 'public', 'logo.svg');
const png256Path = path.join(__dirname, '..', 'build', 'icon.png');
const png32Path = path.join(__dirname, '..', 'public', 'icon-32.png');

const svgContent = fs.readFileSync(svgPath, 'utf-8');

// 生成256x256 PNG
sharp(Buffer.from(svgContent))
  .resize(256, 256)
  .png()
  .toFile(png256Path)
  .then(() => {
    console.log('256x256 PNG generated:', png256Path);
  })
  .catch(err => {
    console.error('Error generating 256 PNG:', err);
  });

// 生成32x32 PNG
sharp(Buffer.from(svgContent))
  .resize(32, 32)
  .png()
  .toFile(png32Path)
  .then(() => {
    console.log('32x32 PNG generated:', png32Path);
  })
  .catch(err => {
    console.error('Error generating 32 PNG:', err);
  });
