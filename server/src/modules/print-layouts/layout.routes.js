import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import * as layoutController from './layout.controller.js';

const router = Router();

// All print layout routes require authentication
router.use(authenticate);

router.post('/cnic', layoutController.generateCnic);
router.post('/passport', layoutController.generatePassport);
router.post('/portrait', layoutController.generatePortrait);
router.post('/custom', layoutController.generateCustom);
router.post('/edit-image', layoutController.editImage);
router.post('/auto-crop', layoutController.autoCropCard);
router.post('/detect-angle', layoutController.detectAngle);
router.post('/change-background', layoutController.changeBackground);

export default router;
