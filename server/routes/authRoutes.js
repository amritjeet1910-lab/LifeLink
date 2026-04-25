import express from 'express';
import { register, login, getMe, googleAuth, googleRedirectCallback, googleConfigCheck, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/google/callback', googleRedirectCallback);
router.get('/google/config-check', googleConfigCheck);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

export default router;
