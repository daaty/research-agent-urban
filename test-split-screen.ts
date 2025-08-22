/**
 * 🧪 Teste do Sistema de Split-Screen
 * Testa o posicionamento automático de janelas
 */

import { BrowserSessionManager } from './src/services/browserSessionManager';
import { WindowManager } from './src/services/windowManager';

async function testSplitScreen() {
  console.log('🧪 Iniciando teste de split-screen...');
  
  try {
    // Instalar ferramentas de janela
    const windowManager = WindowManager.getInstance();
    await windowManager.installWindowTools();
    
    // Inicializar duas instâncias de browser
    console.log('🚀 Inicializando navegadores...');
    
    const ridesBrowser = BrowserSessionManager.getInstance('rides_scraper');
    const driversBrowser = BrowserSessionManager.getInstance('drivers_scraper');
    
    // Inicializar os navegadores
    await ridesBrowser.initializeBrowser();
    await driversBrowser.initializeBrowser();
    
    console.log('⏳ Aguardando janelas abrirem...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Mostrar informações das janelas
    await windowManager.getWindowInfo();
    
    // Arranjar janelas automaticamente
    console.log('🖥️ Arranjando janelas para split-screen...');
    await windowManager.arrangeWindowsForSplitScreen();
    
    // Navegar para páginas de teste
    const ridesPage = await ridesBrowser.getPage();
    const driversPage = await driversBrowser.getPage();
    
    if (ridesPage && driversPage) {
      console.log('🌐 Navegando para páginas de teste...');
      await ridesPage.goto('https://rides.ec2dashboard.com/#/page/login');
      await driversPage.goto('https://rides.ec2dashboard.com/#/page/login');
    }
    
    console.log('✅ Teste concluído! Verifique o VNC em http://localhost:6091');
    console.log('📋 Deve haver 2 navegadores lado a lado:');
    console.log('   - Esquerda: rides_scraper');
    console.log('   - Direita: drivers_scraper');
    
    // Manter rodando para visualizar
    console.log('⏳ Mantendo teste ativo por 60 segundos...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testSplitScreen().catch(console.error);
}

export { testSplitScreen };
