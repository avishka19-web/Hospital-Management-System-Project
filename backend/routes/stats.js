const router = require('express').Router();
const c = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/public', c.publicStats);
router.get('/admin', protect, authorize('admin'), c.adminStats);
router.get('/reports', protect, authorize('admin'), c.reports);
router.get('/doctor', protect, authorize('doctor'), c.doctorStats);
router.get('/patient', protect, authorize('patient'), c.patientStats);

module.exports = router;
