import { Router } from 'express';
import rechargeController from './rechargeController';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const router = Router();

// Rotas para controle de recargas internas
router.use('/recharge', rechargeController);

// 🖱️ Endpoint para resetar cursor do VNC
router.post('/vnc/reset-cursor', async (req, res) => {
  try {
    console.log('🖱️ Resetando cursor do VNC...');
    await execAsync('bash /app/reset-vnc-cursor.sh');
    res.json({ 
      success: true, 
      message: 'Cursor do VNC resetado com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao resetar cursor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao resetar cursor do VNC' 
    });
  }
});

export default router;
