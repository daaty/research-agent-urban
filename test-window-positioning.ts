#!/usr/bin/env node

/**
 * 🧪 TESTE DO POSICIONADOR DE JANELAS
 * 
 * Este script testa o sistema de posicionamento automático
 * para organizar navegadores em split-screen no VNC
 */

import WindowPositioner from './src/utils/windowPositioner';

async function testWindowPositioning() {
  console.log('🧪 INICIANDO TESTE DE POSICIONAMENTO DE JANELAS');
  console.log('=' .repeat(60));

  const positioner = WindowPositioner.getInstance();

  try {
    // 1. Listar todas as janelas
    console.log('🔍 1. Listando todas as janelas...');
    await positioner.listAllWindows();

    // 2. Organizar automaticamente
    console.log('\n🎯 2. Organizando janelas em split-screen...');
    await positioner.arrangeAllWindows();

    console.log('\n✅ Teste concluído!');
    console.log('📺 Verifique o VNC em http://localhost:6080');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testWindowPositioning()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

export default testWindowPositioning;
