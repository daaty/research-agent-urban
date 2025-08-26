import { MonitoringService } from './services/monitoringService';
import { DatabaseManager } from './services/databaseManager';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function startMonitoring() {
  console.log('🚀 INICIANDO MONITORING SERVICE PURO');
  console.log('📊 Sistema de monitoramento: Rides + Drivers integrado');
  console.log('🗄️ Base de dados: PostgreSQL');
  console.log('⚙️ Cache: DataCacheManager + DriverCacheManager');
  console.log('🔗 Webhook: N8N');
  
  try {
    // Verificar variáveis essenciais
    if (!process.env.N8N_WEBHOOK_URL) {
      console.log('⚠️ N8N_WEBHOOK_URL não configurado - webhooks desabilitados');
    }
    
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_HOST) {
      console.error('❌ Configuração de banco de dados não encontrada');
      console.log('💡 Configure DATABASE_URL ou POSTGRES_HOST/POSTGRES_DB/etc.');
      process.exit(1);
    }
    
    // Inicializar MonitoringService usando Singleton
    console.log('📡 Inicializando MonitoringService...');
    const monitoring = MonitoringService.getInstance();
    
    // Aguardar inicialização do banco
    console.log('⏳ Aguardando inicialização do banco de dados...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // ⚠️ CORREÇÃO: NÃO executar runOnce antes do startMonitoring
    // O startMonitoring já faz a primeira execução automaticamente
    console.log('🔄 Iniciando monitoramento automático (primeira execução será feita automaticamente)...');
    monitoring.startMonitoring();
    
    console.log('✅ MonitoringService iniciado com sucesso!');
    console.log('📊 Monitorando: Rides (5 páginas) + Drivers (5 páginas)');
    console.log('⏰ Frequência: Configurável via SCRAPE_INTERVAL (padrão: 5 min)');
    console.log('🌐 Webhook N8N: Apenas quando há mudanças');
    
  } catch (error) {
    console.error('❌ Erro ao iniciar MonitoringService:', error);
    process.exit(1);
  }
}

// Handlers para encerramento limpo
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando MonitoringService...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando MonitoringService...');
  process.exit(0);
});

startMonitoring();
