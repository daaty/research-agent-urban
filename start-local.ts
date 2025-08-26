import { MonitoringService } from './src/services/monitoringService';
import { EnvironmentDetector } from './src/config/environmentDetector';
import { DatabaseManager } from './src/services/databaseManager';

// Carregar configuração local
try {
  require('dotenv').config();
} catch (error) {
  console.log('⚠️ dotenv não encontrado, usando variáveis de ambiente do sistema');
}

/**
 * Script para execução local do Research Agent Urban
 * Otimizado para desenvolvimento e debug
 */

async function startLocalDevelopment() {
  console.log('🖥️ RESEARCH AGENT URBAN - MODO LOCAL');
  console.log('=====================================');
  console.log('⚡ Modo desenvolvimento ativo');
  console.log('🔧 Browser visível para debug');
  console.log('');

  try {
    // 1. Detectar e configurar ambiente
    const envDetector = EnvironmentDetector.getInstance();
    console.log('🔍 Detectando ambiente...');
    envDetector.logEnvironmentInfo();
    
    const config = envDetector.getConfig();
    
    // 2. Forçar configurações locais se necessário
    if (!config.isLocal) {
      console.log('⚠️ Ambiente não detectado como LOCAL');
      console.log('💡 Aplicando configurações locais...');
      
      // Configurações forçadas para local
      process.env.HEADLESS_MODE = 'false';
      process.env.NODE_ENV = 'development';
      process.env.SCRAPE_INTERVAL = '10'; // 10 minutos para debug
    }

    // 3. Exibir configurações
    console.log('');
    console.log('🔧 CONFIGURAÇÕES ATIVAS:');
    console.log(`   📺 Browser: ${process.env.HEADLESS_MODE === 'true' ? 'Headless (invisível)' : 'Visível (debug)'}`);
    console.log(`   ⏰ Intervalo: ${process.env.SCRAPE_INTERVAL || 5} minutos`);
    console.log(`   🗄️ Database: ${process.env.DATABASE_URL ? '✅ Conectado' : '❌ Desconectado'}`);
    console.log(`   🌐 Webhook: ${process.env.ENABLE_WEBHOOK === 'true' ? '✅ Ativo' : '❌ Desativo'}`);
    console.log(`   🎯 Ambiente: ${process.env.NODE_ENV || 'development'}`);

    // 4. Testar conexão com banco
    console.log('');
    console.log('🗄️ Testando conexão com banco de dados...');
    try {
      const dbManager = DatabaseManager.getInstance();
      await dbManager.initialize();
      console.log('✅ Banco de dados conectado com sucesso!');
    } catch (error: any) {
      console.log('❌ Erro na conexão com banco:', error.message);
      console.log('💡 Verifique DATABASE_URL no arquivo .env');
      
      // Permitir continuar sem banco para debug
      const continueWithoutDB = process.env.ALLOW_NO_DATABASE === 'true';
      if (!continueWithoutDB) {
        throw error;
      }
      console.log('⚠️ Continuando sem banco (apenas para debug)...');
    }

    // 5. Inicializar serviço de monitoramento usando Singleton
    console.log('');
    console.log('🔄 Inicializando serviço de monitoramento...');
    const monitoring = MonitoringService.getInstance();
    
    // 6. Executar teste inicial
    console.log('');
    console.log('🧪 EXECUTANDO TESTE INICIAL...');
    console.log('📋 Coletando dados das 5 abas de corridas...');
    
    const startTime = Date.now();
    try {
      await monitoring.runOnce();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`✅ Teste inicial concluído em ${duration}s`);
      console.log(`📊 Dados processados com sucesso`);
      console.log(`🗄️ Verifique logs em data/ para detalhes`);
      
    } catch (testError: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`❌ Teste inicial falhou em ${duration}s`);
      console.log(`   Erro: ${testError.message}`);
      throw new Error(`Falha no teste inicial: ${testError.message}`);
    }

    // 7. Perguntar se deve iniciar monitoramento contínuo
    console.log('');
    console.log('🚀 OPÇÕES DE EXECUÇÃO:');
    console.log('   1. 🔄 Iniciar monitoramento contínuo');
    console.log('   2. ⏹️ Parar aqui (apenas teste)');
    console.log('');
    
    // Para ambiente não-interativo, iniciar automaticamente
    const shouldContinue = process.env.AUTO_START === 'true' || 
                          process.argv.includes('--continuous') ||
                          process.argv.includes('--start');
    
    if (shouldContinue) {
      console.log('🔄 Iniciando monitoramento contínuo...');
      await startContinuousMonitoring(monitoring);
    } else {
      console.log('✅ Teste local concluído com sucesso!');
      console.log('');
      console.log('💡 PRÓXIMOS PASSOS:');
      console.log('   • Para monitoramento contínuo: npm run start:local -- --continuous');
      console.log('   • Para apenas teste: npm run test:local');
      console.log('   • Para debug específico: verificar logs em data/');
      console.log('');
      console.log('🔧 COMANDOS ÚTEIS:');
      console.log('   • Verificar banco: npm run test:database');
      console.log('   • Verificar browser: npm run test:browser');
      console.log('   • Ver logs: tail -f data/monitoring.log');
    }

  } catch (error: any) {
    console.error('');
    console.error('❌ ERRO NA EXECUÇÃO LOCAL:');
    console.error('════════════════════════');
    console.error(`Tipo: ${error.name || 'Error'}`);
    console.error(`Mensagem: ${error.message}`);
    
    if (error.stack) {
      console.error('');
      console.error('🔍 Stack trace:');
      console.error(error.stack);
    }
    
    console.error('');
    console.error('🔧 SOLUÇÕES SUGERIDAS:');
    console.error('• Verificar arquivo .env existe e está configurado');
    console.error('• Verificar conexão com banco de dados');
    console.error('• Verificar se Playwright está instalado: npx playwright install chromium');
    console.error('• Verificar dependências: npm install');
    console.error('');
    
    process.exit(1);
  }
}

