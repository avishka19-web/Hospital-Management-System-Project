// Doctor card + profile modal shared by Home, About and Doctors pages.
(function () {
  const { esc } = UI;
  Site.doctorCard = (d) => `
    <article class="doc-card">
      ${UI.img(d.photo, d.name, 'photo', 'initials:' + UI.initials(d.name))}
      <div class="body">
        <span class="chip" style="align-self:flex-start">${esc(d.department ? d.department.name : 'General')}</span>
        <h4>${esc(d.name)}</h4>
        <div class="spec">${esc(d.specialization)}</div>
        <div class="doc-meta">
          <div><i class="fa-solid fa-award"></i>${d.experience} years of experience</div>
          <div><i class="fa-regular fa-calendar"></i>${esc(UI.daysText(d.availability.days))}</div>
          <div><i class="fa-regular fa-clock"></i>${esc(UI.fmtTime(d.availability.startTime))} - ${esc(UI.fmtTime(d.availability.endTime))}</div>
        </div>
        <div class="btns"><button class="btn btn-outline btn-sm" data-view="${d._id}">View profile</button><a class="btn btn-primary btn-sm" href="${esc(Site.bookUrl(d._id))}">Book appointment</a></div>
      </div>
    </article>`;

  Site.doctorModal = (d) => UI.modal({
    title: 'Doctor profile', size: 'lg',
    body: `<div style="display:grid;grid-template-columns:200px 1fr;gap:24px" class="doc-modal">
      ${UI.img(d.photo, d.name, '', 'initials:' + UI.initials(d.name)).replace('<img ', '<img style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:14px" ')}
      <div><h3 style="font-size:22px;margin-bottom:2px">${esc(d.name)}</h3><div style="color:var(--teal-dark);font-weight:600;margin-bottom:12px">${esc(d.specialization)}</div>
        <p class="muted">${esc(d.bio || 'Experienced specialist dedicated to patient-centred care.')}</p>
        <dl class="dl">
          <dt>Department</dt><dd>${esc(d.department ? d.department.name : '-')}</dd>
          <dt>Qualification</dt><dd>${esc(d.qualification || '-')}</dd>
          <dt>Experience</dt><dd>${d.experience} years</dd>
          <dt>Availability</dt><dd>${esc(UI.availText(d.availability))}</dd>
          <dt>Consultation fee</dt><dd>${UI.money(d.fee)}</dd>
          <dt>Patient rating</dt><dd><span class="stars">★★★★★</span> ${Number(d.rating).toFixed(1)}</dd>
        </dl></div></div>
      <style>@media(max-width:640px){.doc-modal{grid-template-columns:1fr!important}}</style>`,
    footer: `<button class="btn btn-outline" data-close2>Close</button><a class="btn btn-primary" href="${esc(Site.bookUrl(d._id))}"><i class="fa-regular fa-calendar-plus"></i> Book appointment</a>`
  });

  // wires [data-view] buttons inside container to open the modal for matching doctors
  Site.bindDoctorCards = (container, list) => {
    container.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => {
      const d = list.find((x) => x._id === b.dataset.view);
      if (!d) return;
      const m = Site.doctorModal(d);
      m.el.querySelector('[data-close2]').onclick = m.close;
    }));
  };
})();
