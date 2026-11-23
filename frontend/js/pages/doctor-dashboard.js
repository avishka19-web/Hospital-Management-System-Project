(async () => {
  const { esc } = UI;
  const { user, main } = await Shell.mount({ role: 'doctor', active: 'dashboard', title: 'Dashboard' });
  const doc = user.doctor;
  let today = [], upcoming = [];

  async function load() {
    UI.loading(main, 'Loading your day...');
    try {
      const d = (await API.get('/stats/doctor')).data;
      today = d.today; upcoming = d.upcoming;
      const t = d.totals;
      const stat = (icon, cls, v, l) => `<div class="stat"><div class="ico ${cls}"><i class="fa-solid ${icon}"></i></div><div><b>${v}</b><span>${l}</span></div></div>`;
      main.innerHTML = `
        <div class="welcome"><div><h2>Welcome, ${esc(user.name)}</h2><p>${t.today ? `You have ${t.today} appointment${t.today === 1 ? '' : 's'} today.` : 'No appointments scheduled today.'}${t.pending ? ` ${t.pending} request${t.pending === 1 ? ' is' : 's are'} waiting for your approval.` : ''}</p></div>
          <a class="btn btn-light" href="appointments.html"><i class="fa-solid fa-calendar-check"></i> All appointments</a></div>
        <div class="stats">${stat('fa-hospital-user', '', t.patients, 'Assigned patients')}${stat('fa-calendar-day', 'navy', t.today, "Today's appointments")}${stat('fa-calendar-plus', '', t.upcoming, 'Upcoming')}${stat('fa-hourglass-half', 'warn', t.pending, 'Awaiting approval')}${stat('fa-notes-medical', 'warn', t.consultationsPending, 'Pending consultations')}${stat('fa-circle-check', 'ok', t.completed, 'Completed')}</div>
        <div class="two-col"><div style="display:grid;gap:20px">
          <div class="card"><div class="card-head"><h3>Today's appointments</h3><span class="small muted">${UI.fmtDate(UI.todayStr())}</span></div><div id="today">${renderList(today, true)}</div></div>
          <div class="card"><div class="card-head"><h3>Upcoming appointments</h3><a class="btn btn-outline btn-sm" href="appointments.html?status=approved">View all</a></div><div id="up">${renderList(upcoming, false)}</div></div></div>
          <div class="card card-pad"><div class="profile-card">${UI.avatar(user.name, doc && doc.photo, 'avatar-xl')}<div><h3 style="margin:0">${esc(user.name)}</h3><div style="color:var(--teal-dark);font-weight:600">${esc(doc ? doc.specialization : '')}</div><div class="muted small">${esc(doc && doc.department ? doc.department.name : '')}</div></div></div>
            <dl class="dl" style="margin-top:18px"><dt>Qualification</dt><dd>${esc(doc && doc.qualification || '-')}</dd><dt>Experience</dt><dd>${doc ? doc.experience : 0} years</dd><dt>Availability</dt><dd>${doc ? esc(UI.availText(doc.availability)) : '-'}</dd><dt>Email</dt><dd>${esc(user.email)}</dd></dl>
            <a class="btn btn-outline btn-sm mt" href="profile.html">Manage availability</a></div></div>`;
    } catch (e) { UI.errorBox(main, e.message, load); }
  }

  function renderList(list, showTime) {
    if (!list.length) return UI.empty('fa-calendar', showTime ? 'Nothing scheduled today' : 'No upcoming appointments', 'Appointments will appear here as patients book.');
    return list.map((a) => `<div class="list-row"><div class="time">${showTime ? UI.fmtTime(a.time) : UI.fmtDate(a.date).slice(0, -5)}${showTime ? '' : `<small>${UI.fmtTime(a.time)}</small>`}</div>
      <div class="grow"><strong>${esc(a.patient.name)}</strong><div class="small muted ellipsis">${esc(a.reason)}</div></div>${UI.badge(a.status)}
      <div class="actions"><button class="icon-btn teal" data-a="view" data-id="${a._id}" title="View details" aria-label="View details"><i class="fa-solid fa-eye"></i></button>
      ${a.status === 'pending' ? `<button class="icon-btn ok" data-a="approve" data-id="${a._id}" title="Approve" aria-label="Approve"><i class="fa-solid fa-check"></i></button>` : ''}
      ${['approved', 'completed'].includes(a.status) && a.date <= UI.todayStr() ? `<button class="icon-btn teal" data-a="consult" data-id="${a._id}" title="Consultation" aria-label="Consultation"><i class="fa-solid fa-notes-medical"></i></button>` : ''}</div></div>`).join('');
  }

  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = [...today, ...upcoming].find((x) => x._id === b.dataset.id); if (!a) return;
    if (b.dataset.a === 'view') AppointmentsPage.openView(a, 'doctor');
    if (b.dataset.a === 'consult') AppointmentsPage.openConsult(a, load);
    if (b.dataset.a === 'approve') AppointmentsPage.setStatus(a, 'approved', null, load);
  });
  load();
})();
