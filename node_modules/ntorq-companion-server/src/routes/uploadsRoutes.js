import express from 'express';
import { getUploadStatus, handleFileUpload } from '../controllers/uploadsController.js';
import { uploadSingle } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/status', getUploadStatus);
router.post('/', uploadSingle, handleFileUpload);

export default router;
