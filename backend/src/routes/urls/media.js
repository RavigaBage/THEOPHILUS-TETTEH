const express = require('express');
const { restrictTo } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');
const {
  uploadFiles,
  getAllMedia,
  getMediaById,
  downloadMedia,
  updateMedia,
  deleteMedia,
  getMediaStats,
} = require('../../controllers/mediaController');

const router = express.Router();

router.use(restrictTo('admin'));

router.get('/stats', getMediaStats);
router.get('/', getAllMedia);
router.post('/upload', upload.array('files', 5), uploadFiles);
router.get('/:id', getMediaById);
router.get('/:id/download', downloadMedia);
router.patch('/:id', updateMedia);
router.delete('/:id', deleteMedia);

module.exports = router;