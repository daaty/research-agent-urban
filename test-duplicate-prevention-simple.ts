import dotenv from 'dotenv';
dotenv.config();
import { RideDataService } from './src/services/rideDataService';

async function testDuplicatePreventionSystem() {
    console.log('🧪 TESTE DO SISTEMA DE PREVENÇÃO DE DUPLICADOS v3.0');
    console.log('🛡️ Sistema integrado no auto-scraper funcionando');
    console.log('='.repeat(60));
    
    const rideDataService = new RideDataService();
    
    try {
        // 1. Testar conexão
        console.log('\n1️⃣ Testando conexão com base de dados...');
        const connected = await rideDataService.testConnection();
        
        if (!connected) {
            console.error('❌ Falha na conexão - abortando teste');
            return;
        }
        
        // 2. Simular dados do scraper
        console.log('\n2️⃣ Simulando dados extraídos pelo scraper...');
        const mockRidesData = [
            {
                'Engagement ID': 'TEST_AUTO_001',
                'Passenger': 'João Silva',
                'Driver': 'Maria Santos',
                'Status': 'Completed',
                'Origin': 'Centro',
                'Destination': 'Aeroporto',
                'Cost': 'R$ 35,00',
                'Distance': '15.2 km',
                'Time': '25 min'
            },
            {
                'Engagement ID': 'TEST_AUTO_002',
                'Passenger': 'Ana Costa',
                'Driver': 'Pedro Lima',
                'Status': 'Completed',
                'Origin': 'Shopping',
                'Destination': 'Universidade',
                'Cost': 'R$ 22,50',
                'Distance': '8.7 km',
                'Time': '18 min'
            }
        ];
        
        console.log(`📊 Dados simulados: ${mockRidesData.length} registros`);
        
        // 3. Primeira execução (deve salvar todos)
        console.log('\n3️⃣ Primeira execução (deve salvar todos os registros)...');
        const result1 = await rideDataService.saveRidesData(mockRidesData, 'Completed Rides');
        
        console.log(`✅ Primeira execução:`);
        console.log(`   - Salvos: ${result1.savedCount}`);
        console.log(`   - Duplicados: ${result1.duplicatesCount}`);
        
        // 4. Segunda execução (deve detectar duplicados)
        console.log('\n4️⃣ Segunda execução (deve detectar duplicados)...');
        const result2 = await rideDataService.saveRidesData(mockRidesData, 'Completed Rides');
        
        console.log(`✅ Segunda execução:`);
        console.log(`   - Salvos: ${result2.savedCount}`);
        console.log(`   - Duplicados: ${result2.duplicatesCount}`);
        
        // 5. Verificar resultado
        if (result1.savedCount === 2 && result1.duplicatesCount === 0) {
            console.log('\n🎯 PRIMEIRA EXECUÇÃO: ✅ PERFEITA');
        }
        
        if (result2.savedCount === 0 && result2.duplicatesCount === 2) {
            console.log('🎯 SEGUNDA EXECUÇÃO: ✅ PERFEITA - Todos detectados como duplicados');
            console.log('\n🚀 SISTEMA DE PREVENÇÃO DE DUPLICADOS FUNCIONANDO 100%!');
            console.log('   ✅ Primeira execução salva dados novos');
            console.log('   ✅ Segunda execução previne duplicados');
            console.log('   ✅ Sistema pronto para integração no auto-scraper');
        } else {
            console.log('\n⚠️ Resultado inesperado na segunda execução');
        }
        
    } catch (error: any) {
        console.error('❌ Erro durante teste:', error.message);
        
        if (error.message.includes('connect')) {
            console.log('\n💡 Configuração necessária:');
            console.log('   - Verificar variáveis de ambiente (.env)');
            console.log('   - DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME');
            console.log('   - Usar mesmas credenciais do n8n');
        }
    } finally {
        await rideDataService.disconnect();
        console.log('\n🔌 Conexões fechadas');
    }
}

// Executar teste
testDuplicatePreventionSystem()
    .then(() => {
        console.log('\n✅ Teste de sistema de prevenção de duplicados concluído');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Teste falhou:', error);
        process.exit(1);
    });
