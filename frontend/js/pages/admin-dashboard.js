(async () => {
  const { esc } = UI;
  const { user, main } = await Shell.mount({ role: 'admin', active: 'dashboard', title: 'Dashboard' });

  async function load() {
    UI.loading(main, 'Loading hospital statistics...');
    try {
      const { totals: t, charts: c, recent } = (await API.get('/stats/admin')).data;
      const stat = (icon, cls, v, l) => `<div class="stat"><div class="ico ${cls}"><i class="fa-solid ${icon}"></i></div><div><b>${Number(v).toLocaleString('en-IN')}</b><span>${l}</span></div></div>`;
      main.innerHTML = `
        <div class="page-head"><div><h2>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${esc(user.name.split(' ')[0])}</h2><p>Here is how the hospital is doing today.</p></div>
          <a class="btn btn-primary" href="appointments.html?status=pending"><i class="fa-solid fa-hourglass-half"></i> Review ${t.pending} pending</a></div>
        <div class="stats">
          ${stat('fa-users', '', t.patients, 'Total patients')}${stat('fa-user-doctor', 'navy', t.doctors, 'Total doctors')}${stat('fa-calendar-check', '', t.appointments, 'Total appointments')}
          ${stat('fa-calendar-day', 'navy', t.today, "Today's appointments")}${stat('fa-hourglass-half', 'warn', t.pending, 'Pending approval')}${stat('fa-circle-check', 'ok', t.completed, 'Completed')}
        </div>
        <div class="charts">
          <div class="card"><div class="card-head"><h3>Monthly appointments</h3></div><div class="chart-box"><canvas id="c1" aria-label="Monthly appointments chart" role="img"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Patient registrations</h3></div><div class="chart-box"><canvas id="c2" aria-label="Patient registration trend" role="img"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Appointment status</h3></div><div class="chart-box"><canvas id="c3" aria-label="Appointment status distribution" role="img"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Appointments by department</h3></div><div class="chart-box"><canvas id="c4" aria-label="Department-wise appointments" role="img"></canvas></div></div>
        </div>
        <div class="card"><div class="card-head"><h3>Latest appointment requests</h3><a class="btn btn-outline btn-sm" href="appointments.html">View all</a></div>
          ${recent.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Status</th></tr></thead><tbody>${recent.map((a) => `<tr><td>${esc(a.patient.name)}</td><td>${esc(a.doctor.name)}</td><td>${UI.fmtDate(a.date)} · ${UI.fmtTime(a.time)}</td><td>${UI.badge(a.status)}</td></tr>`).join('')}</tbody></table></div>` : UI.empty('fa-calendar', 'No appointments yet', 'New requests will show up here.')}</div>`;
      const grid = { color: '#e8edf3' };
      const noLegend = { legend: { display: false } };
      UI.chart(main.querySelector('#c1'), { type: 'bar', data: { labels: c.monthlyAppointments.labels, datasets: [{ data: c.monthlyAppointments.values, backgroundColor: '#0f9d9a', borderRadius: 6, maxBarThickness: 38 }] }, options: { maintainAspectRatio: false, plugins: noLegend, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } } });
      UI.chart(main.querySelector('#c2'), { type: 'line', data: { labels: c.patientRegistrations.labels, datasets: [{ data: c.patientRegistrations.values, borderColor: '#13315c', backgroundColor: 'rgba(19,49,92,.08)', fill: true, tension: .3, pointRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: noLegend, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } } });
      UI.chart(main.querySelector('#c3'), { type: 'doughnut', data: { labels: c.statusDistribution.labels, datasets: [{ data: c.statusDistribution.values, backgroundColor: ['#e0a526', '#5fb7e5', '#c0504d', '#0f9d9a', '#9aa8bb'], borderWidth: 2 }] }, options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' } } } });
      UI.chart(main.querySelector('#c4'), { type: 'bar', data: { labels: c.departmentAppointments.labels, datasets: [{ data: c.departmentAppointments.values, backgroundColor: '#13315c', borderRadius: 5 }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: noLegend, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid }, y: { grid: { display: false } } } } });
    } catch (e) { UI.errorBox(main, e.message, load); }
  }
  load();
})();
