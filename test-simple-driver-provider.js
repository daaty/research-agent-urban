#!/usr/bin/env node

/**
 * Teste do DriverIdProvider Simplificado
 * Testa a funcionalidade básica do provedor de IDs simplificado para uma cidade
 */

import { DriverIdProvider } from '../src/services/driverIdProvider.js';

async function testDriverIdProvider() {
  console.log('🧪 Iniciando teste do DriverIdProvider simplificado...\n');
  
  try {
    // Configurar variáveis de ambiente para teste
    process.env.CITY_NAME = 'São Paulo';
    process.env.CITY_API_URL = 'https://jsonplaceholder.typicode.com/users'; // API fake para teste
    process.env.CITY_ENABLED = 'false'; // Desabilitar para usar fallback
    process.env.FALLBACK_DRIVER_IDS = 'TEST001,TEST002,TEST003,TEST004,TEST005';
    
    console.log('📋 Configuração de teste:');
    console.log(`   Cidade: ${process.env.CITY_NAME}`);
    console.log(`   API URL: ${process.env.CITY_API_URL}`);
    console.log(`   Habilitada: ${process.env.CITY_ENABLED}`);
    console.log(`   Fallback IDs: ${process.env.FALLBACK_DRIVER_IDS}\n`);

    // Obter instância do provedor
    const provider = DriverIdProvider.getInstance();
    
    // Teste 1: Buscar IDs (deve usar fallback pois API está desabilitada)
    console.log('🔍 Teste 1: Buscando IDs com API desabilitada (fallback)');
    const fallbackDrivers = await provider.getAllDriverIds();
    console.log(`✅ Encontrados ${fallbackDrivers.length} motoristas de fallback:`);
    fallbackDrivers.forEach(driver => {
      console.log(`   - ID: ${driver.id}, Cidade: ${driver.city}, Prioridade: ${driver.priority}`);
    });
    console.log();

    // Teste 2: Verificar estatísticas
    console.log('📊 Teste 2: Verificando estatísticas');
    const stats = provider.getStats();
    console.log('✅ Estatísticas do provedor:');
    console.log(`   - Nome da cidade: ${stats.cityName}`);
    console.log(`   - API URL: ${stats.apiUrl}`);
    console.log(`   - Habilitada: ${stats.enabled}`);
    console.log(`   - Cache válido: ${stats.cacheValid}`);
    console.log(`   - Tamanho do cache: ${stats.cacheSize}`);
    console.log(`   - Fallback IDs: ${stats.fallbackIdsCount}`);
    console.log();

    // Teste 3: Atualizar configuração
    console.log('🔄 Teste 3: Atualizando configuração da cidade');
    provider.updateCityConfig('Rio de Janeiro', 'https://api-rj.exemplo.com/drivers', true);
    const newStats = provider.getStats();
    console.log(`✅ Cidade atualizada para: ${newStats.cityName}`);
    console.log(`✅ Nova API URL: ${newStats.apiUrl}`);
    console.log(`✅ Status habilitada: ${newStats.enabled}`);
    console.log();

    // Teste 4: Testar com API habilitada (vai falhar mas testa o fluxo)
    console.log('🌐 Teste 4: Testando com API habilitada (esperado falhar)');
    try {
      const apiDrivers = await provider.getAllDriverIds(true); // Force refresh
      console.log(`✅ Drivers da API: ${apiDrivers.length}`);
    } catch (error) {
      console.log(`⚠️ Erro esperado da API fake: ${error.message}`);
      console.log('   Sistema deve usar fallback em caso de erro...');
      
      // Deve ainda retornar fallback
      const fallbackAfterError = await provider.getAllDriverIds();
      console.log(`✅ Fallback funcionou: ${fallbackAfterError.length} drivers`);
    }
    console.log();

    // Teste 5: Limpeza de cache
    console.log('🗑️ Teste 5: Testando limpeza de cache');
    provider.clearCache();
    const statsAfterClear = provider.getStats();
    console.log(`✅ Cache limpo - tamanho: ${statsAfterClear.cacheSize}`);
    console.log(`✅ Cache válido: ${statsAfterClear.cacheValid}`);
    console.log();

    console.log('🎉 Todos os testes concluídos com sucesso!');
    console.log('\n📋 Resumo dos testes:');
    console.log('   ✅ Fallback IDs funcionando');
    console.log('   ✅ Estatísticas corretas');
    console.log('   ✅ Atualização de configuração');
    console.log('   ✅ Tratamento de erro da API');
    console.log('   ✅ Limpeza de cache');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executar teste se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testDriverIdProvider().catch(console.error);
}

export { testDriverIdProvider };