async function startContinuousMonitoring(monitoring: MonitoringService) {
  console.log('');
  console.log('🔄 MONITORAMENTO CONTÍNUO INICIADO');
  console.log('═════════════════════════════════');
  
  const interval = parseInt(process.env.SCRAPE_INTERVAL || '10');
  console.log(`⏰ Intervalo: ${interval} minutos`);
  console.log('⏹️ Para parar: Ctrl+C');
  console.log('');

  // URLs de acesso se disponível
  try {
    const envDetector = EnvironmentDetector.getInstance();
    const urls = envDetector.getAccessUrls();
    
    console.log('🌐 URLs DE ACESSO:');
    console.log(`   📊 API Local: ${urls.api}`);
    if (urls.vnc) console.log(`   🖥️ VNC: ${urls.vnc}`);
    if (urls.novnc) console.log(`   🌐 NoVNC: ${urls.novnc}`);
    console.log('');
  } catch (error) {
    // URLs não disponíveis, continuar normalmente
  }

  // Iniciar monitoramento
  monitoring.startMonitoring();
  
  // Logs de progresso
  let executionCount = 0;
  const logInterval = setInterval(() => {
    executionCount++;
    const nextRun = new Date(Date.now() + (interval * 60 * 1000));
    console.log(`📊 Execução #${executionCount} | Próxima: ${nextRun.toLocaleTimeString()}`);
  }, interval * 60 * 1000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log('🛑 Parando monitoramento local...');
    clearInterval(logInterval);
    monitoring.stopMonitoring();
    
    setTimeout(() => {
      console.log('✅ Monitoramento local finalizado');
      process.exit(0);
    }, 2000);
  });

  // Keep alive
  process.on('uncaughtException', (error: any) => {
    console.error('❌ Erro não capturado:', error);
    console.log('🔄 Tentando continuar...');
  });

  process.on('unhandledRejection', (reason: any, promise) => {
    console.error('❌ Promise rejeitada:', reason);
    console.log('🔄 Tentando continuar...');
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  startLocalDevelopment().catch((error: any) => {
    console.error('❌ Falha crítica na inicialização:', error);
    process.exit(1);
  });
}

export { startLocalDevelopment };
