import express from 'express';
import {
  addFuelEntry,
  getFuelEntries,
  deleteFuelEntry,
  getFuelEstimate,
  calculateTripCostEstimate,
} from '../controllers/fuelController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', addFuelEntry);
router.get('/', getFuelEntries);
router.get('/estimate', getFuelEstimate);
router.get('/trip-cost', calculateTripCostEstimate);
router.delete('/:id', deleteFuelEntry);

export default router;
