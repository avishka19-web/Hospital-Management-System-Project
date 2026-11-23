const router = require('express').Router();
const c = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', authorize('admin', 'doctor'), c.list);
router.get('/:id', c.get);
router.put('/:id', authorize('admin', 'patient'), c.update);

module.exports = router;
