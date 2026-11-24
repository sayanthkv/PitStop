import express from 'express';
import {
  addServiceEntry,
  getServiceEntries,
  deleteServiceEntry,
  getServiceDue,
  getServiceIntervals,
  updateServiceIntervals,
  getTyreBatteryRecords,
  addTyreBatteryRecord,
} from '../controllers/serviceController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', addServiceEntry);
router.get('/', getServiceEntries);
router.get('/due', getServiceDue);
router.get('/intervals', getServiceIntervals);
router.put('/intervals', updateServiceIntervals);
router.get('/tyre-battery', getTyreBatteryRecords);
router.post('/tyre-battery', addTyreBatteryRecord);
router.delete('/:id', deleteServiceEntry);

export default router;
