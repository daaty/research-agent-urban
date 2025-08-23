/**
 * Script para testar login manual sem o loop automático
 * Execute este script para fazer login uma vez e depois usar o sistema híbrido
 */
import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';

async function testManualLogin() {
  console.log('🧪 Testando login manual...');
  
  const scraper = new RidesDashboardHybridScraper('test_login');
  
  try {
    // Inicializar apenas uma vez
    await scraper.initialize();
    
    console.log('✅ Login concluído! Mantenha o navegador aberto.');
    console.log('🎯 Status:', scraper.getStatus());
    
    // Aguardar para manter o browser aberto
    console.log('🔄 Aguardando... (mantenha o navegador aberto para testes)');
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    console.log('🔄 Teste finalizado');
  }
}

testManualLogin().catch(console.error);
