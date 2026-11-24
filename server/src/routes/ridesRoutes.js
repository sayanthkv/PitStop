import express from 'express';
import {
  saveRide,
  getRides,
  getRideById,
  deleteRide,
  getRidesSummary,
  syncRideOdometer,
  eraseAllLocationData,
} from '../controllers/ridesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', saveRide);
router.get('/', getRides);
router.get('/summary', getRidesSummary);
router.get('/:id', getRideById);
router.post('/:id/sync-odometer', syncRideOdometer);
router.delete('/:id', deleteRide);
router.delete('/', eraseAllLocationData);

export default router;
