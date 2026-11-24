import express from 'express';
import {
  addOdometerReading,
  getOdometerReadings,
  correctOdometerReading,
  getOdometerStats,
} from '../controllers/odometerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', addOdometerReading);
router.get('/', getOdometerReadings);
router.get('/stats', getOdometerStats);
router.post('/:id/correct', correctOdometerReading);

export default router;
