(async () => {
  const { esc } = UI;
  Site.init('departments.html');
  const box = document.getElementById('depts');
  let depts = [];

  try {
    depts = (await API.get('/departments')).data;
    box.innerHTML = depts.length ? depts.map((d) => `
      <article class="dept-card">
        ${UI.img(d.image, d.name, 'photo', d.name)}
        <div class="body">
          <h4><i class="fa-solid ${esc(d.icon)}"></i>${esc(d.name)}</h4>
          <p>${esc(d.description)}</p>
          <div class="flex between items-center" style="margin-top:6px">
            <div class="flex items-center gap" style="gap:8px"><div class="avatar-stack">${d.doctors.slice(0, 3).map((x) => UI.avatar(x.name, x.photo).replace('class="avatar ', 'class="')).join('')}</div><span class="small muted">${d.doctorCount} doctor${d.doctorCount === 1 ? '' : 's'}</span></div>
            <button class="btn btn-outline btn-sm" data-dept="${d._id}">View details</button>
          </div>
        </div>
      </article>`).join('') : UI.empty('fa-building-columns', 'No departments yet', 'Departments will appear here once they are added.');
  } catch (e) { UI.errorBox(box, e.message); }

  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dept]');
    if (!b) return;
    const d = depts.find((x) => x._id === b.dataset.dept);
    const m = UI.modal({
      title: d.name, size: 'lg',
      body: `${UI.img(d.image, d.name, '', d.name).replace('<img ', '<img style="width:100%;aspect-ratio:16/7;object-fit:cover;border-radius:12px;margin-bottom:16px" ')}
        <p>${esc(d.description)}</p>
        <h4 style="margin-top:18px">Available doctors</h4>
        ${d.doctors.length ? d.doctors.map((x) => `<div class="list-row" style="padding:12px 0"><div class="flex items-center gap">${UI.avatar(x.name, x.photo)}<div><strong style="color:var(--navy)">${esc(x.name)}</strong><span class="small muted">${esc(x.specialization)}</span></div></div><a class="btn btn-primary btn-sm" style="margin-left:auto" href="${esc(Site.bookUrl(x._id))}">Book</a></div>`).join('') : '<p class="muted">No doctors are assigned to this department yet.</p>'}`,
      footer: `<button class="btn btn-outline" data-x>Close</button><a class="btn btn-navy" href="doctors.html?department=${d._id}">View all doctors</a>`
    });
    m.el.querySelector('[data-x]').onclick = m.close;
  });

  const sv = document.getElementById('services');
  try {
    const s = (await API.get('/services')).data;
    sv.innerHTML = s.length ? s.map((x) => `<div class="spec-card" style="cursor:default"><div class="ico"><i class="fa-solid ${esc(x.icon)}"></i></div><h4>${esc(x.name)}</h4><span>${esc(x.description)}</span></div>`).join('') : UI.empty('fa-notes-medical', 'No services listed', 'Services will appear here once added.');
  } catch (e) { UI.errorBox(sv, e.message); }
})();
