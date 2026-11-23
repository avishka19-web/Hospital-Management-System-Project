(async () => {
  const { esc } = UI;
  const { main } = await Shell.mount({ role: 'admin', active: 'doctors', title: 'Doctors' });
  const st = { page: 1, search: '', department: '', sort: 'newest' };
  let rows = [], depts = [];

  main.innerHTML = `
    <div class="page-head"><div><h2>Doctors</h2><p>Add, edit and manage the medical staff directory.</p></div><button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Add doctor</button></div>
    <div class="card"><div class="toolbar">
      <div class="input-icon grow"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="q" type="search" placeholder="Search by name or speciality" aria-label="Search doctors"></div>
      <select class="input" id="dept" aria-label="Department"><option value="">All departments</option></select>
      <select class="input" id="sort" aria-label="Sort"><option value="newest">Newest first</option><option value="experience">Most experienced</option><option value="fee">Fee: low to high</option><option value="-fee">Fee: high to low</option></select></div>
      <div id="tbl"></div><div id="pg"></div></div>`;
  const $ = (s) => main.querySelector(s);

  try {
    depts = (await API.get('/departments')).data;
    $('#dept').innerHTML += depts.map((d) => `<option value="${d._id}">${esc(d.name)}</option>`).join('');
  } catch (e) { UI.toast(e.message, 'error'); }

  async function load() {
    UI.loading($('#tbl'));
    try {
      const r = await API.get('/doctors', { page: st.page, limit: 8, search: st.search, department: st.department, sort: st.sort });
      rows = r.data;
      if (!rows.length) { $('#tbl').innerHTML = UI.empty('fa-user-doctor', 'No doctors found', 'Add a doctor or adjust your filters.'); $('#pg').innerHTML = ''; return; }
      $('#tbl').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Doctor</th><th>Department</th><th>Experience</th><th>Fee</th><th>Availability</th><th>Actions</th></tr></thead><tbody>${rows.map((d) => `<tr>
        <td><div class="cell-person">${UI.avatar(d.name, d.photo)}<div><strong>${esc(d.name)}</strong><span class="small muted">${esc(d.specialization)}</span></div></div></td>
        <td><span class="chip">${esc(d.department ? d.department.name : '-')}</span></td><td>${d.experience} yrs</td><td>${UI.money(d.fee)}</td>
        <td class="small">${esc(UI.daysText(d.availability.days))}<br><span class="muted">${UI.fmtTime(d.availability.startTime)} - ${UI.fmtTime(d.availability.endTime)}</span></td>
        <td><div class="actions"><button class="icon-btn teal" data-a="view" data-id="${d._id}" title="View" aria-label="View"><i class="fa-solid fa-eye"></i></button><button class="icon-btn teal" data-a="edit" data-id="${d._id}" title="Edit" aria-label="Edit"><i class="fa-solid fa-pen"></i></button><button class="icon-btn bad" data-a="del" data-id="${d._id}" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('')}</tbody></table></div>`;
      UI.pager($('#pg'), r.pagination, (p) => { st.page = p; load(); });
    } catch (e) { UI.errorBox($('#tbl'), e.message, load); }
  }

  function view(d) {
    const m = UI.modal({ title: 'Doctor details', size: 'lg', body: `<div class="profile-card" style="margin-bottom:18px">${UI.avatar(d.name, d.photo, 'avatar-xl')}<div><h3 style="margin:0">${esc(d.name)}</h3><div style="color:var(--teal-dark);font-weight:600">${esc(d.specialization)}</div><div class="muted small">${esc(d.qualification || '')}</div></div></div>
      <dl class="dl"><dt>Department</dt><dd>${esc(d.department ? d.department.name : '-')}</dd><dt>Email</dt><dd>${esc(d.email)}</dd><dt>Phone</dt><dd>${esc(d.phone || '-')}</dd><dt>Experience</dt><dd>${d.experience} years</dd><dt>Consultation fee</dt><dd>${UI.money(d.fee)}</dd><dt>Availability</dt><dd>${esc(UI.availText(d.availability))} · ${d.availability.slotMinutes}-minute slots</dd><dt>Bio</dt><dd>${esc(d.bio || '-')}</dd></dl>`, footer: '<button class="btn btn-outline" data-x>Close</button>' });
    m.el.querySelector('[data-x]').onclick = m.close;
  }

  function form(d) {
    const edit = !!d, a = d ? d.availability : { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00', slotMinutes: 30 };
    const m = UI.modal({
      title: edit ? 'Edit doctor' : 'Add doctor', size: 'lg',
      body: `<form id="df" novalidate><div class="form-grid">
        <div class="field"><label for="f-name">Full name</label><input class="input" id="f-name" name="name" required value="${esc(d ? d.name : 'Dr. ')}"></div>
        <div class="field"><label for="f-email">Email (login)</label><input class="input" id="f-email" name="email" type="email" required value="${esc(d ? d.email : '')}"></div>
        <div class="field"><label for="f-phone">Phone</label><input class="input" id="f-phone" name="phone" type="tel" required value="${esc(d ? d.phone || '' : '')}"></div>
        <div class="field"><label for="f-gender">Gender</label><select class="input" id="f-gender" name="gender"><option value="">Not specified</option>${['female', 'male', 'other'].map((g) => `<option value="${g}" ${d && d.gender === g ? 'selected' : ''}>${UI.cap(g)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-password">${edit ? 'New password (optional)' : 'Password'}</label><input class="input" id="f-password" name="password" type="password" autocomplete="new-password" ${edit ? '' : 'required'}><div class="hint">${edit ? 'Leave blank to keep the current password.' : 'At least 8 characters with a letter and a number.'}</div></div>
        <div class="field"><label for="f-dept">Department</label><select class="input" id="f-dept" name="department" required><option value="">Select department</option>${depts.map((x) => `<option value="${x._id}" ${d && d.department && d.department._id === x._id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-spec">Specialization</label><input class="input" id="f-spec" name="specialization" required value="${esc(d ? d.specialization : '')}"></div>
        <div class="field"><label for="f-qual">Qualification</label><input class="input" id="f-qual" name="qualification" value="${esc(d ? d.qualification : '')}"></div>
        <div class="field"><label for="f-exp">Experience (years)</label><input class="input" id="f-exp" name="experience" type="number" min="0" max="60" required value="${d ? d.experience : ''}"></div>
        <div class="field"><label for="f-fee">Consultation fee (₹)</label><input class="input" id="f-fee" name="fee" type="number" min="0" value="${d ? d.fee : ''}"></div>
        <div class="field full"><label for="f-bio">Short bio</label><textarea class="input" id="f-bio" name="bio" rows="3" maxlength="1000">${esc(d ? d.bio : '')}</textarea></div>
        <div class="field full"><div class="label">Profile photo</div><div class="flex items-center gap"><img class="photo-prev" id="prev" alt="Photo preview" src="${esc(UI.fileUrl(d && d.photo) || UI.fallback('initials:' + UI.initials(d ? d.name : 'Dr')))}"><div style="flex:1"><input class="input" id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"><div class="hint">JPG, PNG or WebP, up to 3 MB. Or paste an image URL:</div><input class="input" name="photoUrl" type="url" placeholder="https://..." style="margin-top:6px"></div></div></div>
        <div class="field full"><div class="label">Working days</div><div class="check-row">${[1, 2, 3, 4, 5, 6, 0].map((n) => `<label class="check-pill"><input type="checkbox" name="day" value="${n}" ${a.days.includes(n) ? 'checked' : ''}><span>${UI.DAYS[n]}</span></label>`).join('')}</div></div>
        <div class="field"><label for="f-start">Start time</label><input class="input" id="f-start" name="startTime" type="time" required value="${a.startTime}"></div>
        <div class="field"><label for="f-end">End time</label><input class="input" id="f-end" name="endTime" type="time" required value="${a.endTime}"></div>
        <div class="field"><label for="f-slot">Appointment length</label><select class="input" id="f-slot" name="slotMinutes">${[10, 15, 20, 30, 45, 60].map((n) => `<option value="${n}" ${a.slotMinutes === n ? 'selected' : ''}>${n} minutes</option>`).join('')}</select></div>
      </div></form>`,
      footer: `<button class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary" data-save>${edit ? 'Save changes' : 'Add doctor'}</button>`
    });
    const f = m.el.querySelector('#df');
    m.el.querySelector('[data-x]').onclick = m.close;
    f.querySelector('#f-photo').onchange = (e) => { const file = e.target.files[0]; if (file) m.el.querySelector('#prev').src = URL.createObjectURL(file); };
    const save = m.el.querySelector('[data-save]');
    save.onclick = async () => {
      UI.formError(f);
      const fd = new FormData(f);
      const days = fd.getAll('day'); fd.delete('day'); fd.set('days', days.join(','));
      if (!fd.get('photo') || !fd.get('photo').size) fd.delete('photo');
      if (!fd.get('photoUrl')) fd.delete('photoUrl');
      if (edit && !fd.get('password')) fd.delete('password');
      if (fd.get('name').trim().length < 2) return UI.formError(f, 'Enter the doctor\'s name.');
      if (!days.length) return UI.formError(f, 'Select at least one working day.');
      UI.busy(save, true, 'Saving...');
      try {
        await (edit ? API.put('/doctors/' + d._id, fd) : API.post('/doctors', fd));
        UI.toast(edit ? 'Doctor updated.' : 'Doctor added.'); m.close(); load();
      } catch (e) { UI.formError(f, e.message); UI.busy(save, false); }
    };
  }

  $('#add').onclick = () => (depts.length ? form(null) : UI.toast('Create a department first.', 'error'));
  $('#tbl').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const d = rows.find((x) => x._id === b.dataset.id);
    if (b.dataset.a === 'view') view(d);
    if (b.dataset.a === 'edit') form(d);
    if (b.dataset.a === 'del') {
      if (!(await UI.confirm({ title: 'Remove doctor', message: `Remove ${d.name}? Their login is deleted and any pending or approved appointments are cancelled.`, confirmText: 'Remove doctor', danger: true }))) return;
      try { const r = await API.del('/doctors/' + d._id); UI.toast(r.message); load(); } catch (err) { UI.toast(err.message, 'error'); }
    }
  });
  $('#q').addEventListener('input', UI.debounce((e) => { st.search = e.target.value.trim(); st.page = 1; load(); }));
  $('#dept').onchange = (e) => { st.department = e.target.value; st.page = 1; load(); };
  $('#sort').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };
  load();
})();
