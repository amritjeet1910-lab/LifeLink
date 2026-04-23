import express from 'express';
import { getHeatmapData, getShortageTrends } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/heatmap', protect, authorize('admin'), getHeatmapData);
router.get('/trends', getShortageTrends);

export default router;
