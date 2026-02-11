const inputDirEl = document.getElementById('inputDir');
const outputDirEl = document.getElementById('outputDir');
const threadsEl = document.getElementById('threads');
const startBtn = document.getElementById('startBtn');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const progressMeta = document.getElementById('progressMeta');
const failedHeader = document.getElementById('failedHeader');
const failedList = document.getElementById('failedList');
const openOutputBtn = document.getElementById('openOutputBtn');
const pickInput = document.getElementById('pickInput');
const pickOutput = document.getElementById('pickOutput');
const inputField = inputDirEl.closest('.field');
const outputField = outputDirEl.closest('.field');

pickInput.addEventListener('click', async () => {
  const dir = await window.api.selectInputDir();
  if (dir) inputDirEl.value = dir;
});

pickOutput.addEventListener('click', async () => {
  const dir = await window.api.selectOutputDir();
  if (dir) outputDirEl.value = dir;
});

window.api.onProgress((stats) => {
  const { processed, total } = stats;
  const percent = total === 0 ? 0 : Math.round((processed / total) * 100);
  progressBar.style.width = `${percent}%`;
  progressMeta.textContent = `${processed} / ${total}`;
  if (total === 0) {
    statusText.textContent = 'No files found';
  } else if (processed >= total) {
    statusText.textContent = 'Procesing...';
  } else {
    statusText.textContent = `Converting... ${percent}%`;
  }
});

let failedFiles = [];
const renderFailed = () => {
  failedHeader.textContent = `Failed files: ${failedFiles.length}`;
  failedHeader.classList.remove('ok', 'bad');
  failedHeader.classList.add(failedFiles.length === 0 ? 'ok' : 'bad');
  failedList.innerHTML = '';
  for (const filePath of failedFiles) {
    const li = document.createElement('li');
    li.textContent = filePath;
    failedList.appendChild(li);
  }
};

window.api.onFailure(({ filePath }) => {
  failedFiles.push(filePath);
  renderFailed();
});

startBtn.addEventListener('click', async () => {
  const inputMissing = !inputDirEl.value;
  const outputMissing = !outputDirEl.value;

  if (inputMissing || outputMissing) {
    if (inputMissing) {
      inputField.classList.add('error', 'shake');
      inputField.addEventListener('animationend', () => inputField.classList.remove('shake'), { once: true });
    } else {
      inputField.classList.remove('error');
    }

    if (outputMissing) {
      outputField.classList.add('error', 'shake');
      outputField.addEventListener('animationend', () => outputField.classList.remove('shake'), { once: true });
    } else {
      outputField.classList.remove('error');
    }

    statusText.textContent = 'Please select both folders.';
    return;
  }

  inputField.classList.remove('error');
  outputField.classList.remove('error');

  startBtn.disabled = true;
  statusText.textContent = 'Starting...';
  progressBar.style.width = '0%';
  progressBar.classList.remove('success');
  progressMeta.textContent = '0 / 0';
  failedFiles = [];
  renderFailed();
  openOutputBtn.classList.add('hidden');

  const threads = threadsEl.value ? Number(threadsEl.value) : undefined;
  const result = await window.api.startConversion({
    inputDir: inputDirEl.value,
    outputDir: outputDirEl.value,
    threads
  });

  if (result.ok) {
    statusText.textContent = 'Done! Click on View Output Folder to see the results';
    progressBar.classList.add('success');
    openOutputBtn.classList.remove('hidden');
  } else {
    statusText.textContent = `Error: ${result.error}`;
  }
  startBtn.disabled = false;
});

openOutputBtn.addEventListener('click', async () => {
  const dir = outputDirEl.value;
  await window.api.openOutputDir(dir);
});
