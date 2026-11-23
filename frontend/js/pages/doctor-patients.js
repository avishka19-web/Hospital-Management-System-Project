(async () => { const s = await Shell.mount({ role: 'doctor', active: 'patients', title: 'My patients' }); PatientsPage.render(s.main, { role: 'doctor' }); })();
