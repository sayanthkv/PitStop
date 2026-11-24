import express from 'express';
import {
  getActiveAlerts,
  dismissAlert,
  snoozeAlert,
  subscribePush,
} from '../controllers/alertsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getActiveAlerts);
router.post('/push-subscribe', subscribePush);
router.post('/:key/dismiss', dismissAlert);
router.post('/:key/snooze', snoozeAlert);

export default router;
