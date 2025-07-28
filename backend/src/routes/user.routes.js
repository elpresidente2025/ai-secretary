import express from 'express';
const router = express.Router();
import { updateProfile } from '../controllers/user.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

router.put('/profile', verifyToken, updateProfile);

export default router;
