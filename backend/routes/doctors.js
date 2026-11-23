const router = require('express').Router();
const c = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', protect, authorize('admin'), upload.single('photo'), c.create);
router.put('/:id', protect, authorize('admin', 'doctor'), upload.single('photo'), c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
