import { Router } from 'express';
import rechargeController from './rechargeController';

const router = Router();

// Rotas para controle de recargas internas
router.use('/recharge', rechargeController);

export default router;
