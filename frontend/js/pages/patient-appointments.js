(async () => { const s = await Shell.mount({ role: 'patient', active: 'appointments', title: 'My appointments' }); AppointmentsPage.render(s.main, { role: 'patient' }); })();
