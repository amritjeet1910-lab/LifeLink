import express from 'express';
import { createRequest, getRequests, acceptRequest, getMyRequests, getRequestById, cancelRequest, completeRequest } from '../controllers/requestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, authorize('requester', 'admin'), getMyRequests);

router.route('/')
  .get(getRequests)
  .post(protect, authorize('requester', 'admin'), createRequest);

router.get('/:id', getRequestById);
router.put('/:id/accept', protect, authorize('donor', 'admin'), acceptRequest);
router.patch('/:id/cancel', protect, authorize('requester', 'admin'), cancelRequest);
router.patch('/:id/complete', protect, authorize('requester', 'donor', 'admin'), completeRequest);

export default router;
