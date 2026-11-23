(async () => { const s = await Shell.mount({ role: 'admin', active: 'appointments', title: 'Appointments' }); AppointmentsPage.render(s.main, { role: 'admin' }); })();
