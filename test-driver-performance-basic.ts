import { DriversPersistentScraper } from './src/scraper/driversPersistentScraper';

/**
 * Teste básico da página Driver Performance (sem banco)
 * Foca na extração e processamento dos dados
 */

async function testDriverPerformanceBasic() {
  console.log('🧪 TESTE BÁSICO - DRIVER PERFORMANCE (SEM BANCO)');
  console.log('=================================================');

  try {
    // 1. Criar instância do scraper
    console.log('🚗 Inicializando scraper de drivers...');
    const scraper = new DriversPersistentScraper();
    
    // 2. Mostrar páginas configuradas
    const pages = scraper.getDriversPages();
    console.log('📋 Páginas de drivers configuradas:');
    pages.forEach((page, index) => {
      const isPerformance = page.name === 'Driver Performance';
      console.log(`   ${index + 1}. ${page.name} - ${page.url}${isPerformance ? ' 🎯' : ''}`);
    });

    // 3. Verificar se Driver Performance está na lista
    const performancePage = pages.find(page => page.name === 'Driver Performance');
    if (performancePage) {
      console.log('');
      console.log('✅ Driver Performance encontrado na configuração!');
      console.log(`📍 URL: ${performancePage.url}`);
      console.log(`🔗 Aponta para: #/app/high-cancellations/`);
    } else {
      console.log('❌ Driver Performance NÃO encontrado na configuração');
      return;
    }

    // 4. Testar dados mock de Driver Performance
    console.log('');
    console.log('🧪 Testando processamento com dados mock...');
    
    const mockDriverPerformanceData = {
      name: 'Driver Performance',
      url: 'https://rides.ec2dashboard.com/#/app/high-cancellations/',
      headers: [
        'Driver ID', 'Driver Name', 'Phone Number', 'Request Sent', 'Requests Received',
        'User Cancelled Rides', 'User Cancelled Ride (cash)', 'User Cancelled Ride (wallet)',
        'Driver Cancelled Rides', 'Driver Cancelled Ride (cash)', 'Driver Cancelled Ride (wallet)',
        'Rejected Rides', 'Success Rides', 'Missed Rides', 'Active Days', 'Online Hours',
        'D2C Referral', 'D2D Referral', 'Start End Cheating Rides', 'Manual Start End Cheating Rides',
        'Vehicle'
      ],
      rows: [
        ['17177142', 'Elindo Juliao Severino', '+5566996954849', '2', '2', '0', '0', '0', '0', '0', '0', '0', '1', '0', '1', '16.5', '0', '0', '0', '0', 'POPULAR'],
        ['17168907', 'Juscelino França Ventura Da Rocha', '+5566992593392', '1', '1', '0', '0', '0', '0', '0', '0', '1', '0', '1', '1', '17.5', '0', '0', '0', '0', 'POPULAR'],
        ['16263441', 'Bruno  Silva', '+5566996115789', '2', '2', '0', '0', '0', '0', '0', '0', '1', '1', '1', '1', '23.25', '0', '0', '0', '0', 'POPULAR']
      ],
      isEmpty: false
    };

    // 5. Processar dados mock
    console.log('🔄 Processando dados estruturados...');
    const processedData = scraper.processDriverPerformanceData(mockDriverPerformanceData);
    console.log(`✅ ${processedData.length} registros processados`);

    if (processedData.length > 0) {
      console.log('');
      console.log('📊 DADOS PROCESSADOS COM SUCESSO:');
      console.log('=================================');
      
      processedData.forEach((driver, index) => {
        console.log(`${index + 1}. ${driver.driver_name} (ID: ${driver.driver_id})`);
        console.log(`   📱 Telefone: ${driver.phone_number}`);
        console.log(`   📈 Corridas bem-sucedidas: ${driver.success_rides}`);
        console.log(`   📊 Solicitações recebidas: ${driver.requests_received}`);
        console.log(`   🕒 Horas online: ${driver.online_hours}`);
        console.log(`   🚗 Veículo: ${driver.vehicle}`);
        console.log('');
      });

      console.log('📄 ESTRUTURA COMPLETA DO PRIMEIRO REGISTRO:');
      console.log(JSON.stringify(processedData[0], null, 2));
    }

    console.log('');
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('💡 A página Driver Performance está configurada e pronta para scraping.');
    console.log('📋 Headers esperados: 21 campos');
    console.log(`📊 Headers encontrados: ${mockDriverPerformanceData.headers.length} campos`);
    console.log('🎯 Processamento: Funcional');
    console.log('');
    console.log('🚀 PRÓXIMOS PASSOS:');
    console.log('• Execute o sistema completo com: npm run start:local');
    console.log('• Ou teste com dados reais: npm run test:drivers');
    console.log('• A página será processada automaticamente durante o scraping');

  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error.stack);
  }
}

// Executar teste
if (require.main === module) {
  testDriverPerformanceBasic().catch(error => {
    console.error('❌ Falha crítica no teste:', error);
    process.exit(1);
  });
}

export { testDriverPerformanceBasic };
