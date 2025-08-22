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

// 🎯 Endpoint para dar foco à janela da esquerda (Rides)
router.post('/vnc/focus-left', async (req, res) => {
  try {
    console.log('🎯 Dando foco à janela esquerda...');
    await execAsync('bash /app/focus-left.sh');
    res.json({ 
      success: true, 
      message: 'Foco na janela esquerda (Rides) ativado' 
    });
  } catch (error) {
    console.error('❌ Erro ao dar foco:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao dar foco à janela esquerda' 
    });
  }
});

// 🎯 Endpoint para dar foco à janela da direita (Drivers/Híbrido)
router.post('/vnc/focus-right', async (req, res) => {
  try {
    console.log('🎯 Dando foco à janela direita...');
    await execAsync('bash /app/focus-right.sh');
    res.json({ 
      success: true, 
      message: 'Foco na janela direita (Drivers/Híbrido) ativado' 
    });
  } catch (error) {
    console.error('❌ Erro ao dar foco:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao dar foco à janela direita' 
    });
  }
});

export default router;
