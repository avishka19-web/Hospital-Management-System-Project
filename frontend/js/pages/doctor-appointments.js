(async () => { const s = await Shell.mount({ role: 'doctor', active: 'appointments', title: 'Appointments' }); AppointmentsPage.render(s.main, { role: 'doctor' }); })();
