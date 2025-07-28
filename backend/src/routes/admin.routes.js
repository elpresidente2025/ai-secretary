import express from 'express';
const router = express.Router();
import { getAllUsers } from '../controllers/admin.controller.js';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';

router.get('/users', verifyToken, requireAdmin, getAllUsers);

export default router;
