(async () => {
  const { esc } = UI;
  const { main } = await Shell.mount({ role: 'admin', active: 'messages', title: 'Messages' });
  const st = { page: 1, status: '', search: '' };
  let rows = [];
  main.innerHTML = `
    <div class="page-head"><div><h2>Contact messages</h2><p>Enquiries sent from the public contact form.</p></div></div>
    <div class="card"><div class="toolbar"><div class="input-icon grow"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="q" type="search" placeholder="Search name, email or subject" aria-label="Search messages"></div>
      <select class="input" id="status" aria-label="Status"><option value="">All messages</option><option value="new">New</option><option value="read">Read</option><option value="replied">Replied</option></select></div>
      <div id="tbl"></div><div id="pg"></div></div>`;
  const $ = (s) => main.querySelector(s);

  async function load() {
    UI.loading($('#tbl'));
    try {
      const r = await API.get('/contact', { page: st.page, limit: 8, status: st.status, search: st.search });
      rows = r.data;
      if (!rows.length) { $('#tbl').innerHTML = UI.empty('fa-envelope-open', 'No messages', 'Nothing matches this view.'); $('#pg').innerHTML = ''; return; }
      $('#tbl').innerHTML = rows.map((m) => `<div class="list-row"><div class="grow"><div class="flex items-center gap wrap" style="gap:8px"><strong>${esc(m.subject)}</strong>${UI.badge(m.status)}</div><div class="small muted">${esc(m.name)} · ${esc(m.email)} · ${UI.fmtDate(m.createdAt)}</div><div class="ellipsis muted" style="max-width:640px">${esc(m.message)}</div></div>
        <div class="actions"><button class="icon-btn teal" data-a="open" data-id="${m._id}" title="Open" aria-label="Open message"><i class="fa-solid fa-envelope-open-text"></i></button><button class="icon-btn bad" data-a="del" data-id="${m._id}" title="Delete" aria-label="Delete message"><i class="fa-solid fa-trash"></i></button></div></div>`).join('');
      UI.pager($('#pg'), r.pagination, (p) => { st.page = p; load(); });
    } catch (e) { UI.errorBox($('#tbl'), e.message, load); }
  }
  const setStatus = async (m, status) => { await API.put('/contact/' + m._id, { status }); m.status = status; };

  $('#tbl').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const m = rows.find((x) => x._id === b.dataset.id);
    if (b.dataset.a === 'del') {
      if (!(await UI.confirm({ title: 'Delete message', message: 'Delete this message permanently?', confirmText: 'Delete', danger: true }))) return;
      try { await API.del('/contact/' + m._id); UI.toast('Message deleted.'); load(); } catch (err) { UI.toast(err.message, 'error'); }
      return;
    }
    const dlg = UI.modal({
      title: m.subject, body: `<dl class="dl" style="margin-bottom:16px"><dt>From</dt><dd>${esc(m.name)}</dd><dt>Email</dt><dd><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></dd><dt>Phone</dt><dd>${esc(m.phone || '-')}</dd><dt>Received</dt><dd>${UI.fmtDate(m.createdAt)}</dd><dt>Status</dt><dd>${UI.badge(m.status)}</dd></dl><div class="notice" style="white-space:pre-wrap">${esc(m.message)}</div>`,
      footer: `<button class="btn btn-outline" data-x>Close</button><a class="btn btn-navy" data-reply href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + m.subject)}"><i class="fa-solid fa-reply"></i> Reply by email</a>`, onClose: load
    });
    dlg.el.querySelector('[data-x]').onclick = dlg.close;
    dlg.el.querySelector('[data-reply]').onclick = () => setStatus(m, 'replied').catch(() => {});
    if (m.status === 'new') setStatus(m, 'read').catch(() => {});
  });
  $('#q').addEventListener('input', UI.debounce((e) => { st.search = e.target.value.trim(); st.page = 1; load(); }));
  $('#status').onchange = (e) => { st.status = e.target.value; st.page = 1; load(); };
  load();
})();
