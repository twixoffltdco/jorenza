/* ===================== JORENZA MAIN JS ===================== */

// ── Utils ──────────────────────────────────────────────────────
const JORENZA_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const SHORT_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateUID(len = 10) {
  let r = '';
  for (let i = 0; i < len; i++)
    r += JORENZA_ID_CHARS[Math.floor(Math.random() * JORENZA_ID_CHARS.length)];
  return r;
}

function generateShortCode(len = 6) {
  let r = '';
  for (let i = 0; i < len; i++)
    r += SHORT_CHARS[Math.floor(Math.random() * SHORT_CHARS.length)];
  return r;
}

function parseGitHubUrl(url) {
  url = url.trim().replace(/\/$/, '');
  const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

function rawUrl(owner, repo, branch, path) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function buildDeployUrl(uid) {
  return `https://jorenza.app/p/${uid}`;
}

function buildShortUrl(code) {
  return `https://jrn.to/${code}`;
}

// ── GitHub API ─────────────────────────────────────────────────
const GH_API = 'https://api.github.com';

async function fetchRepoInfo(owner, repo) {
  const r = await fetch(`${GH_API}/repos/${owner}/${repo}`);
  if (!r.ok) throw new Error('Репозиторий не найден или недоступен');
  return r.json();
}

async function fetchTree(owner, repo, branch) {
  const r = await fetch(`${GH_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!r.ok) throw new Error('Не удалось получить дерево файлов');
  return r.json();
}

async function detectBranch(owner, repo) {
  const info = await fetchRepoInfo(owner, repo);
  return info.default_branch || 'main';
}

// ── Project type detection ─────────────────────────────────────
function detectProjectType(files) {
  const names = files.map(f => f.path.toLowerCase());
  if (names.includes('package.json')) {
    if (names.some(n => n.includes('next.config'))) return 'Next.js';
    if (names.some(n => n.includes('vite.config'))) return 'Vite';
    if (names.some(n => n.includes('vue.config') || n.endsWith('.vue'))) return 'Vue';
    if (names.some(n => n.endsWith('.tsx') || n.endsWith('.jsx'))) return 'React';
    return 'Node.js';
  }
  if (names.some(n => n.endsWith('.html'))) return 'Static HTML';
  if (names.some(n => n.endsWith('.py'))) return 'Python';
  if (names.some(n => n.endsWith('.go'))) return 'Go';
  return 'Unknown';
}

function getFileIcon(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    html: '🌐', css: '🎨', js: '⚡', jsx: '⚛️', tsx: '⚛️', ts: '🔷',
    vue: '💚', py: '🐍', go: '🐹', json: '📋', md: '📝',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', svg: '🖼️', gif: '🖼️',
    sh: '⚙️', yml: '⚙️', yaml: '⚙️', env: '🔐', gitignore: '🚫',
  };
  return map[ext] || '📄';
}

// ── Deploy Storage ─────────────────────────────────────────────
const STORAGE_KEY = 'jorenza_deploys';

function saveDeploy(data) {
  const all = loadAllDeploys();
  all[data.uid] = data;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {}
}

function loadAllDeploys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function loadDeploy(uid) {
  return loadAllDeploys()[uid] || null;
}

// ── Main Analyzer ──────────────────────────────────────────────
async function analyzeAndDeploy(repoUrl, onProgress) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) throw new Error('Неверная ссылка на GitHub репозиторий');
  const { owner, repo } = parsed;

  onProgress('Получаем информацию о репозитории…');
  const info = await fetchRepoInfo(owner, repo);
  const branch = info.default_branch || 'main';

  onProgress('Анализируем структуру файлов…');
  const tree = await fetchTree(owner, repo, branch);
  const files = (tree.tree || []).filter(f => f.type === 'blob');

  onProgress('Определяем тип проекта…');
  const projectType = detectProjectType(files);

  onProgress('Генерируем уникальные ссылки…');
  const uid = generateUID(10);
  const shortCode = generateShortCode(6);
  const deployUrl = buildDeployUrl(uid);
  const shortUrl = buildShortUrl(shortCode);

  // Map each file to its raw URL
  const fileMap = files.slice(0, 150).map(f => ({
    path: f.path,
    rawUrl: rawUrl(owner, repo, branch, f.path),
    icon: getFileIcon(f.path),
  }));

  const deploy = {
    uid, shortCode, owner, repo, branch,
    deployUrl, shortUrl, projectType,
    fileMap,
    repoUrl: info.html_url,
    description: info.description || 'Нет описания',
    stars: info.stargazers_count,
    forks: info.forks_count,
    language: info.language,
    createdAt: new Date().toISOString(),
  };

  saveDeploy(deploy);
  onProgress('Готово!');
  return deploy;
}

// ── App Page Logic ─────────────────────────────────────────────
function initAppPage() {
  const page = document.getElementById('appPage');
  if (!page) return;

  // Check URL param
  const params = new URLSearchParams(location.search);
  const preRepo = params.get('repo');
  if (preRepo) {
    const inp = document.getElementById('repoInput');
    if (inp) { inp.value = preRepo; }
    setTimeout(() => document.getElementById('deployBtn').click(), 300);
  }

  const deployBtn = document.getElementById('deployBtn');
  if (deployBtn) {
    deployBtn.addEventListener('click', async () => {
      const url = document.getElementById('repoInput').value.trim();
      if (!url) return;

      deployBtn.disabled = true;
      deployBtn.textContent = '⏳ Анализируем…';

      const results = document.getElementById('appResults');
      results.innerHTML = `<div class="result-card"><p class="status">
        <span class="status-dot loading"></span><span id="progressText">Начинаем…</span></p></div>`;

      try {
        const deploy = await analyzeAndDeploy(url, txt => {
          const el = document.getElementById('progressText');
          if (el) el.textContent = txt;
        });
        renderResults(deploy, results);
      } catch (e) {
        results.innerHTML = `<div class="result-card"><p style="color:#ff5f57">❌ ${e.message}</p></div>`;
      }

      deployBtn.disabled = false;
      deployBtn.textContent = '🚀 Deploy';
    });
  }
}

function renderResults(d, container) {
  const filesHtml = d.fileMap.map(f => `
    <div class="file-tree-item">
      <span class="file-icon">${f.icon}</span>
      <span class="file-name">${f.path}</span>
      <a href="${f.rawUrl}" target="_blank" class="file-raw">raw ↗</a>
    </div>`).join('');

  const shareText = encodeURIComponent(`Смотри мой проект: ${d.deployUrl}`);
  const tgShare = `https://t.me/share/url?url=${encodeURIComponent(d.shortUrl)}&text=${encodeURIComponent(d.repo)}`;
  const twShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(d.shortUrl)}`;

  container.innerHTML = `
    <!-- Landing Preview -->
    <div class="result-card landing-preview">
      <div class="repo-name">📦 ${d.repo}</div>
      <div class="repo-desc">${d.description}</div>
      <div class="tag-row" style="justify-content:center">
        <span class="tag">${d.projectType}</span>
        ${d.language ? `<span class="tag">${d.language}</span>` : ''}
        <span class="tag">⭐ ${d.stars}</span>
        <span class="tag">🍴 ${d.forks}</span>
      </div>
      <div class="share-btns">
        <a href="${twShare}" target="_blank" class="btn-share tw">Twitter</a>
        <a href="${tgShare}" target="_blank" class="btn-share tg">Telegram</a>
        <button onclick="copyToClipboard('${d.shortUrl}', this)" class="btn-share cp">Копировать ссылку</button>
      </div>
    </div>

    <!-- Deploy URLs -->
    <div class="result-card">
      <h3><span class="status-dot ok"></span>Проект задеплоен</h3>
      <div class="url-box">
        <code>${d.deployUrl}</code>
        <button class="btn-copy" onclick="copyToClipboard('${d.deployUrl}', this)">Копировать</button>
      </div>
      <div class="url-box">
        <code>${d.shortUrl}</code>
        <button class="btn-copy" onclick="copyToClipboard('${d.shortUrl}', this)">Короткая</button>
      </div>
    </div>

    <!-- File Map -->
    <div class="result-card">
      <h3>🗂️ Файлы (${d.fileMap.length} шт.) — raw ссылки</h3>
      <div class="file-tree">${filesHtml}</div>
    </div>

    <!-- Meta -->
    <div class="result-card">
      <h3>📋 Информация</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;font-size:.85rem">
        <div><span style="color:var(--muted)">ID деплоя:</span><br/><code style="color:var(--accent)">${d.uid}</code></div>
        <div><span style="color:var(--muted)">Короткий код:</span><br/><code style="color:var(--accent)">${d.shortCode}</code></div>
        <div><span style="color:var(--muted)">Репозиторий:</span><br/><a href="${d.repoUrl}" target="_blank" style="color:var(--accent3)">${d.owner}/${d.repo}</a></div>
        <div><span style="color:var(--muted)">Ветка:</span><br/><code style="color:var(--text)">${d.branch}</code></div>
      </div>
    </div>
  `;
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Скопировано!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

// ── FAQ ────────────────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const a = q.nextElementSibling;
      const open = a.classList.contains('open');
      document.querySelectorAll('.faq-a.open').forEach(el => {
        el.classList.remove('open');
        el.previousElementSibling.classList.remove('open');
      });
      if (!open) {
        a.classList.add('open');
        q.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      } else {
        a.style.maxHeight = null;
      }
    });
  });
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAppPage();
  initFAQ();
});
