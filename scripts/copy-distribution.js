const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const dist7z = path.join(dist, '7z');
const licensesDir = path.join(root, 'licenses');
const distLicenses = path.join(dist, 'licenses');
const toolsDir = path.join(root, 'tools', '7z');
const distCbr = path.join(dist, 'CBR HERE');

const filesToCopy = [
  { src: path.join(toolsDir, '7z.exe'), dest: path.join(dist7z, '7z.exe') },
  { src: path.join(toolsDir, '7z.dll'), dest: path.join(dist7z, '7z.dll') },
  { src: path.join(toolsDir, 'License.txt'), dest: path.join(dist7z, 'License.txt') },
  { src: path.join(licensesDir, 'PROJECT_LICENSE.txt'), dest: path.join(distLicenses, 'PROJECT_LICENSE.txt') },
  { src: path.join(licensesDir, 'THIRD_PARTY_NOTICES.txt'), dest: path.join(distLicenses, 'THIRD_PARTY_NOTICES.txt') }
];

fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(dist7z, { recursive: true });
fs.mkdirSync(distLicenses, { recursive: true });
fs.mkdirSync(distCbr, { recursive: true });

for (const file of filesToCopy) {
  if (fs.existsSync(file.src)) {
    fs.copyFileSync(file.src, file.dest);
    console.log(`Copied ${path.relative(root, file.src)} -> ${path.relative(root, file.dest)}`);
  }
}
