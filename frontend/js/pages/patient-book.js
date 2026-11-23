(async () => {
  const { esc } = UI;
  const { main } = await Shell.mount({ role: 'patient', active: 'book-appointment', title: 'Book appointment' });
  const st = { department: '', doctor: null, date: '', time: null };
  let depts = [], doctors = [];

  main.innerHTML = `
    <div class="page-head"><div><h2>Book an appointment</h2><p>Choose a department and doctor, then pick a free time slot.</p></div></div>
    <div class="card card-pad steps" id="wizard"><div class="loading"><div class="spinner"></div></div></div>`;
  const w = main.querySelector('#wizard');

  try {
    depts = (await API.get('/departments')).data.filter((d) => d.doctorCount > 0);
    const pre = new URLSearchParams(location.search).get('doctor');
    if (pre) { try { const d = (await API.get('/doctors/' + pre)).data; st.department = d.department._id; st.doctor = d; } catch (e) { UI.toast('That doctor could not be found.', 'error'); } }
  } catch (e) { return UI.errorBox(w, e.message); }

  async function loadDoctors() {
    if (!st.department) { doctors = []; return; }
    try { doctors = (await API.get('/doctors', { department: st.department, limit: 50, sort: 'experience' })).data; } catch (e) { UI.toast(e.message, 'error'); doctors = []; }
  }

  function draw() {
    w.innerHTML = `<form id="bf" novalidate>
      <h3><span class="n">1</span>Department</h3>
      <div class="field"><select class="input" id="dept" aria-label="Department" style="max-width:360px"><option value="">Select department</option>${depts.map((d) => `<option value="${d._id}" ${d._id === st.department ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
      <h3 style="margin-top:24px"><span class="n">2</span>Doctor</h3>
      ${st.department ? (doctors.length ? `<div class="pick-grid">${doctors.map((d) => `<button type="button" class="pick ${st.doctor && st.doctor._id === d._id ? 'selected' : ''}" data-doc="${d._id}">${UI.avatar(d.name, d.photo)}<div><strong>${esc(d.name)}</strong><span>${esc(d.specialization)} · ${UI.money(d.fee)}</span><br><span>${esc(UI.daysText(d.availability.days))}</span></div></button>`).join('')}</div>` : '<p class="muted">No doctors available in this department.</p>') : '<p class="muted">Choose a department to see its doctors.</p>'}
      ${st.doctor ? `<h3 style="margin-top:24px"><span class="n">3</span>Date & time</h3>
        <div class="field" style="max-width:260px"><label for="date">Appointment date</label><input class="input" id="date" type="date" min="${UI.todayStr()}" max="${UI.addDays(UI.todayStr(), 90)}" value="${st.date}"><div class="hint">${esc(st.doctor.name)} works ${esc(UI.availText(st.doctor.availability))}</div></div>
        <div id="slots">${st.date ? '' : '<p class="muted">Pick a date to see open slots.</p>'}</div>
        <h3 style="margin-top:24px"><span class="n">4</span>Reason for visit</h3>
        <div class="field"><textarea class="input" id="reason" maxlength="500" rows="3" placeholder="Briefly describe your symptoms or the purpose of the visit"></textarea></div>
        <div id="summary" class="notice hidden" style="margin-bottom:16px"></div>
        <button class="btn btn-primary btn-lg" type="submit" id="submit" disabled><i class="fa-regular fa-calendar-check"></i> Request appointment</button>` : ''}
    </form>`;
    w.querySelector('#dept').onchange = async (e) => { st.department = e.target.value; st.doctor = null; st.time = null; await loadDoctors(); draw(); };
    w.querySelectorAll('[data-doc]').forEach((b) => (b.onclick = () => { st.doctor = doctors.find((d) => d._id === b.dataset.doc); st.time = null; const r = w.querySelector('#reason'); draw(); }));
    if (!st.doctor) return;
    const submit = w.querySelector('#submit'), summary = w.querySelector('#summary'), reason = w.querySelector('#reason');
    const refresh = () => {
      const ok = st.time && st.date && reason.value.trim().length >= 3;
      submit.disabled = !ok;
      summary.classList.toggle('hidden', !(st.time && st.date));
      summary.innerHTML = `<b>${esc(st.doctor.name)}</b> · ${UI.fmtDate(st.date)} (${UI.fmtWeekday(st.date)}) at ${UI.fmtTime(st.time)} · Fee ${UI.money(st.doctor.fee)} payable at the hospital`;
    };
    const loadSlots = () => { st.time = null; refresh(); SlotPicker.mount(w.querySelector('#slots'), { doctorId: st.doctor._id, date: st.date, onSelect: (t) => { st.time = t; refresh(); } }); };
    w.querySelector('#date').onchange = (e) => { st.date = e.target.value; if (st.date) loadSlots(); };
    if (st.date) loadSlots();
    reason.oninput = refresh;
    w.querySelector('#bf').onsubmit = async (e) => {
      e.preventDefault();
      UI.busy(submit, true, 'Booking...');
      try {
        const r = await API.post('/appointments', { doctor: st.doctor._id, date: st.date, time: st.time, reason: reason.value.trim() });
        UI.toast(r.message);
        const m = UI.modal({ title: 'Appointment requested', size: 'sm', body: `<div class="center"><div class="empty" style="padding:8px"><i class="fa-solid fa-circle-check"></i><h4>Request sent</h4><p>${esc(st.doctor.name)}<br>${UI.fmtDate(st.date)} at ${UI.fmtTime(st.time)}<br>Status: Pending approval</p></div></div>`, footer: '<a class="btn btn-primary" href="appointments.html">View my appointments</a>', onClose: () => (location.href = 'appointments.html') });
      } catch (err) { UI.toast(err.message, 'error'); UI.busy(submit, false); if (err.status === 409 && st.date) loadSlots(); }
    };
  }
  await loadDoctors();
  draw();
})();
