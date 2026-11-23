(async () => {
  Site.init('about.html');
  const box = document.getElementById('team');
  try {
    const r = await API.get('/doctors', { limit: 4, sort: 'experience' });
    box.innerHTML = r.data.length ? r.data.map(Site.doctorCard).join('') : UI.empty('fa-user-doctor', 'No doctors listed yet', 'Doctors will appear here once they are added.');
    Site.bindDoctorCards(box, r.data);
  } catch (e) { UI.errorBox(box, e.message); }
})();
