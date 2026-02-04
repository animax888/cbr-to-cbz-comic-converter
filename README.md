<img src="media/rtzlogo682.png" alt="Alt text" width="300">

# RtZ Comic Converter

**RtZ Comic Converter** is a Windows console tool that transforms comic archives into clean, **uncompressed** `.cbz` files. Built for collectors who want speed, structure, and a simple workflow. Compatible with `.cbr`, `.cb7`, and `.cbt`.
It works without requiring any dependencies, as it includes the 7z binaries, so you only need to run the .exe.

## Installation
The latest version can be downloaded from the Releases page and is marked as `Latest`:
`https://github.com/animax888/cbr-to-cbz-comic-converter/releases`
The program comes in a ZIP file. Just extract it and run the `.exe`.

## Quick Start
1. Run `rtz-comic-converter.exe`.
2. The input folder already exists next to the exe: `CBR HERE`.
3. Put the files you want to convert inside the `CBR HERE` folder, regardless of their format.
4. The app creates the output folder after you start the conversion: `CBZ OUTPUT`.
5. Type `start` and press Enter.
6. Converted `.cbz` files appear inside the `CBZ OUTPUT` folder.

## What You Will See
- A progress bar during conversion
- Failed files are moved to `_failed` inside the output folder
- The app attempts to detect 7z, RAR, ZIP, or TAR content even if the extension is different

## ⚠️Windows Security Notice
When the `.exe` is not code-signed, Windows may show a SmartScreen warning such as "Unknown publisher" or "Windows protected your PC". This is expected for unsigned apps and does not mean the file is infected.
This program was created by a non-professional developer and does not include a code-signing certificate (sorry). There is no virus risk; the full source code is open source and can be reviewed by anyone. I did this because I was bored and my comic reader didn’t support CBR; I hope it helps you. 

## Distribution Layout
```
dist/
  rtz-comic-converter.exe
  CBR HERE/
  7z/
    7z.exe
    7z.dll
    License.txt
  licenses/
    PROJECT_LICENSE.txt
    THIRD_PARTY_NOTICES.txt
```

## Licenses
- The project license: `licenses/PROJECT_LICENSE.txt`
- Third-party notices: `licenses/THIRD_PARTY_NOTICES.txt`
- 7-Zip license: `7z/License.txt`

## Credits
Program made by animax888.
Repository: https://github.com/animax888/cbr-to-cbz-comic-converter
