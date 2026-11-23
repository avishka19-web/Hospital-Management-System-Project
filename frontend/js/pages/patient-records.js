(async () => {
  const { esc } = UI;
  const { main } = await Shell.mount({ role: 'patient', active: 'records', title: 'Records & prescriptions' });
  main.innerHTML = `<div class="page-head"><div><h2>Medical records & prescriptions</h2><p>Notes and prescriptions added by your doctors after each consultation.</p></div></div>
    <div class="tabs" id="tabs"><button class="tab active" data-t="rec">Consultation history</button><button class="tab" data-t="rx">Prescriptions</button></div><div class="card" id="box"></div>`;
  const box = main.querySelector('#box');
  let records = [], rxs = [], tab = 'rec';

  function draw() {
    if (tab === 'rec') {
      box.innerHTML = records.length ? records.map((r) => `<div class="record"><div class="top"><strong style="color:var(--navy);font-size:16px">${esc(r.diagnosis)}</strong><span class="small muted">${UI.fmtDate(r.visitDate)}</span></div><div class="small" style="color:var(--teal-dark);font-weight:600;margin-bottom:6px">${esc(r.doctor.name)}${r.doctor.specialization ? ' · ' + esc(r.doctor.specialization) : ''}</div>${r.notes ? `<p class="muted" style="margin:0"><b style="color:var(--text)">Doctor's notes:</b> ${esc(r.notes)}</p>` : ''}</div>`).join('') : UI.empty('fa-file-medical', 'No consultation records yet', 'Your doctor\'s notes will appear here after a completed visit.');
    } else {
      box.innerHTML = rxs.length ? rxs.map((x) => `<div class="record"><div class="top"><strong style="color:var(--navy);font-size:16px">Prescription · ${UI.fmtDate(x.date)}</strong><span class="small muted">${esc(x.doctor.name)}</span></div>
        <div class="table-wrap"><table class="med-table"><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${x.medicines.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td>${esc(m.dosage)}</td><td>${esc(m.frequency || '-')}</td><td>${esc(m.duration || '-')}</td></tr>`).join('')}</tbody></table></div>${x.advice ? `<p class="small" style="margin:10px 0 0"><b>Advice:</b> ${esc(x.advice)}</p>` : ''}</div>`).join('') : UI.empty('fa-pills', 'No prescriptions yet', 'Prescriptions issued by your doctors will appear here.');
    }
  }
  async function load() {
    UI.loading(box);
    try {
      const [r, p] = await Promise.all([API.get('/records', { limit: 100 }), API.get('/prescriptions', { limit: 100 })]);
      records = r.data; rxs = p.data; draw();
    } catch (e) { UI.errorBox(box, e.message, load); }
  }
  main.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; main.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('active', x === b)); draw(); }));
  load();
})();
