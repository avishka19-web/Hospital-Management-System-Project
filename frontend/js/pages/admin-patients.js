(async () => { const s = await Shell.mount({ role: 'admin', active: 'patients', title: 'Patients' }); PatientsPage.render(s.main, { role: 'admin' }); })();
