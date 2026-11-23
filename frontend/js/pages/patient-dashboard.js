(async () => {
  const { esc } = UI;
  const { user, main } = await Shell.mount({ role: 'patient', active: 'dashboard', title: 'Dashboard' });
  let upcoming = [];

  async function load() {
    UI.loading(main, 'Loading your health summary...');
    try {
      const d = (await API.get('/stats/patient')).data, t = d.totals;
      upcoming = d.upcoming;
      const next = upcoming[0];
      const stat = (icon, cls, v, l) => `<div class="stat"><div class="ico ${cls}"><i class="fa-solid ${icon}"></i></div><div><b>${v}</b><span>${l}</span></div></div>`;
      main.innerHTML = `
        <div class="welcome"><div><h2>Hello, ${esc(user.name.split(' ')[0])}</h2><p>${next ? `Your next visit is on ${UI.fmtDate(next.date)} at ${UI.fmtTime(next.time)} with ${esc(next.doctor.name)}.` : 'You have no upcoming appointments.'}</p></div><a class="btn btn-light" href="book-appointment.html"><i class="fa-regular fa-calendar-plus"></i> Book appointment</a></div>
        <div class="stats">${stat('fa-calendar-day', '', t.upcoming, 'Upcoming appointments')}${stat('fa-circle-check', 'ok', t.completed, 'Completed visits')}${stat('fa-pills', 'navy', t.prescriptions, 'Prescriptions')}${stat('fa-file-medical', 'navy', t.records, 'Medical records')}</div>
        <div class="two-col">
          <div class="card"><div class="card-head"><h3>Upcoming appointments</h3><a class="btn btn-outline btn-sm" href="appointments.html">View all</a></div>
            ${upcoming.length ? upcoming.map((a) => `<div class="list-row"><div class="time">${UI.fmtDate(a.date).slice(0, -5)}<small>${UI.fmtTime(a.time)}</small></div><div class="grow"><strong>${esc(a.doctor.name)}</strong><div class="small muted ellipsis">${esc(a.doctor.specialization || '')} · ${esc(a.reason)}</div></div>${UI.badge(a.status)}<div class="actions"><button class="icon-btn teal" data-a="view" data-id="${a._id}" title="View" aria-label="View details"><i class="fa-solid fa-eye"></i></button>${AppointmentsPage.eligibleToCancel(a) ? `<button class="icon-btn bad" data-a="cancel" data-id="${a._id}" title="Cancel" aria-label="Cancel appointment"><i class="fa-solid fa-ban"></i></button>` : ''}</div></div>`).join('') : UI.empty('fa-calendar-plus', 'No upcoming appointments', 'Book a visit with one of our specialists.', '<a class="btn btn-primary btn-sm" href="book-appointment.html">Book appointment</a>')}</div>
          <div style="display:grid;gap:20px">
            <div class="card"><div class="card-head"><h3>Recent prescriptions</h3><a class="btn btn-outline btn-sm" href="records.html">All records</a></div>
              ${d.recentPrescriptions.length ? d.recentPrescriptions.map((x) => `<div class="list-row" style="align-items:flex-start"><div class="grow"><strong>${esc(x.medicines.map((m) => m.name).join(', '))}</strong><div class="small muted">${UI.fmtDate(x.date)} · ${esc(x.doctor)}</div></div></div>`).join('') : UI.empty('fa-pills', 'No prescriptions yet', 'Prescriptions from your consultations appear here.')}</div>
            <div class="card card-pad"><div class="profile-card">${UI.avatar(user.name, '', 'avatar-lg')}<div><h4 style="margin:0">${esc(user.name)}</h4><div class="muted small">${esc(user.email)}</div><div class="muted small">${esc(user.phone || '')}</div></div></div><a class="btn btn-outline btn-sm mt" href="profile.html">Edit profile</a></div></div></div>`;
    } catch (e) { UI.errorBox(main, e.message, load); }
  }
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = upcoming.find((x) => x._id === b.dataset.id);
    if (b.dataset.a === 'view') AppointmentsPage.openView(a, 'patient');
    if (b.dataset.a === 'cancel') AppointmentsPage.setStatus(a, 'cancelled', { title: 'Cancel appointment', message: `Cancel your appointment with ${a.doctor.name} on ${UI.fmtDate(a.date)}?`, confirmText: 'Cancel appointment', danger: true }, load);
  });
  load();
})();
