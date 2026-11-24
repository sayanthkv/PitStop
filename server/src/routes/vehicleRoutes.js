import express from 'express';
import {
  setupVehicle,
  getPrimaryVehicle,
  updateVehicle,
  manualFuelCorrection,
} from '../controllers/vehicleController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/setup', setupVehicle);
router.get('/', getPrimaryVehicle);
router.put('/', updateVehicle);
router.post('/manual-fuel-correction', manualFuelCorrection);

export default router;
