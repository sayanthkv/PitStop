import express from 'express';
import { getFuelEntries } from '../controllers/fuelController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Mileage history and trends
router.get('/', getFuelEntries);

export default router;
