const express = require('express');
const { restrictTo } = require('../../middleware/auth');
const {
  addCamera,
  getAllCameras,
  getCameraById,
  updateCamera,
  toggleCameraStatus,
  deleteCamera,
  getCamerasGrouped,
} = require('../../controllers/cameraController');

const router = express.Router();

router.use(restrictTo('admin'));

router.get('/grouped', getCamerasGrouped);
router.get('/', getAllCameras);
router.post('/', addCamera);
router.get('/:id', getCameraById);
router.put('/:id', updateCamera);
router.patch('/:id/toggle', toggleCameraStatus);
router.delete('/:id', deleteCamera);

module.exports = router;