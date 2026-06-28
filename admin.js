// ============================================================
// Max's Tin Can — Site Manager (admin portal)
// One password unlocks a simple editor for Events, Text & Photos.
// Defaults are read live from the site's index.html; saved
// changes are overrides stored via /api/save.
// ============================================================
(function () {
  'use strict';

  const PW_KEY = 'mtc_admin_pw';
  let pw = sessionStorage.getItem(PW_KEY) || '';
  let content = { texts: {}, images: {}, events: [] }; // saved overrides + events
  let textFields = [];   // [{key,label,section,def}]
  let imageFields = [];   // [{key,label,section,def}]
  let pendingImages = {}; // key -> newly uploaded url (this session)

  const SECTION_NAMES = {
    hero: 'Hero / Top of page',
    about: 'Our Story',
    gallery: 'Gallery',
    featured: 'The Holy Grail',
    events: 'Calendar (page wording)',
    visit: 'Visit',
    contact: 'Contact',
    footer: 'Footer',
  };

  // ---------- tiny DOM helpers ----------
  const $ = (s) => document.querySelector(s);
  const el = (tag, props) => Object.assign(document.createElement(tag), props || {});
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ============================================================
  // AUTH
  // ============================================================
  const loginWrap = $('#loginWrap');
  const app = $('#app');
  const savebar = $('#savebar');

  function showLogin(msg) {
    loginWrap.style.display = 'flex';
    app.style.display = 'none';
    savebar.classList.remove('show');
    if (msg) setMsg($('#loginMsg'), msg, 'bad');
  }
  function showApp() {
    loginWrap.style.display = 'none';
    app.style.display = 'block';
    savebar.classList.add('show');
  }

  async function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json', 'x-admin-password': pw }, opts.headers || {});
    const res = await fetch(path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* ignore */ }
    return { ok: res.ok, status: res.status, data };
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn');
    const entered = $('#pw').value;
    if (!entered) return;
    btn.disabled = true; btn.textContent = 'Checking…';
    pw = entered;
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: entered }) });
    btn.disabled = false; btn.textContent = 'Enter';
    if (r.ok) {
      sessionStorage.setItem(PW_KEY, pw);
      boot();
    } else {
      pw = '';
      const m = r.data && r.data.error ? r.data.error : 'Could not sign in. Check the password and that the site is deployed.';
      setMsg($('#loginMsg'), m, 'bad');
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem(PW_KEY);
    pw = '';
    $('#pw').value = '';
    showLogin('');
  });

  // ============================================================
  // BOOT — load saved content + discover fields from the site
  // ============================================================
  async function boot() {
    showApp();
    try {
      const [contentRes, htmlRes] = await Promise.all([
        fetch('/api/content', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/', { cache: 'no-store' }).then((r) => r.text()),
      ]);

      content = {
        texts: (contentRes && contentRes.texts) || {},
        images: (contentRes && contentRes.images) || {},
        events: (contentRes && Array.isArray(contentRes.events)) ? contentRes.events.slice() : [],
      };
      pendingImages = {};

      discoverFields(htmlRes);
      renderText();
      renderPhotos();
      renderEvents();
      setMsg($('#saveMsg'), '', '');
    } catch (err) {
      $('#textFields').innerHTML = '<p class="empty">Could not load the site content. Try refreshing.</p>';
    }
  }

  function discoverFields(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    textFields = [];
    Array.from(doc.querySelectorAll('[data-c]')).forEach((node) => {
      const key = node.getAttribute('data-c');
      textFields.push({
        key,
        label: node.getAttribute('data-clabel') || key,
        section: key.split('.')[0],
        def: node.innerHTML.trim().replace(/\s+/g, ' '),
      });
    });
    const seen = {};
    imageFields = [];
    Array.from(doc.querySelectorAll('[data-cimg]')).forEach((node) => {
      const key = node.getAttribute('data-cimg');
      if (seen[key]) return;
      seen[key] = true;
      imageFields.push({
        key,
        label: node.getAttribute('data-clabel') || (key === 'logo' ? 'Logo (header & footer)' : key),
        section: key.split('.')[0],
        def: node.getAttribute('src'),
      });
    });
  }

  // ============================================================
  // TEXT TAB
  // ============================================================
  function renderText() {
    const wrap = $('#textFields');
    wrap.innerHTML = '';
    const bySection = {};
    textFields.forEach((f) => { (bySection[f.section] = bySection[f.section] || []).push(f); });

    Object.keys(bySection).forEach((sec) => {
      const group = el('div', { className: 'group' });
      group.appendChild(el('h3', { textContent: SECTION_NAMES[sec] || sec }));
      bySection[sec].forEach((f) => {
        const val = Object.prototype.hasOwnProperty.call(content.texts, f.key) ? content.texts[f.key] : f.def;
        const field = el('div', { className: 'field' });
        field.innerHTML =
          '<label>' + esc(f.label) + '</label>' +
          '<div class="rt" contenteditable="true" spellcheck="true" data-key="' + esc(f.key) + '"></div>';
        const box = field.querySelector('.rt');
        box.innerHTML = val; // renders bold + line breaks visually, no tags shown
        box.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
        });
        box.addEventListener('input', () => setMsg($('#saveMsg'), 'Unsaved changes', ''));
        group.appendChild(field);
      });
      wrap.appendChild(group);
    });
  }

  // ============================================================
  // PHOTOS TAB
  // ============================================================
  function renderPhotos() {
    const wrap = $('#photoFields');
    wrap.innerHTML = '';
    imageFields.forEach((f) => {
      const current = pendingImages[f.key] || content.images[f.key] || f.def;
      const card = el('div', { className: 'photo-card' });
      card.innerHTML =
        '<img class="photo-thumb' + (f.key === 'logo' ? ' contain' : '') + '" src="' + esc(current) + '" alt="">' +
        '<div class="photo-meta"><b>' + esc(f.label) + '</b><div class="status" data-status></div></div>' +
        '<div class="photo-actions"><label>Choose photo<input type="file" accept="image/*"></label></div>';
      const input = card.querySelector('input[type=file]');
      const thumb = card.querySelector('.photo-thumb');
      const status = card.querySelector('[data-status]');
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        status.textContent = 'Uploading…';
        try {
          const processed = await processImage(file);
          const r = await api('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              filename: processed.filename,
              contentType: processed.type,
              dataBase64: processed.base64,
            }),
          });
          if (r.ok && r.data && r.data.url) {
            pendingImages[f.key] = r.data.url;
            thumb.src = r.data.url;
            status.textContent = 'New photo ready — hit Save to publish.';
            setMsg($('#saveMsg'), 'Unsaved changes', '');
          } else {
            status.textContent = (r.data && r.data.error) || 'Upload failed.';
          }
        } catch (err) {
          status.textContent = 'Upload failed: ' + (err.message || 'error');
        }
      });
      wrap.appendChild(card);
    });
  }

  // Downscale + compress in the browser before upload.
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Not a valid image'));
        img.onload = () => {
          const MAX = 1600;
          let { width: w, height: h } = img;
          if (w > MAX || h > MAX) {
            const s = Math.min(MAX / w, MAX / h);
            w = Math.round(w * s); h = Math.round(h * s);
          }
          const canvas = el('canvas', { width: w, height: h });
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const isPng = /png/i.test(file.type);
          const type = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = isPng ? canvas.toDataURL(type) : canvas.toDataURL(type, 0.85);
          resolve({ base64: dataUrl.split(',')[1], type, filename: file.name || 'photo' });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // EVENTS TAB
  // ============================================================
  function newId() { return 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }

  function eventRow(ev) {
    const row = el('div', { className: 'event-row' });
    row.setAttribute('data-id', ev.id || newId());
    row.innerHTML =
      '<div class="er-top">' +
        '<div class="er-date"><label style="display:block;font-size:.8rem;font-weight:600;color:var(--muted);margin-bottom:.3rem">Date</label>' +
          '<input type="date" data-f="date"></div>' +
        '<div class="er-title"><label style="display:block;font-size:.8rem;font-weight:600;color:var(--muted);margin-bottom:.3rem">Event name</label>' +
          '<input type="text" data-f="title" placeholder="e.g. Trivia Tuesday"></div>' +
      '</div>' +
      '<div class="er-desc"><label style="display:block;font-size:.8rem;font-weight:600;color:var(--muted);margin-bottom:.3rem">Description</label>' +
        '<textarea data-f="desc" rows="2" placeholder="Short details shown on the calendar"></textarea></div>' +
      '<div class="er-foot"><button class="btn-danger" type="button">Remove</button></div>';
    row.querySelector('[data-f=date]').value = ev.date || '';
    row.querySelector('[data-f=title]').value = ev.title || '';
    row.querySelector('[data-f=desc]').value = ev.desc || '';
    row.querySelector('.btn-danger').addEventListener('click', () => {
      row.remove();
      checkEmptyEvents();
      setMsg($('#saveMsg'), 'Unsaved changes', '');
    });
    return row;
  }

  function renderEvents() {
    const list = $('#eventList');
    list.innerHTML = '';
    const sorted = content.events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    sorted.forEach((ev) => list.appendChild(eventRow(ev)));
    checkEmptyEvents();
  }

  function checkEmptyEvents() {
    const list = $('#eventList');
    const has = list.querySelector('.event-row');
    let empty = list.querySelector('.empty');
    if (!has && !empty) {
      list.appendChild(el('p', { className: 'empty', textContent: 'No events yet. Add one below.' }));
    } else if (has && empty) {
      empty.remove();
    }
  }

  $('#addEventBtn').addEventListener('click', () => {
    const list = $('#eventList');
    const e = list.querySelector('.empty');
    if (e) e.remove();
    const row = eventRow({ id: newId() });
    list.appendChild(row);
    row.querySelector('[data-f=date]').focus();
  });

  // ============================================================
  // SAVE
  // ============================================================
  $('#saveBtn').addEventListener('click', save);

  function collectText() {
    const out = {};
    document.querySelectorAll('#textFields .rt[data-key]').forEach((box) => {
      const key = box.getAttribute('data-key');
      const field = textFields.find((f) => f.key === key);
      const val = cleanHtml(box.innerHTML);
      // Only store as an override if it differs from the site default.
      if (field && val !== cleanHtml(field.def)) out[key] = val;
    });
    return out;
  }

  // Turn whatever the contenteditable produced into clean, safe markup:
  // keep bold (<strong>) and line breaks (<br>), drop everything else.
  function cleanHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    function isBold(node) {
      if (!node.style) return false;
      const w = node.style.fontWeight;
      return w === 'bold' || w === 'bolder' || (parseInt(w, 10) >= 600);
    }
    function walk(node) {
      let out = '';
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          out += esc(n.nodeValue);
        } else if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (tag === 'br') out += '<br>';
          else if (tag === 'strong' || tag === 'b') out += '<strong>' + walk(n) + '</strong>';
          else if ((tag === 'span' || tag === 'font') && isBold(n)) out += '<strong>' + walk(n) + '</strong>';
          else if (tag === 'div' || tag === 'p') { const inner = walk(n); out += (out && inner ? '<br>' : '') + inner; }
          else out += walk(n);
        }
      });
      return out;
    }
    return walk(tmp)
      .replace(/<strong>\s*<\/strong>/g, '')
      .replace(/(<br>\s*)+$/g, '')
      .trim();
  }

  function collectImages() {
    const out = {};
    imageFields.forEach((f) => {
      const val = pendingImages[f.key] || content.images[f.key];
      if (val && val !== f.def) out[f.key] = val;
    });
    return out;
  }

  function collectEvents() {
    const out = [];
    document.querySelectorAll('#eventList .event-row').forEach((row) => {
      const date = row.querySelector('[data-f=date]').value;
      const title = row.querySelector('[data-f=title]').value.trim();
      const desc = row.querySelector('[data-f=desc]').value.trim();
      if (!date || !title) return; // skip incomplete rows
      out.push({ id: row.getAttribute('data-id'), date, title, desc });
    });
    return out;
  }

  async function save() {
    const btn = $('#saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    setMsg($('#saveMsg'), '', '');
    const payload = { texts: collectText(), images: collectImages(), events: collectEvents() };
    const r = await api('/api/save', { method: 'POST', body: JSON.stringify({ content: payload }) });
    btn.disabled = false; btn.textContent = 'Save changes';
    if (r.ok) {
      // Reflect saved state locally so future diffs are correct.
      content = { texts: payload.texts, images: payload.images, events: payload.events };
      pendingImages = {};
      setMsg($('#saveMsg'), 'Saved! Changes are now live on the site.', 'good');
    } else if (r.status === 401) {
      setMsg($('#saveMsg'), 'Session expired — please log in again.', 'bad');
      setTimeout(() => { sessionStorage.removeItem(PW_KEY); pw = ''; showLogin(''); }, 1200);
    } else {
      setMsg($('#saveMsg'), (r.data && r.data.error) || 'Could not save. Try again.', 'bad');
    }
  }

  function setMsg(node, text, kind) {
    if (!node) return;
    node.textContent = text;
    node.className = 'msg' + (kind ? ' ' + kind : '');
  }

  // ============================================================
  // TABS
  // ============================================================
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      $('#panel-' + t.getAttribute('data-tab')).classList.add('active');
    });
  });

  // ============================================================
  // INIT — auto-resume session if password still valid
  // ============================================================
  (async function init() {
    if (pw) {
      const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
      if (r.ok) { boot(); return; }
      sessionStorage.removeItem(PW_KEY); pw = '';
    }
    showLogin('');
  })();
})();
