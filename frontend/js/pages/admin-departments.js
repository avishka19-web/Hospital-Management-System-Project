(async () => {
  const { esc } = UI;
  const { main } = await Shell.mount({ role: 'admin', active: 'departments', title: 'Departments & services' });
  let depts = [], services = [];
  main.innerHTML = `
    <div class="page-head"><div><h2>Departments</h2><p>Departments shown on the public website and used when adding doctors.</p></div><button class="btn btn-primary" id="addDept"><i class="fa-solid fa-plus"></i> Add department</button></div>
    <div id="depts"></div>
    <div class="page-head" style="margin-top:12px"><div><h2>Hospital services</h2><p>Supporting services listed on the Departments page.</p></div><button class="btn btn-primary" id="addSvc"><i class="fa-solid fa-plus"></i> Add service</button></div>
    <div class="card"><div id="svcs"></div></div>`;
  const $ = (s) => main.querySelector(s);

  async function loadDepts() {
    UI.loading($('#depts'));
    try {
      depts = (await API.get('/departments')).data;
      $('#depts').innerHTML = depts.length ? `<div class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px">${depts.map((d) => `
        <article class="dept-card">${UI.img(d.image, d.name, 'photo', d.name)}<div class="body"><h4><i class="fa-solid ${esc(d.icon)}"></i>${esc(d.name)}</h4><p style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(d.description)}</p>
          <div class="flex between items-center"><span class="small muted">${d.doctorCount} doctor${d.doctorCount === 1 ? '' : 's'}</span><div class="actions"><button class="icon-btn teal" data-d="edit" data-id="${d._id}" title="Edit" aria-label="Edit ${esc(d.name)}"><i class="fa-solid fa-pen"></i></button><button class="icon-btn bad" data-d="del" data-id="${d._id}" title="Delete" aria-label="Delete ${esc(d.name)}"><i class="fa-solid fa-trash"></i></button></div></div></div></article>`).join('')}</div>` : `<div class="card">${UI.empty('fa-building-columns', 'No departments yet', 'Add your first department.')}</div>`;
    } catch (e) { UI.errorBox($('#depts'), e.message, loadDepts); }
  }
  async function loadSvcs() {
    UI.loading($('#svcs'));
    try {
      services = (await API.get('/services/all')).data;
      $('#svcs').innerHTML = services.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Service</th><th>Description</th><th>Visible</th><th>Actions</th></tr></thead><tbody>${services.map((s) => `<tr><td><div class="cell-person"><span class="chip" style="padding:8px 10px"><i class="fa-solid ${esc(s.icon)}"></i></span><strong>${esc(s.name)}</strong></div></td><td class="muted">${esc(s.description)}</td><td>${s.isActive ? '<span class="badge b-completed">Shown</span>' : '<span class="badge b-cancelled">Hidden</span>'}</td><td><div class="actions"><button class="icon-btn teal" data-s="edit" data-id="${s._id}" title="Edit" aria-label="Edit"><i class="fa-solid fa-pen"></i></button><button class="icon-btn bad" data-s="del" data-id="${s._id}" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('')}</tbody></table></div>` : UI.empty('fa-notes-medical', 'No services yet', 'Add the services your hospital offers.');
    } catch (e) { UI.errorBox($('#svcs'), e.message, loadSvcs); }
  }

  function deptForm(d) {
    const m = UI.modal({
      title: d ? 'Edit department' : 'Add department',
      body: `<form id="f" novalidate>
        <div class="field"><label for="n">Name</label><input class="input" id="n" name="name" required maxlength="80" value="${esc(d ? d.name : '')}"></div>
        <div class="field"><label for="ds">Description</label><textarea class="input" id="ds" name="description" rows="3" maxlength="1000">${esc(d ? d.description : '')}</textarea></div>
        <div class="field"><label for="ic">Icon (Font Awesome class)</label><input class="input" id="ic" name="icon" value="${esc(d ? d.icon : 'fa-stethoscope')}" placeholder="fa-heart-pulse"><div class="hint">Browse names at fontawesome.com/icons (free, solid), e.g. fa-lungs, fa-eye.</div></div>
        <div class="field"><div class="label">Image</div><div class="flex items-center gap"><img class="photo-prev" id="prev" alt="" src="${esc(UI.fileUrl(d && d.image) || UI.fallback(d ? d.name : 'Department'))}"><div style="flex:1"><input class="input" name="image" type="file" accept="image/jpeg,image/png,image/webp"><div class="hint">Upload a file, or paste an image URL:</div><input class="input" name="imageUrl" type="url" placeholder="https://..." style="margin-top:6px"></div></div></div></form>`,
      footer: `<button class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary" data-save>${d ? 'Save changes' : 'Add department'}</button>`
    });
    const f = m.el.querySelector('#f');
    f.querySelector('[name=image]').onchange = (e) => { const x = e.target.files[0]; if (x) m.el.querySelector('#prev').src = URL.createObjectURL(x); };
    m.el.querySelector('[data-x]').onclick = m.close;
    const save = m.el.querySelector('[data-save]');
    save.onclick = async () => {
      UI.formError(f);
      const fd = new FormData(f);
      if (!fd.get('image') || !fd.get('image').size) fd.delete('image');
      if (!fd.get('imageUrl')) fd.delete('imageUrl');
      if (fd.get('name').trim().length < 2) return UI.formError(f, 'Enter a department name.');
      UI.busy(save, true, 'Saving...');
      try { await (d ? API.put('/departments/' + d._id, fd) : API.post('/departments', fd)); UI.toast(d ? 'Department updated.' : 'Department added.'); m.close(); loadDepts(); }
      catch (e) { UI.formError(f, e.message); UI.busy(save, false); }
    };
  }
  function svcForm(s) {
    const m = UI.modal({
      title: s ? 'Edit service' : 'Add service', size: 'sm',
      body: `<form id="f" novalidate><div class="field"><label for="n">Name</label><input class="input" id="n" name="name" required maxlength="80" value="${esc(s ? s.name : '')}"></div>
        <div class="field"><label for="ds">Description</label><textarea class="input" id="ds" name="description" rows="3" maxlength="500">${esc(s ? s.description : '')}</textarea></div>
        <div class="field"><label for="ic">Icon (Font Awesome class)</label><input class="input" id="ic" name="icon" value="${esc(s ? s.icon : 'fa-notes-medical')}"></div>
        <label class="flex items-center" style="gap:8px"><input type="checkbox" name="isActive" ${!s || s.isActive ? 'checked' : ''}> Show on the public website</label></form>`,
      footer: `<button class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary" data-save>${s ? 'Save changes' : 'Add service'}</button>`
    });
    const f = m.el.querySelector('#f');
    m.el.querySelector('[data-x]').onclick = m.close;
    const save = m.el.querySelector('[data-save]');
    save.onclick = async () => {
      UI.formError(f);
      const body = { name: f.name.value.trim(), description: f.description.value.trim(), icon: f.icon.value.trim(), isActive: f.isActive.checked };
      if (body.name.length < 2) return UI.formError(f, 'Enter a service name.');
      UI.busy(save, true, 'Saving...');
      try { await (s ? API.put('/services/' + s._id, body) : API.post('/services', body)); UI.toast(s ? 'Service updated.' : 'Service added.'); m.close(); loadSvcs(); }
      catch (e) { UI.formError(f, e.message); UI.busy(save, false); }
    };
  }

  $('#addDept').onclick = () => deptForm(null);
  $('#addSvc').onclick = () => svcForm(null);
  $('#depts').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const d = depts.find((x) => x._id === b.dataset.id);
    if (b.dataset.d === 'edit') return deptForm(d);
    if (!(await UI.confirm({ title: 'Delete department', message: `Delete ${d.name}? Departments that still have doctors cannot be deleted.`, confirmText: 'Delete', danger: true }))) return;
    try { await API.del('/departments/' + d._id); UI.toast('Department deleted.'); loadDepts(); } catch (err) { UI.toast(err.message, 'error'); }
  });
  $('#svcs').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = services.find((x) => x._id === b.dataset.id);
    if (b.dataset.s === 'edit') return svcForm(s);
    if (!(await UI.confirm({ title: 'Delete service', message: `Delete "${s.name}"?`, confirmText: 'Delete', danger: true }))) return;
    try { await API.del('/services/' + s._id); UI.toast('Service deleted.'); loadSvcs(); } catch (err) { UI.toast(err.message, 'error'); }
  });
  loadDepts(); loadSvcs();
})();
