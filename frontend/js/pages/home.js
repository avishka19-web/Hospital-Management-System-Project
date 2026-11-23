(async () => {
  const { esc } = UI;
  Site.init('index.html');
  document.getElementById('heroBook').href = Site.bookUrl();

  const [stats, depts, docs] = await Promise.allSettled([
    API.get('/stats/public'), API.get('/departments'), API.get('/doctors', { limit: 4, sort: 'experience' })
  ]);

  if (stats.status === 'fulfilled') {
    const s = stats.value.data;
    const items = [[s.doctors, 'Specialist doctors'], [s.patients, 'Registered patients'], [s.departments, 'Departments'], [s.appointments, 'Consultations completed']];
    document.getElementById('stats').innerHTML = items.map(([n, l]) => `<div class="stat-item"><b>${Number(n).toLocaleString('en-IN')}</b><span>${l}</span></div>`).join('');
  }

  const spec = document.getElementById('specialties');
  if (depts.status === 'fulfilled' && depts.value.data.length) {
    spec.innerHTML = depts.value.data.map((d) => `<a class="spec-card" href="departments.html"><div class="ico"><i class="fa-solid ${esc(d.icon)}"></i></div><h4>${esc(d.name)}</h4><span>${d.doctorCount} doctor${d.doctorCount === 1 ? '' : 's'}</span></a>`).join('');
  } else {
    UI.errorBox(spec, depts.reason ? depts.reason.message : 'No departments yet. Run "npm run seed" in the backend folder.');
  }

  const feat = document.getElementById('featured');
  if (docs.status === 'fulfilled' && docs.value.data.length) {
    feat.innerHTML = docs.value.data.map(Site.doctorCard).join('');
    Site.bindDoctorCards(feat, docs.value.data);
  } else {
    UI.errorBox(feat, docs.reason ? docs.reason.message : 'No doctors yet. Run "npm run seed" in the backend folder.');
  }
})();
