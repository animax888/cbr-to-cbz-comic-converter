const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const AdmZip = require('adm-zip');
const { createExtractorFromFile } = require('node-unrar-js');
const yazl = require('yazl');
const cliProgress = require('cli-progress');

const SEVEN_ZIP_ENV = 'SEVEN_ZIP_PATH';
let SEVEN_ZIP_PATH = null;

function isPackaged() {
  return typeof process.pkg !== 'undefined';
}

function getBaseDir() {
  return isPackaged() ? path.dirname(process.execPath) : process.cwd();
}

async function extractBundledSevenZip(bundledExe) {
  const tempDir = path.join(os.tmpdir(), 'cbr-to-cbz-7z');
  const exePath = path.join(tempDir, '7z.exe');
  const dllPath = path.join(tempDir, '7z.dll');
  const bundledDll = path.join(path.dirname(bundledExe), '7z.dll');

  await fsp.mkdir(tempDir, { recursive: true });
  await fsp.copyFile(bundledExe, exePath);
  if (fs.existsSync(bundledDll)) {
    await fsp.copyFile(bundledDll, dllPath);
  }

  return exePath;
}

async function resolveSevenZipPath() {
  const candidates = [
    process.env[SEVEN_ZIP_ENV],
    path.join(getBaseDir(), 'tools', '7z', '7z.exe'),
    path.join(getBaseDir(), '7z', '7z.exe'),
    path.join(getBaseDir(), '7z.exe')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  if (process.platform === 'win32') {
    const where = spawnSync('where', ['7z'], { encoding: 'utf8' });
    if (where.status === 0 && where.stdout) {
      const first = where.stdout.split(/\r?\n/).find(Boolean);
      if (first && fs.existsSync(first)) return first;
    }
  }

  if (isPackaged()) {
    const bundledExe = path.join(__dirname, 'tools', '7z', '7z.exe');
    if (fs.existsSync(bundledExe)) {
      return extractBundledSevenZip(bundledExe);
    }
  }

  return null;
}

function logLine(level, message) {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} - ${level.toUpperCase()} - ${message}`;
  console.log(line);
}

function pauseOnExit() {
  if (!isPackaged()) return Promise.resolve();
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Press Enter to exit...', () => {
      rl.close();
      resolve();
    });
  });
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    inputDir: null,
    outputDir: null,
    threads: null
  };

  let positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--threads' || arg === '-t') {
      const value = args[i + 1];
      if (value) {
        result.threads = Number(value);
        i += 1;
      }
      continue;
    }
    positional.push(arg);
  }

  if (positional.length > 0) result.inputDir = positional[0];
  if (positional.length > 1) result.outputDir = positional[1];

  return result;
}

const counter = {
  processed: 0,
  converted: 0,
  failed: 0,
  increment(type) {
    if (type in this) this[type] += 1;
  }
};

function safePath(p) {
  return path.resolve(String(p));
}

function isValidZip(zipPath) {
  try {
    const zip = new AdmZip(zipPath);
    zip.getEntries();
    return true;
  } catch (err) {
    logLine('error', `Error checking ZIP file ${zipPath}: ${err.message}`);
    return false;
  }
}

async function runSevenZip(args) {
  if (!SEVEN_ZIP_PATH) {
    throw new Error('7-Zip not found');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(SEVEN_ZIP_PATH, args, { windowsHide: true });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `7z exited with code ${code}`));
      }
    });
  });
}

async function isValidRar(rarPath) {
  if (SEVEN_ZIP_PATH) {
    try {
      await runSevenZip(['t', rarPath]);
      return true;
    } catch (err) {
      logLine('error', `Error checking RAR file ${rarPath}: ${err.message}`);
      return false;
    }
  }

  try {
    const extractor = createExtractorFromFile({ filepath: rarPath });
    const list = extractor.getFileList();
    return list[0] && list[0].state === 'SUCCESS';
  } catch (err) {
    logLine('error', `Error checking RAR file ${rarPath}: ${err.message}`);
    return false;
  }
}

function normalizeEntryName(name) {
  const trimmed = name.replace(/^[/\\]+/, '');
  return trimmed.replace(/\\/g, '/');
}

function assertNoPathTraversal(baseDir, targetPath, entryName) {
  const resolvedBase = path.resolve(baseDir) + path.sep;
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error(`Attempted path traversal: ${entryName}`);
  }
}

async function safeExtractZip(zipPath, tempDir) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  for (const entry of entries) {
    try {
      const entryName = normalizeEntryName(entry.entryName || entry.name);
      if (!entryName) continue;
      const targetPath = path.join(tempDir, entryName);
      assertNoPathTraversal(tempDir, targetPath, entryName);
      if (entry.isDirectory) {
        await fsp.mkdir(targetPath, { recursive: true });
        continue;
      }
      await fsp.mkdir(path.dirname(targetPath), { recursive: true });
      const data = entry.getData();
      await fsp.writeFile(targetPath, data);
    } catch (err) {
      logLine('error', `Error extracting ${entry.entryName}: ${err.message}`);
      throw err;
    }
  }
}

async function safeExtractRar(rarPath, tempDir) {
  if (SEVEN_ZIP_PATH) {
    await runSevenZip(['x', '-y', `-o${tempDir}`, rarPath]);
    return;
  }

  const extractor = createExtractorFromFile({ filepath: rarPath });
  const extracted = extractor.extractAll();
  const result = extracted[0];
  if (!result || result.state !== 'SUCCESS') {
    throw new Error('RAR extraction failed');
  }
  for (const file of extracted[1].files) {
    const entryName = normalizeEntryName(file.fileHeader.name);
    if (!entryName || file.fileHeader.flags.directory) continue;
    const targetPath = path.join(tempDir, entryName);
    assertNoPathTraversal(tempDir, targetPath, entryName);
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.writeFile(targetPath, Buffer.from(file.extraction));
  }
}

async function createUncompressedZipFromDir(sourceDir, destFile) {
  await fsp.mkdir(path.dirname(destFile), { recursive: true });
  const zipfile = new yazl.ZipFile();

  async function walk(currentDir) {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const relPath = path.relative(sourceDir, fullPath).split(path.sep).join('/');
        zipfile.addFile(fullPath, relPath, { compress: false });
      }
    }
  }

  await walk(sourceDir);

  const outStream = fs.createWriteStream(destFile);
  const done = new Promise((resolve, reject) => {
    outStream.on('close', resolve);
    outStream.on('error', reject);
  });

  zipfile.outputStream.pipe(outStream);
  zipfile.end();

  await done;
}

async function convertToCbz(srcFile, destFile, failedPath) {
  const tempDir = `${destFile}_temp`;
  try {
    await fsp.mkdir(tempDir, { recursive: true });
    const ext = path.extname(srcFile).toLowerCase();
    if (ext === '.cbz') {
      try {
        await safeExtractZip(srcFile, tempDir);
      } catch (err) {
        logLine('error', `Error extracting ZIP ${srcFile}: ${err.message}`);
        await fsp.mkdir(path.dirname(failedPath), { recursive: true });
        await fsp.copyFile(srcFile, failedPath);
        counter.increment('failed');
        return false;
      }
    } else {
      try {
        await safeExtractRar(srcFile, tempDir);
      } catch (err) {
        logLine('error', `Error extracting RAR ${srcFile}: ${err.message}`);
        try {
          if (isValidZip(srcFile)) {
            await safeExtractZip(srcFile, tempDir);
          } else {
            throw new Error('Not a valid ZIP file either');
          }
        } catch (zipErr) {
          logLine('error', `Failed to process as ZIP: ${zipErr.message}`);
          await fsp.mkdir(path.dirname(failedPath), { recursive: true });
          await fsp.copyFile(srcFile, failedPath);
          counter.increment('failed');
          return false;
        }
      }
    }

    try {
      await createUncompressedZipFromDir(tempDir, destFile);
      counter.increment('converted');
      return true;
    } catch (err) {
      logLine('error', `Error creating new ZIP ${destFile}: ${err.message}`);
      await fsp.mkdir(path.dirname(failedPath), { recursive: true });
      await fsp.copyFile(srcFile, failedPath);
      counter.increment('failed');
      return false;
    }
  } catch (err) {
    logLine('error', `Unexpected error processing ${srcFile}: ${err.message}`);
    await fsp.mkdir(path.dirname(failedPath), { recursive: true });
    await fsp.copyFile(srcFile, failedPath);
    counter.increment('failed');
    return false;
  } finally {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      logLine('error', `Failed to clean temp dir ${tempDir}: ${err.message}`);
    }
  }
}

async function processFile(srcFile, destFile, failedPath) {
  counter.increment('processed');
  const ext = path.extname(srcFile).toLowerCase();

  if (ext === '.cbz') {
    if (!isValidZip(srcFile)) {
      await fsp.mkdir(path.dirname(failedPath), { recursive: true });
      await fsp.copyFile(srcFile, failedPath);
      counter.increment('failed');
      return false;
    }
  }

  return convertToCbz(srcFile, destFile, failedPath);
}

async function collectFiles(inputDir, outputDir) {
  const files = [];
  const failedDir = path.join(outputDir, '_failed');

  async function walk(currentDir) {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const relPath = path.relative(inputDir, fullPath);
        const destPath = path.join(outputDir, path.dirname(relPath));
        const failedPath = path.join(failedDir, relPath);
        const destFile = path.join(destPath, `${path.parse(entry.name).name}.cbz`);
        await fsp.mkdir(destPath, { recursive: true });
        files.push({ srcFile: fullPath, destFile, failedPath });
      }
    }
  }

  await walk(inputDir);
  return files;
}

async function runWithConcurrency(tasks, limit) {
  let index = 0;
  let active = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (index >= tasks.length && active === 0) {
        resolve();
        return;
      }

      while (active < limit && index < tasks.length) {
        const task = tasks[index++];
        active += 1;
        task()
          .catch((err) => {
            logLine('error', `Unexpected error in task: ${err.message}`);
          })
          .finally(() => {
            active -= 1;
            next();
          });
      }
    };

    next();
  });
}

async function processFiles(inputDir, outputDir, maxWorkers) {
  const filesToProcess = await collectFiles(inputDir, outputDir);

  const bar = new cliProgress.SingleBar({
    format: 'Converting files |{bar}| {value}/{total}',
    clearOnComplete: false
  }, cliProgress.Presets.shades_classic);

  bar.start(filesToProcess.length, 0);

  const tasks = filesToProcess.map(({ srcFile, destFile, failedPath }) => {
    return async () => {
      await processFile(srcFile, destFile, failedPath);
      bar.increment();
    };
  });

  const concurrency = maxWorkers || os.cpus().length;
  await runWithConcurrency(tasks, concurrency);

  bar.stop();

  logLine('info', `Processing complete: ${counter.processed} files processed`);
  logLine('info', `Converted: ${counter.converted}, Failed: ${counter.failed}`);
}

async function main() {
  const parsed = parseArgs(process.argv);
  let inputDir = parsed.inputDir;
  let outputDir = parsed.outputDir;

  if (isPackaged()) {
    const baseDir = getBaseDir();
    const cbrDir = path.join(baseDir, 'CBR HERE');
    const cbzDir = path.join(baseDir, 'CBZ OUTPUT');

    if (!fs.existsSync(cbrDir)) {
      console.log('Missing input folder.');
      console.log(`Please create this folder next to the exe: ${cbrDir}`);
      await pauseOnExit();
      return;
    }

    console.log('=== CBR -> CBZ Converter ===');
    console.log(`1) Put your .cbr files here: ${cbrDir}`);
    console.log(`2) Your .cbz files will appear here: ${cbzDir}`);
    console.log('3) When you are ready, type "start" and press Enter.');
    console.log('');

    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
    const answer = await ask('Type start to begin: ');
    rl.close();

    if (String(answer).trim().toLowerCase() !== 'start') {
      console.log('Cancelled. No conversion was performed.');
      await pauseOnExit();
      return;
    }

    await fsp.mkdir(cbzDir, { recursive: true });

    inputDir = cbrDir;
    outputDir = cbzDir;
  } else if (!inputDir || !outputDir) {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
    inputDir = inputDir || await ask('Input folder: ');
    outputDir = outputDir || await ask('Output folder: ');
    rl.close();
  }

  inputDir = safePath(inputDir);
  outputDir = safePath(outputDir);

  SEVEN_ZIP_PATH = await resolveSevenZipPath();

  if (SEVEN_ZIP_PATH) {
    logLine('info', `Using 7-Zip at ${SEVEN_ZIP_PATH}`);
  } else {
    logLine('info', '7-Zip not found. Falling back to pure JS RAR handling.');
  }

  await processFiles(inputDir, outputDir, parsed.threads || undefined);
  await pauseOnExit();
}

main().catch((err) => {
  logLine('error', `Fatal error: ${err.message}`);
  pauseOnExit().finally(() => process.exit(1));
});
