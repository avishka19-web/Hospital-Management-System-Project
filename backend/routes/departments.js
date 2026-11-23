const router = require('express').Router();
const c = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', c.list);
router.post('/', protect, authorize('admin'), upload.single('image'), c.create);
router.put('/:id', protect, authorize('admin'), upload.single('image'), c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
