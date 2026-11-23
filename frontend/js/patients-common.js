// Patient list + detail modal shared by the admin and doctor dashboards.
(function () {
  const { esc } = UI;

  async function openPatient(id) {
    const m = UI.modal({ title: 'Patient profile', size: 'lg', body: '<div class="loading"><div class="spinner"></div></div>', footer: '<button class="btn btn-outline" data-x>Close</button>' });
    m.el.querySelector('[data-x]').onclick = m.close;
    try {
      const { profile: p, appointments, records, prescriptions } = (await API.get('/patients/' + id)).data;
      m.body.innerHTML = `
        <div class="profile-card" style="margin-bottom:20px">${UI.avatar(p.name, '', 'avatar-lg')}<div><h3 style="margin:0">${esc(p.name)}</h3><div class="muted">${esc(p.email)} · ${esc(p.phone || '-')}</div></div></div>
        <dl class="dl" style="margin-bottom:22px">
          <dt>Gender / age</dt><dd>${esc(UI.cap(p.gender) || '-')} · ${UI.age(p.dateOfBirth)} yrs</dd>
          <dt>Date of birth</dt><dd>${UI.fmtDate(p.dateOfBirth)}</dd>
          <dt>Blood group</dt><dd>${esc(p.bloodGroup || '-')}</dd>
          <dt>Allergies</dt><dd>${esc(p.allergies || 'None recorded')}</dd>
          <dt>Address</dt><dd>${esc(p.address || '-')}</dd>
          <dt>Emergency contact</dt><dd>${p.emergencyContact && p.emergencyContact.phone ? esc(p.emergencyContact.name || 'Contact') + ' · ' + esc(p.emergencyContact.phone) : '-'}</dd>
          <dt>Registered</dt><dd>${UI.fmtDate(p.createdAt)}</dd>
        </dl>
        <h4>Appointment history</h4>
        ${appointments.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Doctor</th><th>Reason</th><th>Status</th></tr></thead><tbody>${appointments.map((a) => `<tr><td style="white-space:nowrap">${UI.fmtDate(a.date)}<br><span class="small muted">${UI.fmtTime(a.time)}</span></td><td>${esc(a.doctor.name)}</td><td>${esc(a.reason)}</td><td>${UI.badge(a.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No appointments.</p>'}
        <h4 style="margin-top:22px">Consultation records</h4>
        ${records.length ? records.map((r) => `<div class="rx-card"><div class="flex between wrap"><strong>${esc(r.diagnosis)}</strong><span class="small muted">${UI.fmtDate(r.visitDate)} · ${esc(r.doctor.name)}</span></div>${r.notes ? `<p class="muted" style="margin:6px 0 0">${esc(r.notes)}</p>` : ''}</div>`).join('') : '<p class="muted">No consultation records yet.</p>'}
        <h4 style="margin-top:22px">Prescriptions</h4>
        ${prescriptions.length ? prescriptions.map((x) => `<div class="rx-card"><div class="small muted">${UI.fmtDate(x.date)} · ${esc(x.doctor.name)}</div><table class="med-table"><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${x.medicines.map((md) => `<tr><td>${esc(md.name)}</td><td>${esc(md.dosage)}</td><td>${esc(md.frequency || '-')}</td><td>${esc(md.duration || '-')}</td></tr>`).join('')}</tbody></table>${x.advice ? `<p class="small" style="margin:8px 0 0"><b>Advice:</b> ${esc(x.advice)}</p>` : ''}</div>`).join('') : '<p class="muted">No prescriptions yet.</p>'}`;
    } catch (e) { UI.errorBox(m.body, e.message); }
  }

  function render(main, { role }) {
    const st = { page: 1, search: '', gender: '', sort: 'newest' };
    let rows = [];
    main.innerHTML = `
      <div class="page-head"><div><h2>${role === 'admin' ? 'Patients' : 'My patients'}</h2><p>${role === 'admin' ? 'Everyone registered with the hospital.' : 'Patients who have booked with you.'}</p></div></div>
      <div class="card"><div class="toolbar">
        <div class="input-icon grow"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="q" type="search" placeholder="Search by name, email or phone" aria-label="Search patients"></div>
        <select class="input" id="gender" aria-label="Gender"><option value="">All genders</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select>
        <select class="input" id="sort" aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
        <div id="tbl"></div><div id="pg"></div></div>`;
    const $ = (s) => main.querySelector(s);
    async function load() {
      UI.loading($('#tbl'));
      try {
        const r = await API.get('/patients', { page: st.page, limit: 10, search: st.search, gender: st.gender, sort: st.sort });
        rows = r.data;
        if (!rows.length) { $('#tbl').innerHTML = UI.empty('fa-users', 'No patients found', 'Try a different search or filter.'); $('#pg').innerHTML = ''; return; }
        $('#tbl').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Patient</th><th>Phone</th><th>Gender / age</th><th>Blood</th><th>Visits</th><th>Last visit</th><th>Actions</th></tr></thead><tbody>${rows.map((p) => `<tr>
          <td><div class="cell-person">${UI.avatar(p.name)}<div><strong>${esc(p.name)}</strong><span class="small muted">${esc(p.email)}</span></div></div></td>
          <td>${esc(p.phone || '-')}</td><td>${esc(UI.cap(p.gender) || '-')} · ${UI.age(p.dateOfBirth)}</td><td>${esc(p.bloodGroup || '-')}</td><td>${p.appointmentCount}</td><td>${p.lastVisit ? UI.fmtDate(p.lastVisit) : '-'}</td>
          <td><div class="actions"><button class="icon-btn teal" data-id="${p._id}" title="View profile" aria-label="View profile"><i class="fa-solid fa-eye"></i></button></div></td></tr>`).join('')}</tbody></table></div>`;
        UI.pager($('#pg'), r.pagination, (pg) => { st.page = pg; load(); });
      } catch (e) { UI.errorBox($('#tbl'), e.message, load); }
    }
    $('#tbl').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) openPatient(b.dataset.id); });
    $('#q').addEventListener('input', UI.debounce((e) => { st.search = e.target.value.trim(); st.page = 1; load(); }));
    $('#gender').onchange = (e) => { st.gender = e.target.value; st.page = 1; load(); };
    $('#sort').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };
    load();
  }
  window.PatientsPage = { render, openPatient };
})();
