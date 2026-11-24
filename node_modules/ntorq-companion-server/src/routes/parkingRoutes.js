import express from 'express';
import {
  parkHere,
  getLatestParkingSpot,
  getParkingHistory,
  markSpotPickedUp,
  deleteParkingSpot,
} from '../controllers/parkingController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', parkHere);
router.get('/latest', getLatestParkingSpot);
router.get('/', getParkingHistory);
router.put('/:id/pickup', markSpotPickedUp);
router.delete('/:id', deleteParkingSpot);

export default router;
