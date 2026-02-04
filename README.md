# CBR to CBZ Comic Converter

A console app that converts `.cbr` (RAR) and `.cbz` (ZIP) files into **uncompressed** `.cbz` files while preserving folder structure. It supports multithreaded processing and includes a ready-to-distribute Windows `.exe` build.

## Features
- Recursively processes `.cbr` and `.cbz` files
- Preserves directory structure in the output
- Repackages to **uncompressed** CBZ
- Multithreaded conversion
- Progress bar + log file (`conversion.log`)
- Moves failures to `_failed`

## How It Works (EXE)
When you run the `.exe` directly:
1. It creates two folders next to the executable: `CBR` and `CBZ`
2. Put your `.cbr` files in `CBR`
3. Type `start` when prompted
4. Converted `.cbz` files appear in `CBZ`

## Usage (Node.js)
```bash
node convert_comics.js <input_dir> <output_dir> --threads 4
```

Or using npm:
```bash
npm run convert:comics -- <input_dir> <output_dir> --threads 4
```

## Build the EXE
1. Make sure you have 7-Zip binaries in `tools/7z/`:
   - `tools/7z/7z.exe`
   - `tools/7z/7z.dll`
   - `tools/7z/License.txt`
2. Build:
```bash
npm run build:exe:comics
```

The output will be in `dist/`.

## Distribution Layout
```
dist/
  convert-comics.exe
  7z/
    7z.exe
    7z.dll
    License.txt
  licenses/
    PROJECT_LICENSE.txt
    THIRD_PARTY_NOTICES.txt
```

## Licenses
- Your project license: `licenses/PROJECT_LICENSE.txt`
- Third-party notices: `licenses/THIRD_PARTY_NOTICES.txt`
- 7-Zip license: `tools/7z/License.txt` (copied to `dist/7z/License.txt`)

## Credits
Program made by animax888.
Repository: https://github.com/animax888/cbr-to-cbz-comic-converter
