import express from 'express';
import { downloadPdfReport, downloadCsvReport } from '../controllers/reportsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/pdf', downloadPdfReport);
router.get('/csv', downloadCsvReport);

export default router;
