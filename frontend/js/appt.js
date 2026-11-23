// Shared appointment UI: slot picker, detail / reschedule / consultation modals, and the list page.
(function () {
  const { esc } = UI;

  // ---------------- slot picker ----------------
  window.SlotPicker = {
    mount(el, { doctorId, date, excludeId, selected, onSelect }) {
      let sel = selected || null;
      UI.loading(el, 'Checking availability...');
      return API.get('/appointments/slots', { doctor: doctorId, date, exclude: excludeId }).then((r) => {
        const d = r.data;
        if (!d.working) {
          el.innerHTML = `<div class="notice warn">This doctor does not work on ${UI.DAYS_LONG[UI.dayOfWeek(date)]}s. Working days: ${esc(UI.daysText(d.days))}.</div>`;
          return onSelect(null);
        }
        const open = d.slots.filter((s) => s.available).length;
        el.innerHTML = open
          ? `<p class="small muted" style="margin-bottom:8px">${open} of ${d.slots.length} slots open on ${UI.fmtDate(date)}</p><div class="slot-grid">${d.slots.map((s) => `<button type="button" class="slot ${s.time === sel ? 'selected' : ''}" data-t="${s.time}" ${s.available ? '' : 'disabled'} title="${s.reason === 'booked' ? 'Already booked' : s.reason === 'past' ? 'Time has passed' : 'Available'}">${UI.fmtTime(s.time)}</button>`).join('')}</div>`
          : `<div class="notice warn">No open slots on this date. Try another day.</div>`;
        if (sel && !d.slots.some((s) => s.time === sel && s.available)) { sel = null; onSelect(null); }
        el.querySelectorAll('.slot').forEach((b) => (b.onclick = () => {
          sel = b.dataset.t;
          el.querySelectorAll('.slot').forEach((x) => x.classList.toggle('selected', x === b));
          onSelect(sel);
        }));
      }).catch((e) => { UI.errorBox(el, e.message); onSelect(null); });
    }
  };

  const eligibleToCancel = (a) => ['pending', 'approved'].includes(a.status) && new Date(`${a.date}T${a.time}:00`) - new Date() >= 2 * 36e5;
  const reachedDate = (a) => a.date <= UI.todayStr();

  // ---------------- detail modal ----------------
  function openView(a, role) {
    const p = a.patient || {};
    const rows = [
      role !== 'patient' && ['Patient', `${esc(p.name)}${p.gender ? ' · ' + esc(UI.cap(p.gender)) : ''}${p.dateOfBirth ? ' · ' + UI.age(p.dateOfBirth) + ' yrs' : ''}`],
      role !== 'patient' && p.phone && ['Phone', esc(p.phone)],
      role === 'doctor' && p.bloodGroup && ['Blood group', esc(p.bloodGroup)],
      role === 'doctor' && p.allergies && ['Allergies', esc(p.allergies)],
      role !== 'doctor' && ['Doctor', `${esc(a.doctor.name)}${a.doctor.specialization ? ' · ' + esc(a.doctor.specialization) : ''}`],
      ['Department', esc(a.department ? a.department.name : '-')],
      ['Date', UI.fmtDate(a.date) + ' (' + UI.fmtWeekday(a.date) + ')'],
      ['Time', UI.fmtTime(a.time)],
      ['Status', UI.badge(a.status)],
      ['Reason', esc(a.reason)],
      a.notes && ['Doctor notes', esc(a.notes)],
      a.adminNote && ['Hospital note', esc(a.adminNote)],
      ['Requested on', UI.fmtDate(a.createdAt)]
    ].filter(Boolean);
    const m = UI.modal({ title: 'Appointment details', body: `<dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`, footer: '<button class="btn btn-outline" data-x>Close</button>' });
    m.el.querySelector('[data-x]').onclick = m.close;
  }

  // ---------------- reschedule (admin) ----------------
  function openReschedule(a, done) {
    let time = null;
    const m = UI.modal({
      title: 'Reschedule appointment',
      body: `<p class="muted">${esc(a.patient.name)} with ${esc(a.doctor.name)}. Currently ${UI.fmtDate(a.date)} at ${UI.fmtTime(a.time)}.</p>
        <div class="field"><label for="rsDate">New date</label><input class="input" id="rsDate" type="date" min="${UI.todayStr()}" value="${a.date >= UI.todayStr() ? a.date : UI.todayStr()}"></div>
        <div class="label">Available time slots</div><div id="rsSlots"></div>`,
      footer: '<button class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary" data-save disabled>Save new time</button>'
    });
    const save = m.el.querySelector('[data-save]');
    const load = () => SlotPicker.mount(m.el.querySelector('#rsSlots'), { doctorId: a.doctor._id, date: m.el.querySelector('#rsDate').value, excludeId: a._id, selected: m.el.querySelector('#rsDate').value === a.date ? a.time : null, onSelect: (t) => { time = t; save.disabled = !t; } });
    m.el.querySelector('#rsDate').onchange = load;
    load();
    m.el.querySelector('[data-x]').onclick = m.close;
    save.onclick = async () => {
      UI.busy(save, true, 'Saving...');
      try { await API.put('/appointments/' + a._id, { date: m.el.querySelector('#rsDate').value, time }); UI.toast('Appointment rescheduled.'); m.close(); done(); }
      catch (e) { UI.toast(e.message, 'error'); UI.busy(save, false); }
    };
  }

  // ---------------- consultation (doctor) ----------------
  async function openConsult(a, done) {
    const m = UI.modal({ title: `Consultation · ${a.patient.name}`, size: 'lg', body: '<div class="loading"><div class="spinner"></div></div>', footer: '<button class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary" data-save>Save consultation</button>' });
    m.el.querySelector('[data-x]').onclick = m.close;
    let rec = null, rx = null;
    try {
      const [r, p] = await Promise.all([API.get('/records', { appointment: a._id }), API.get('/prescriptions', { appointment: a._id })]);
      rec = r.data[0] || null; rx = p.data[0] || null;
    } catch (e) { UI.toast(e.message, 'error'); }

    const medRow = (x = {}) => `<div class="med-row"><input class="input" data-f="name" placeholder="Medicine" value="${esc(x.name || '')}" maxlength="100"><input class="input" data-f="dosage" placeholder="Dosage (e.g. 500 mg)" value="${esc(x.dosage || '')}" maxlength="60"><input class="input" data-f="frequency" placeholder="Frequency" value="${esc(x.frequency || '')}" maxlength="60"><input class="input" data-f="duration" placeholder="Duration" value="${esc(x.duration || '')}" maxlength="60"><button type="button" class="icon-btn bad" data-rm aria-label="Remove medicine"><i class="fa-solid fa-trash"></i></button></div>`;
    m.body.innerHTML = `<form id="cf" novalidate>
      <div class="notice" style="margin-bottom:16px">${UI.fmtDate(a.date)} at ${UI.fmtTime(a.time)} · Reason: ${esc(a.reason)}</div>
      <div class="field"><label for="dx">Diagnosis</label><input class="input" id="dx" maxlength="300" value="${esc(rec ? rec.diagnosis : '')}" placeholder="e.g. Mild hypertension"></div>
      <div class="field"><label for="nt">Consultation notes</label><textarea class="input" id="nt" maxlength="2000" rows="4" placeholder="Findings, examination, plan">${esc(rec ? rec.notes : '')}</textarea></div>
      <div class="label">Prescription</div><div id="meds">${(rx && rx.medicines.length ? rx.medicines : []).map(medRow).join('')}</div>
      <button type="button" class="btn btn-outline btn-sm" id="addMed" style="margin-bottom:14px"><i class="fa-solid fa-plus"></i> Add medicine</button>
      <div class="field"><label for="adv">Advice for the patient</label><textarea class="input" id="adv" maxlength="1000" rows="2">${esc(rx ? rx.advice : '')}</textarea></div>
      ${a.status === 'approved' ? '<label class="flex items-center" style="gap:8px"><input type="checkbox" id="mc" checked> Mark this appointment as completed</label>' : ''}
    </form>`;
    const meds = m.el.querySelector('#meds');
    m.el.querySelector('#addMed').onclick = () => { meds.insertAdjacentHTML('beforeend', medRow()); meds.lastElementChild.querySelector('input').focus(); };
    meds.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) b.closest('.med-row').remove(); });
    const save = m.el.querySelector('[data-save]');
    save.onclick = async () => {
      const medicines = [...meds.querySelectorAll('.med-row')].map((r) => Object.fromEntries([...r.querySelectorAll('[data-f]')].map((i) => [i.dataset.f, i.value.trim()])));
      const form = m.el.querySelector('#cf');
      UI.formError(form);
      const dx = m.el.querySelector('#dx').value.trim();
      if (dx.length < 3) return UI.formError(form, 'Enter a diagnosis (at least 3 characters).');
      if (medicines.some((x) => !x.name || !x.dosage)) return UI.formError(form, 'Each medicine needs a name and a dosage. Remove empty rows.');
      UI.busy(save, true, 'Saving...');
      try {
        const mc = m.el.querySelector('#mc');
        await API.post('/prescriptions', { appointment: a._id, diagnosis: dx, notes: m.el.querySelector('#nt').value, medicines, advice: m.el.querySelector('#adv').value, markCompleted: !!(mc && mc.checked) });
        UI.toast('Consultation saved.'); m.close(); done();
      } catch (e) { UI.formError(form, e.message); UI.busy(save, false); }
    };
  }

  async function setStatus(a, status, opts, done) {
    if (opts && !(await UI.confirm(opts))) return;
    try { await API.put('/appointments/' + a._id, { status }); UI.toast(`Appointment ${status}.`); done(); }
    catch (e) { UI.toast(e.message, 'error'); }
  }

  // ---------------- list page ----------------
  function actionsFor(a, role) {
    const out = [['view', 'fa-eye', 'View details', 'teal']];
    if (role === 'admin') {
      if (a.status === 'pending') out.push(['approve', 'fa-check', 'Approve', 'ok'], ['reject', 'fa-xmark', 'Reject', 'bad']);
      if (['pending', 'approved'].includes(a.status)) out.push(['resched', 'fa-calendar-days', 'Reschedule', 'teal']);
      if (a.status === 'approved') { if (reachedDate(a)) out.push(['complete', 'fa-circle-check', 'Mark completed', 'ok']); out.push(['cancel', 'fa-ban', 'Cancel appointment', 'bad']); }
      out.push(['delete', 'fa-trash', 'Delete record', 'bad']);
    } else if (role === 'doctor') {
      if (a.status === 'pending') out.push(['approve', 'fa-check', 'Approve', 'ok'], ['reject', 'fa-xmark', 'Reject', 'bad']);
      if (a.status === 'approved') { if (reachedDate(a)) out.push(['consult', 'fa-notes-medical', 'Add consultation & prescription', 'teal'], ['complete', 'fa-circle-check', 'Mark completed', 'ok']); out.push(['cancel', 'fa-ban', 'Cancel appointment', 'bad']); }
      if (a.status === 'completed') out.push(['consult', 'fa-notes-medical', 'View / edit consultation', 'teal']);
    } else if (eligibleToCancel(a)) out.push(['cancel', 'fa-ban', 'Cancel appointment', 'bad']);
    return out;
  }

  async function handleAction(act, a, role, reload) {
    if (act === 'view') return openView(a, role);
    if (act === 'approve') return setStatus(a, 'approved', null, reload);
    if (act === 'reject') return setStatus(a, 'rejected', { title: 'Reject appointment', message: `Reject ${a.patient.name}'s request for ${UI.fmtDate(a.date)}?`, confirmText: 'Reject', danger: true }, reload);
    if (act === 'complete') return setStatus(a, 'completed', { title: 'Mark as completed', message: 'Mark this appointment as completed?', confirmText: 'Mark completed' }, reload);
    if (act === 'cancel') return setStatus(a, 'cancelled', { title: 'Cancel appointment', message: role === 'patient' ? `Cancel your appointment with ${a.doctor.name} on ${UI.fmtDate(a.date)}? The slot will be released.` : 'Cancel this appointment? The slot will be released.', confirmText: 'Cancel appointment', danger: true }, reload);
    if (act === 'resched') return openReschedule(a, reload);
    if (act === 'consult') return openConsult(a, reload);
    if (act === 'delete') {
      if (!(await UI.confirm({ title: 'Delete appointment', message: 'Permanently delete this appointment record? This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
      try { await API.del('/appointments/' + a._id); UI.toast('Appointment deleted.'); reload(); } catch (e) { UI.toast(e.message, 'error'); }
    }
  }

  function render(main, { role }) {
    const qp = new URLSearchParams(location.search);
    const st = { page: 1, search: '', status: qp.get('status') || '', date: qp.get('date') || '', sort: 'desc', tab: 'upcoming' };
    let rows = [];
    const tabs = [['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled & rejected'], ['all', 'All']];
    const heads = { admin: ['Patient', 'Doctor', 'Department', 'Date & time', 'Status', 'Actions'], doctor: ['Patient', 'Date & time', 'Reason', 'Status', 'Actions'], patient: ['Doctor', 'Date & time', 'Reason', 'Status', 'Actions'] }[role];

    main.innerHTML = `
      <div class="page-head"><div><h2>${role === 'patient' ? 'My appointments' : 'Appointments'}</h2><p>${{ admin: 'Review, approve and manage every appointment.', doctor: 'Your scheduled consultations.', patient: 'Track your upcoming visits and history.' }[role]}</p></div>
        ${role === 'patient' ? '<a class="btn btn-primary" href="book-appointment.html"><i class="fa-regular fa-calendar-plus"></i> Book appointment</a>' : ''}</div>
      ${role === 'patient' ? `<div class="tabs" id="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === st.tab ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="card">
        ${role !== 'patient' ? `<div class="toolbar"><div class="input-icon grow"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="q" type="search" placeholder="${role === 'admin' ? 'Search patient, doctor or reason' : 'Search patient or reason'}" aria-label="Search"></div>
          <select class="input" id="status" aria-label="Status"><option value="">All statuses</option>${['pending', 'approved', 'completed', 'rejected', 'cancelled'].map((s) => `<option value="${s}" ${st.status === s ? 'selected' : ''}>${UI.cap(s)}</option>`).join('')}</select>
          <input class="input" id="date" type="date" aria-label="Date" value="${esc(st.date)}">
          <select class="input" id="sort" aria-label="Sort"><option value="desc">Newest date first</option><option value="asc">Oldest date first</option></select>
          <button class="btn btn-ghost btn-sm" id="clear">Clear</button></div>` : ''}
        <div id="tbl"></div><div id="pg"></div>
      </div>`;
    const $ = (s) => main.querySelector(s);

    async function load() {
      UI.loading($('#tbl'));
      const p = { page: st.page, limit: 10, search: st.search, date: st.date, sort: st.sort };
      if (role === 'patient') {
        if (st.tab === 'upcoming') p.view = 'upcoming'; else if (st.tab === 'completed') p.status = 'completed'; else if (st.tab === 'cancelled') p.status = 'cancelled,rejected';
      } else p.status = st.status;
      try {
        const r = await API.get('/appointments', p);
        rows = r.data;
        if (!rows.length) { $('#tbl').innerHTML = UI.empty('fa-calendar-xmark', 'No appointments found', role === 'patient' ? 'Nothing here yet. Book a visit with one of our specialists.' : 'Try changing the search or filters.', role === 'patient' ? '<a class="btn btn-primary btn-sm" href="book-appointment.html">Book appointment</a>' : ''); $('#pg').innerHTML = ''; return; }
        $('#tbl').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((a) => {
          const person = (name, sub, photo) => `<td><div class="cell-person">${UI.avatar(name, photo)}<div><strong>${esc(name)}</strong><span class="small muted">${esc(sub || '')}</span></div></div></td>`;
          const when = `<td style="white-space:nowrap"><strong style="color:var(--navy);font-weight:600">${UI.fmtDate(a.date)}</strong><br><span class="small muted">${UI.fmtWeekday(a.date)}, ${UI.fmtTime(a.time)}</span></td>`;
          const reason = `<td style="max-width:240px"><div class="ellipsis" title="${esc(a.reason)}">${esc(a.reason)}</div></td>`;
          const acts = `<td><div class="actions">${actionsFor(a, role).map(([act, ic, t, c]) => `<button class="icon-btn ${c}" data-act="${act}" data-id="${a._id}" title="${t}" aria-label="${t}"><i class="fa-solid ${ic}"></i></button>`).join('')}</div></td>`;
          const status = `<td>${UI.badge(a.status)}</td>`;
          if (role === 'admin') return `<tr>${person(a.patient.name, a.patient.phone)}${person(a.doctor.name, a.doctor.specialization, a.doctor.photo)}<td>${esc(a.department ? a.department.name : '-')}</td>${when}${status}${acts}</tr>`;
          if (role === 'doctor') return `<tr>${person(a.patient.name, [a.patient.gender && UI.cap(a.patient.gender), a.patient.dateOfBirth && UI.age(a.patient.dateOfBirth) + ' yrs'].filter(Boolean).join(' · '))}${when}${reason}${status}${acts}</tr>`;
          return `<tr>${person(a.doctor.name, a.doctor.specialization, a.doctor.photo)}${when}${reason}${status}${acts}</tr>`;
        }).join('')}</tbody></table></div>`;
        UI.pager($('#pg'), r.pagination, (pg) => { st.page = pg; load(); });
      } catch (e) { UI.errorBox($('#tbl'), e.message, load); }
    }

    $('#tbl').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = rows.find((x) => x._id === b.dataset.id);
      if (a) handleAction(b.dataset.act, a, role, load);
    });
    if (role === 'patient') {
      main.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.tab; st.page = 1; main.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b)); load(); }));
    } else {
      $('#q').addEventListener('input', UI.debounce((e) => { st.search = e.target.value.trim(); st.page = 1; load(); }));
      $('#status').onchange = (e) => { st.status = e.target.value; st.page = 1; load(); };
      $('#date').onchange = (e) => { st.date = e.target.value; st.page = 1; load(); };
      $('#sort').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };
      $('#clear').onclick = () => { Object.assign(st, { search: '', status: '', date: '', sort: 'desc', page: 1 }); $('#q').value = ''; $('#status').value = ''; $('#date').value = ''; $('#sort').value = 'desc'; load(); };
    }
    load();
  }

  window.AppointmentsPage = { render, openView, openConsult, openReschedule, setStatus, eligibleToCancel };
})();
