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
  statusText.textContent = total === 0 ? 'No files found' : `Converting... ${percent}%`;
});

let failedFiles = [];
const renderFailed = () => {
  failedHeader.textContent = `Failed files: ${failedFiles.length}`;
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
  statusText.textContent = 'Starting...';
  progressBar.style.width = '0%';
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
    statusText.textContent = 'Done!';
    openOutputBtn.classList.remove('hidden');
  } else {
    statusText.textContent = `Error: ${result.error}`;
  }
});

openOutputBtn.addEventListener('click', async () => {
  const dir = outputDirEl.value;
  await window.api.openOutputDir(dir);
});
