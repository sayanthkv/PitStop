import express from 'express';
import {
  getAuthStatus,
  registerOwner,
  login,
  logout,
  getMe,
  changePassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/status', getAuthStatus);
router.post('/register', authLimiter, registerOwner);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

export default router;
