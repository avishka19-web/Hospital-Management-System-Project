const router = require('express').Router();
const c = require('../controllers/clinicalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.post('/', authorize('doctor'), c.createConsultation);
router.get('/', c.listPrescriptions);
router.get('/:id', c.getPrescription);

module.exports = router;
