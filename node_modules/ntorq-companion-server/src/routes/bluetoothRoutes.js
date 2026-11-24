import express from 'express';
import {
  getBluetoothProfiles,
  saveBluetoothProfile,
  deleteBluetoothProfile,
} from '../controllers/bluetoothController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getBluetoothProfiles);
router.post('/', saveBluetoothProfile);
router.delete('/:id', deleteBluetoothProfile);

export default router;
