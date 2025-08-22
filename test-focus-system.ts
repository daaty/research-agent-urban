import FocusManager from './src/utils/focusManager';
import WindowPositioner from './src/utils/windowPositioner';

/**
 * 🧪 Script de teste para o sistema de gerenciamento de foco
 * Este script testa as funcionalidades de foco para interação no VNC
 */
async function testFocusSystem() {
  console.log('🧪 ========================================');
  console.log('🧪 TESTE DO SISTEMA DE GERENCIAMENTO DE FOCO');
  console.log('🧪 ========================================\n');
  
  try {
    const focusManager = FocusManager.getInstance();
    const windowPositioner = WindowPositioner.getInstance();
    
    // 1. Listar todas as janelas disponíveis
    console.log('🔍 1. Listando todas as janelas disponíveis:');
    await focusManager.listAllWindows();
    console.log('');
    
    // 2. Verificar status das janelas do sistema
    console.log('📋 2. Verificando status das janelas do sistema:');
    const status = await focusManager.getWindowStatus();
    console.log(`   - Janela Esquerda (Rides): ${status.leftWindow ? '✅' : '❌'}`);
    console.log(`   - Janela Direita (Hybrid): ${status.rightWindow ? '✅' : '❌'}`);
    console.log('');
    
    // 3. Testar foco na janela esquerda (rides_scraper)
    console.log('🎯 3. Testando foco na janela esquerda (Rides Scraper):');
    const leftFocus = await focusManager.focusRidesScraper();
    console.log(`   Resultado: ${leftFocus ? '✅ Sucesso' : '❌ Falha'}`);
    
    // Aguardar um pouco para visualizar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Testar foco na janela direita (hybrid_scraper)
    console.log('🎯 4. Testando foco na janela direita (Hybrid Scraper):');
    const rightFocus = await focusManager.focusHybridScraper();
    console.log(`   Resultado: ${rightFocus ? '✅ Sucesso' : '❌ Falha'}`);
    
    // Aguardar um pouco para visualizar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Testar alternância de foco
    console.log('🔄 5. Testando alternância de foco entre janelas:');
    for (let i = 1; i <= 3; i++) {
      console.log(`   Alternância ${i}/3...`);
      await focusManager.switchFocus();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✅ ========================================');
    console.log('✅ TESTE DO SISTEMA DE FOCO CONCLUÍDO');
    console.log('✅ ========================================');
    
    // Instruções para o usuário
    console.log('\n📋 INSTRUÇÕES PARA USO NO VNC:');
    console.log('📋 - Acesse http://localhost:6091 no seu navegador');
    console.log('📋 - Use as funções de foco para alternar entre janelas');
    console.log('📋 - Agora você deve conseguir interagir com ambos os browsers');
    console.log('📋 - Para resolver CAPTCHAs, foque na janela desejada primeiro');
    
  } catch (error) {
    console.error('❌ Erro durante teste do sistema de foco:', error);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testFocusSystem().catch(console.error);
}

export { testFocusSystem };
