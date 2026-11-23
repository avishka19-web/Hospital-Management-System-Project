(async () => {
  const { esc } = UI;
  const { main } = await Shell.mount({ role: 'admin', active: 'reports', title: 'Reports' });

  async function load() {
    UI.loading(main, 'Building reports...');
    try {
      const d = (await API.get('/stats/reports')).data, t = d.totals, c = d.charts;
      main.innerHTML = `
        <div class="page-head"><div><h2>Reports & analytics</h2><p>Last 12 months of hospital activity.</p></div>
          <div class="flex gap no-print"><button class="btn btn-outline" id="csv"><i class="fa-solid fa-file-csv"></i> Export CSV</button><button class="btn btn-navy" id="print"><i class="fa-solid fa-print"></i> Print</button></div></div>
        <div class="stats">
          <div class="stat"><div class="ico"><i class="fa-solid fa-calendar-check"></i></div><div><b>${t.appointments}</b><span>Total appointments</span></div></div>
          <div class="stat"><div class="ico navy"><i class="fa-solid fa-users"></i></div><div><b>${t.patients}</b><span>Patients</span></div></div>
          <div class="stat"><div class="ico ok"><i class="fa-solid fa-circle-check"></i></div><div><b>${t.completionRate}%</b><span>Completion rate</span></div></div>
          <div class="stat"><div class="ico warn"><i class="fa-solid fa-ban"></i></div><div><b>${t.cancellationRate}%</b><span>Cancelled / rejected</span></div></div>
        </div>
        <div class="charts">
          <div class="card"><div class="card-head"><h3>Monthly appointments</h3></div><div class="chart-box"><canvas id="c1" role="img" aria-label="Monthly appointments"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Monthly new patients</h3></div><div class="chart-box"><canvas id="c2" role="img" aria-label="Monthly new patients"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Appointment status report</h3></div><div class="chart-box"><canvas id="c3" role="img" aria-label="Status report"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Department statistics</h3></div><div class="chart-box"><canvas id="c4" role="img" aria-label="Department statistics"></canvas></div></div>
        </div>
        <div class="card"><div class="card-head"><h3>Doctor performance overview</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Doctor</th><th>Department</th><th>Total</th><th>Completed</th><th>Pending</th><th>Cancelled / rejected</th><th>Completion</th></tr></thead><tbody>${d.doctors.map((x) => `<tr><td><strong style="color:var(--navy)">${esc(x.name)}</strong><br><span class="small muted">${esc(x.specialization)}</span></td><td>${esc(x.department)}</td><td>${x.total}</td><td>${x.completed}</td><td>${x.pending}</td><td>${x.cancelled}</td><td style="min-width:140px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:#e8edf3;border-radius:6px"><div style="width:${x.completionRate}%;height:100%;background:var(--teal);border-radius:6px"></div></div><span class="small">${x.completionRate}%</span></div></td></tr>`).join('')}</tbody></table></div></div>
        <div class="card"><div class="card-head"><h3>Department breakdown</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Department</th><th>Total</th><th>Completed</th><th>Pending</th><th>Cancelled / rejected</th></tr></thead><tbody>${d.departments.map((x) => `<tr><td><strong style="color:var(--navy)">${esc(x.name)}</strong></td><td>${x.total}</td><td>${x.completed}</td><td>${x.pending}</td><td>${x.cancelled}</td></tr>`).join('')}</tbody></table></div></div>`;
      const grid = { color: '#e8edf3' }, noLegend = { legend: { display: false } };
      UI.chart(main.querySelector('#c1'), { type: 'bar', data: { labels: c.monthlyAppointments.labels, datasets: [{ data: c.monthlyAppointments.values, backgroundColor: '#0f9d9a', borderRadius: 5 }] }, options: { maintainAspectRatio: false, plugins: noLegend, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } } });
      UI.chart(main.querySelector('#c2'), { type: 'line', data: { labels: c.patientRegistrations.labels, datasets: [{ data: c.patientRegistrations.values, borderColor: '#13315c', backgroundColor: 'rgba(19,49,92,.08)', fill: true, tension: .3 }] }, options: { maintainAspectRatio: false, plugins: noLegend, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } } });
      UI.chart(main.querySelector('#c3'), { type: 'doughnut', data: { labels: c.statusDistribution.labels, datasets: [{ data: c.statusDistribution.values, backgroundColor: ['#e0a526', '#5fb7e5', '#c0504d', '#0f9d9a', '#9aa8bb'] }] }, options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' } } } });
      UI.chart(main.querySelector('#c4'), { type: 'bar', data: { labels: d.departments.map((x) => x.name), datasets: [{ label: 'Completed', data: d.departments.map((x) => x.completed), backgroundColor: '#0f9d9a' }, { label: 'Pending', data: d.departments.map((x) => x.pending), backgroundColor: '#e0a526' }, { label: 'Cancelled / rejected', data: d.departments.map((x) => x.cancelled), backgroundColor: '#c0504d' }] }, options: { maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid } } } });
      main.querySelector('#print').onclick = () => window.print();
      main.querySelector('#csv').onclick = () => UI.downloadCSV(`hospital-report-${UI.todayStr()}.csv`, [
        ['Doctor performance'], ['Doctor', 'Department', 'Total', 'Completed', 'Pending', 'Cancelled/Rejected', 'Completion %'],
        ...d.doctors.map((x) => [x.name, x.department, x.total, x.completed, x.pending, x.cancelled, x.completionRate]), [],
        ['Department statistics'], ['Department', 'Total', 'Completed', 'Pending', 'Cancelled/Rejected'], ...d.departments.map((x) => [x.name, x.total, x.completed, x.pending, x.cancelled]), [],
        ['Monthly appointments'], ['Month', 'Appointments'], ...c.monthlyAppointments.labels.map((l, i) => [l, c.monthlyAppointments.values[i]])
      ]);
    } catch (e) { UI.errorBox(main, e.message, load); }
  }
  load();
})();
