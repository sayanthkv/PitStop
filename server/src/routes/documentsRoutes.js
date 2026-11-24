import express from 'express';
import {
  addDocument,
  getDocuments,
  getDocumentById,
  renewDocument,
  deleteDocument,
} from '../controllers/documentsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', addDocument);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.post('/:id/renew', renewDocument);
router.delete('/:id', deleteDocument);

export default router;
