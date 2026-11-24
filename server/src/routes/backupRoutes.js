import express from 'express';
import { exportAllData, importData } from '../controllers/backupController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/export', exportAllData);
router.post('/import', importData);

export default router;
