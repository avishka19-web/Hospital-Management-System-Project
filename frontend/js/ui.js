(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pad = (n) => String(n).padStart(2, '0');

  const UI = {
    esc, DAYS, DAYS_LONG,
    todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    addDays(s, n) { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; },
    dayOfWeek(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getDay(); },
    fmtDate(s) { if (!s) return '-'; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`; const d = new Date(s); return isNaN(d) ? '-' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; },
    fmtTime(t) { if (!t) return '-'; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`; },
    fmtWeekday(s) { return DAYS[UI.dayOfWeek(s)]; },
    age(dob) { if (!dob) return '-'; const b = new Date(dob), n = new Date(); let a = n.getUTCFullYear() - b.getUTCFullYear(); if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--; return a; },
    daysText(days) {
      const d = [...(days || [])].sort();
      if (!d.length) return 'Not set';
      const contiguous = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
      return contiguous && d.length > 2 ? `${DAYS[d[0]]}-${DAYS[d[d.length - 1]]}` : d.map((x) => DAYS[x]).join(', ');
    },
    availText(a) { return a ? `${UI.daysText(a.days)} · ${UI.fmtTime(a.startTime)} - ${UI.fmtTime(a.endTime)}` : '-'; },
    cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; },
    money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); },
    debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    badge(s) { return `<span class="badge b-${esc(s)}">${esc(UI.cap(s))}</span>`; },
    abs(rel) { const u = new URL(rel, location.href); return u.pathname + u.search; },
    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return [...(root || document).querySelectorAll(sel)]; },

    // ----- images -----
    fileUrl(p) { if (!p) return ''; return /^https?:|^data:/.test(p) ? p : window.HMS_CONFIG.ORIGIN + p; },
    initials(name) { return String(name || '?').replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); },
    fallback(label) {
      let svg;
      if (label && label.startsWith('initials:')) {
        svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='#13315c'/><text x='100' y='122' fill='#fff' font-family='Arial,sans-serif' font-size='56' font-weight='600' text-anchor='middle'>${esc(label.slice(9))}</text></svg>`;
      } else {
        svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='#13315c'/><rect width='800' height='600' fill='#0f9d9a' opacity='.16'/><g fill='#fff' opacity='.92'><rect x='355' y='215' width='90' height='150' rx='12'/><rect x='325' y='245' width='150' height='90' rx='12'/></g><text x='400' y='430' fill='#cfe0f3' font-family='Arial,sans-serif' font-size='28' text-anchor='middle'>${esc(label || 'Meridian General Hospital')}</text></svg>`;
      }
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },
    img(src, alt, cls, label) { return `<img src="${esc(UI.fileUrl(src) || UI.fallback(label || alt))}" alt="${esc(alt)}" class="${esc(cls || '')}" loading="lazy" referrerpolicy="no-referrer" data-fb="${esc(label || alt || '')}">`; },
    avatar(name, photo, cls = '') { return `<img src="${esc(UI.fileUrl(photo) || UI.fallback('initials:' + UI.initials(name)))}" alt="${esc(name)}" class="avatar ${cls}" loading="lazy" referrerpolicy="no-referrer" data-fb="initials:${esc(UI.initials(name))}">`; },

    // ----- feedback -----
    toast(msg, type = 'success') {
      let box = document.querySelector('.toasts');
      if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div>${esc(msg)}</div>`;
      box.appendChild(el);
      setTimeout(() => el.remove(), type === 'error' ? 6000 : 3800);
    },
    loading(el, text = 'Loading...') { el.innerHTML = `<div class="loading"><div class="spinner"></div><div>${esc(text)}</div></div>`; },
    empty(icon, title, msg, action = '') { return `<div class="empty"><i class="fa-solid ${icon}"></i><h4>${esc(title)}</h4><p>${esc(msg)}</p>${action}</div>`; },
    errorBox(el, msg, retry) {
      el.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><h4>Something went wrong</h4><p>${esc(msg)}</p>${retry ? '<button class="btn btn-outline btn-sm" data-retry>Try again</button>' : ''}</div>`;
      if (retry) el.querySelector('[data-retry]').onclick = retry;
    },
    busy(btn, on, label) {
      if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span>${label ? ' ' + esc(label) : ''}`; }
      else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
    },
    formError(form, msg) {
      let box = form.querySelector('.form-error');
      if (!msg) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.className = 'form-error'; box.setAttribute('role', 'alert'); form.prepend(box); }
      box.textContent = msg;
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },

    // ----- modal / confirm -----
    modal({ title, body, footer, size = '', onClose }) {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"></div>${footer ? '<div class="modal-foot"></div>' : ''}</div>`;
      const bodyEl = ov.querySelector('.modal-body');
      typeof body === 'string' ? (bodyEl.innerHTML = body) : bodyEl.appendChild(body);
      if (footer) { const f = ov.querySelector('.modal-foot'); typeof footer === 'string' ? (f.innerHTML = footer) : f.appendChild(footer); }
      document.body.appendChild(ov);
      document.body.style.overflow = 'hidden';
      const previous = document.activeElement;
      const close = () => { ov.remove(); if (!document.querySelector('.overlay')) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); if (previous && previous.focus) previous.focus(); if (onClose) onClose(); };
      const onKey = (e) => { if (e.key === 'Escape' && ov === [...document.querySelectorAll('.overlay')].pop()) close(); };
      document.addEventListener('keydown', onKey);
      ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
      ov.querySelector('[data-close]').onclick = close;
      const first = ov.querySelector('input:not([type=hidden]), select, textarea, .modal-foot button');
      if (first) setTimeout(() => first.focus(), 30);
      return { el: ov, body: bodyEl, close };
    },
    confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false }) {
      return new Promise((resolve) => {
        let done = false;
        const m = UI.modal({
          title, size: 'sm', body: `<p style="margin:0">${esc(message)}</p>`,
          footer: `<button class="btn btn-outline" data-no>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirmText)}</button>`,
          onClose: () => { if (!done) resolve(false); }
        });
        m.el.querySelector('[data-no]').onclick = () => m.close();
        m.el.querySelector('[data-yes]').onclick = () => { done = true; m.close(); resolve(true); };
      });
    },
    pager(el, pg, onPage) {
      if (!pg || pg.total === 0) { el.innerHTML = ''; return; }
      const from = (pg.page - 1) * pg.limit + 1, to = Math.min(pg.page * pg.limit, pg.total);
      el.innerHTML = `<div class="pager"><span>Showing ${from}-${to} of ${pg.total}</span><div class="btns"><button class="btn btn-outline btn-sm" data-p="${pg.page - 1}" ${pg.page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> Previous</button><span style="padding:6px 8px">Page ${pg.page} of ${pg.pages}</span><button class="btn btn-outline btn-sm" data-p="${pg.page + 1}" ${pg.page >= pg.pages ? 'disabled' : ''}>Next <i class="fa-solid fa-chevron-right"></i></button></div></div>`;
      el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => onPage(+b.dataset.p)));
    },
    sortable(rows, key, dir) { return [...rows].sort((a, b) => (String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true })) * dir); },
    downloadCSV(name, rows) {
      const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
    },
    chart(canvas, config) {
      if (!window.Chart) return null;
      if (canvas._chart) canvas._chart.destroy();
      Chart.defaults.font.family = "'Instrument Sans', system-ui, sans-serif";
      Chart.defaults.color = '#5d6e86';
      canvas._chart = new Chart(canvas, config);
      return canvas._chart;
    },
    PALETTE: ['#0f9d9a', '#13315c', '#5fb7e5', '#e0a526', '#c0504d', '#7a8ba3', '#2f855a', '#8e6bbf']
  };
  window.UI = UI;

  // Any image that fails to load (broken URL, offline, blocked) gets a clean placeholder.
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.fbDone) return;
    t.dataset.fbDone = '1';
    t.src = UI.fallback(t.dataset.fb || t.alt || '');
  }, true);
})();
