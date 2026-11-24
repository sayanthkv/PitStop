import express from 'express';
import { getFuelPrices, addFuelPrice } from '../controllers/fuelController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getFuelPrices);
router.post('/', addFuelPrice);

export default router;
