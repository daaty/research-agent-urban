/**
 * 🧪 SCRIPT DE TESTE COMPLETO - LÓGICA DE INSERÇÃO DE DADOS NO MONITORAMENTO
 * 
 * Este script simula toda a lógica do MonitoringService para testar:
 * 1. ✅ Conexão com banco de dados
 * 2. ✅ Inserção de dados de RIDES (tabela rides_data)
 * 3. ✅ Inserção de dados de DRIVERS (tabela drivers_data)
 * 4. ✅ Sistema de cache e detecção de mudanças
 * 5. ✅ Processamento de sessões de scraping
 * 6. ✅ Sistema anti-duplicação (UPSERT)
 * 7. ✅ Validação de integridade dos dados
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseManager } from './src/services/databaseManager';
import { DriversDataTransformer } from './src/services/driversDataTransformer';
import { DataCacheManager } from './src/services/dataCacheManager';
import { DataTransformer } from './src/services/dataTransformer';
import { createHash } from 'crypto';

// 🎯 INTERFACES PARA SIMULAÇÃO
interface SimulatedRideData {
  table_name: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
  name: string;
  url: string; // ⭐ ADICIONADO para compatibilidade com RideTableData
}

interface SimulatedDriverData {
  name: string;
  url: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
}

interface SimulatedScrapingResult {
  success: boolean;
  data: SimulatedRideData[];
  sessionInfo: any;
  message: string;
}

interface SimulatedDriversResult {
  success: boolean;
  data: SimulatedDriverData[];
  sessionInfo: any;
  message: string;
  hasChanges: boolean;
}

class MonitoringLogicTester {
  private databaseManager: DatabaseManager;
  private driversTransformer: DriversDataTransformer;
  private cacheManager: DataCacheManager;
  private dataTransformer: DataTransformer;
  private testResults: Array<{test: string, success: boolean, message: string}> = [];

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.driversTransformer = DriversDataTransformer.getInstance();
    this.cacheManager = DataCacheManager.getInstance();
    this.dataTransformer = DataTransformer.getInstance();
  }

  // 🧪 MÉTODO PRINCIPAL DE TESTE
  async runCompleteTest(): Promise<void> {
    console.log('🧪 ====== TESTE COMPLETO DA LÓGICA DE MONITORAMENTO ======');
    console.log('📅 Data/Hora:', new Date().toLocaleString());
    console.log();

    try {
      // 1. TESTE DE CONEXÃO COM BANCO
      await this.testDatabaseConnection();
      
      // 2. TESTE DE INSERÇÃO DE DADOS DE RIDES
      await this.testRidesDataInsertion();
      
      // 3. TESTE DE INSERÇÃO DE DADOS DE DRIVERS
      await this.testDriversDataInsertion();
      
      // 4. TESTE DO SISTEMA DE CACHE
      await this.testCacheSystem();
      
      // 5. TESTE DE ANTI-DUPLICAÇÃO
      await this.testAntiDuplicationSystem();
      
      // 6. TESTE DE INTEGRIDADE DOS DADOS
      await this.testDataIntegrity();
      
      // 7. SIMULAÇÃO COMPLETA DO FLUXO DO MONITORING SERVICE
      await this.simulateMonitoringServiceFlow();
      
      // RELATÓRIO FINAL
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Erro durante teste:', error);
      this.addTestResult('ERRO GERAL', false, `Erro crítico: ${error instanceof Error ? error.message : error}`);
    }
  }

  // 🔌 TESTE 1: Conexão com Banco de Dados
  private async testDatabaseConnection(): Promise<void> {
    console.log('1️⃣ TESTANDO CONEXÃO COM BANCO DE DADOS...');
    
    try {
      // Verificar se já está conectado
      let isConnected = this.databaseManager.isConnectedToDatabase();
      console.log(`   🔗 Status inicial da conexão: ${isConnected}`);
      
      if (!isConnected) {
        console.log('   🔄 Tentando conectar...');
        await this.databaseManager.initialize();
        isConnected = this.databaseManager.isConnectedToDatabase();
      }
      
      if (!isConnected) {
        throw new Error('Falha ao conectar com banco de dados');
      }
      
      // Testar uma query simples
      const stats = await this.databaseManager.getDatabaseStats();
      console.log(`   📊 Estatísticas do banco:`, {
        totalRecords: stats.totalRecords,
        totalDrivers: stats.totalDrivers,
        totalSessions: stats.totalSessions
      });
      
      this.addTestResult('Conexão com Banco', true, 'Conexão estabelecida com sucesso');
      console.log('   ✅ Conexão com banco funcionando!\n');
      
    } catch (error) {
      this.addTestResult('Conexão com Banco', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha na conexão com banco!\n');
      throw error;
    }
  }

  // 🚗 TESTE 2: Inserção de Dados de Rides
  private async testRidesDataInsertion(): Promise<void> {
    console.log('2️⃣ TESTANDO INSERÇÃO DE DADOS DE RIDES...');
    
    try {
      // Simular dados de rides como vindos do scraper
      const simulatedRidesData = this.generateSimulatedRidesData();
      
      console.log(`   📊 Dados simulados: ${simulatedRidesData.length} tabelas`);
      simulatedRidesData.forEach(table => {
        console.log(`     📋 ${table.name}: ${table.rows.length} registros`);
      });
      
      // Processar dados como o MonitoringService faria
      const rawData = this.convertRidesToRawData(simulatedRidesData);
      console.log(`   🔄 Convertidos para ${rawData.length} registros brutos`);
      
      // Transformar para formato do banco
      const rideRecords = rawData.map(ride => ({
        table_name: ride.table_name || 'unknown',
        data_hash: this.generateDataHash(ride),
        ride_data: ride,
        session_info: { test: true, timestamp: new Date().toISOString() },
        source: 'monitoring-service-test'
      }));
      
      console.log(`   💾 Tentando inserir ${rideRecords.length} registros de rides...`);
      
      // Inserir no banco
      await this.databaseManager.insertRideData(rideRecords);
      
      this.addTestResult('Inserção Rides', true, `${rideRecords.length} registros inseridos com sucesso`);
      console.log('   ✅ Dados de rides inseridos com sucesso!\n');
      
    } catch (error) {
      this.addTestResult('Inserção Rides', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha na inserção de rides!\n');
      console.error('     📋 Detalhes:', error);
    }
  }

  // 👥 TESTE 3: Inserção de Dados de Drivers
  private async testDriversDataInsertion(): Promise<void> {
    console.log('3️⃣ TESTANDO INSERÇÃO DE DADOS DE DRIVERS...');
    
    try {
      // Simular dados de drivers como vindos do scraper
      const simulatedDriversData = this.generateSimulatedDriversData();
      
      console.log(`   📊 Dados simulados: ${simulatedDriversData.length} páginas`);
      simulatedDriversData.forEach(page => {
        console.log(`     👥 ${page.name}: ${page.rows.length} registros`);
      });
      
      // Usar o DriversDataTransformer como o MonitoringService faria
      const sessionInfo = { 
        test: true, 
        timestamp: new Date().toISOString(),
        browserSessionId: 'test-session-123'
      };
      
      console.log(`   🔄 Processando via DriversDataTransformer...`);
      const transformedData = await this.driversTransformer.transformAndSave(
        simulatedDriversData,
        sessionInfo,
        'drivers-monitoring-service-test',
        true
      );
      
      this.addTestResult('Inserção Drivers', true, `${transformedData.totalRecords} registros processados, ${transformedData.newRecords} novos`);
      console.log(`   ✅ Dados de drivers processados: ${transformedData.totalRecords} registros!\n`);
      
    } catch (error) {
      this.addTestResult('Inserção Drivers', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha na inserção de drivers!\n');
      console.error('     📋 Detalhes:', error);
    }
  }

  // 💾 TESTE 4: Sistema de Cache
  private async testCacheSystem(): Promise<void> {
    console.log('4️⃣ TESTANDO SISTEMA DE CACHE...');
    
    try {
      // Simular dados para teste de cache
      const testData = this.generateSimulatedRidesData();
      
      console.log('   🔄 Testando comparação de cache...');
      const cacheResult = this.cacheManager.compareAndGetDifferences(testData);
      
      console.log(`   📊 Resultado do cache:`, {
        hasChanges: cacheResult.hasChanges,
        totalDifferences: cacheResult.differences.length,
        totalNewRecords: cacheResult.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0)
      });
      
      this.addTestResult('Sistema de Cache', true, `Cache funcionando - ${cacheResult.differences.length} diferenças detectadas`);
      console.log('   ✅ Sistema de cache funcionando!\n');
      
    } catch (error) {
      this.addTestResult('Sistema de Cache', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha no sistema de cache!\n');
      console.error('     📋 Detalhes:', error);
    }
  }

  // 🛡️ TESTE 5: Sistema Anti-Duplicação
  private async testAntiDuplicationSystem(): Promise<void> {
    console.log('5️⃣ TESTANDO SISTEMA ANTI-DUPLICAÇÃO...');
    
    try {
      // Inserir os mesmos dados duas vezes para testar UPSERT
      const duplicateData = [{
        table_name: 'test_duplicate',
        data_hash: 'test_hash_duplicate_123',
        ride_data: { test: 'duplicate_test', id: 'dup_001' },
        session_info: { test: true },
        source: 'anti-duplication-test'
      }];
      
      console.log('   🔄 Inserindo dados pela primeira vez...');
      await this.databaseManager.insertRideData(duplicateData);
      
      console.log('   🔄 Inserindo os mesmos dados novamente (teste UPSERT)...');
      await this.databaseManager.insertRideData(duplicateData);
      
      // Verificar se não houve duplicação
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 1000 * 60 * 60); // 1 hora atrás
      const records = await this.databaseManager.getRidesByDateRange(startDate, endDate, 'test_duplicate');
      
      const duplicateRecords = records.filter(r => r.data_hash === 'test_hash_duplicate_123');
      
      if (duplicateRecords.length === 1) {
        this.addTestResult('Anti-Duplicação', true, 'UPSERT funcionando - sem duplicatas');
        console.log('   ✅ Sistema anti-duplicação funcionando!\n');
      } else {
        throw new Error(`Duplicação detectada: ${duplicateRecords.length} registros encontrados`);
      }
      
    } catch (error) {
      this.addTestResult('Anti-Duplicação', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha no sistema anti-duplicação!\n');
      console.error('     📋 Detalhes:', error);
    }
  }

  // 🔍 TESTE 6: Integridade dos Dados
  private async testDataIntegrity(): Promise<void> {
    console.log('6️⃣ TESTANDO INTEGRIDADE DOS DADOS...');
    
    try {
      // Buscar dados inseridos nos testes anteriores
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 1000 * 60 * 60); // 1 hora atrás
      
      const ridesData = await this.databaseManager.getRidesByDateRange(startDate, endDate);
      console.log(`   📊 Registros de rides encontrados: ${ridesData.length}`);
      
      // Verificar estrutura dos dados de rides
      if (ridesData.length > 0) {
        const sampleRide = ridesData[0];
        const hasRequiredFields = sampleRide.table_name && sampleRide.data_hash && sampleRide.ride_data;
        
        if (!hasRequiredFields) {
          throw new Error('Campos obrigatórios ausentes nos dados de rides');
        }
        
        console.log('   ✅ Estrutura de dados de rides válida');
      }
      
      // Verificar estatísticas gerais
      const stats = await this.databaseManager.getDatabaseStats();
      
      console.log(`   📊 Estatísticas finais:`, {
        totalRecords: stats.totalRecords,
        totalDrivers: stats.totalDrivers,
        totalSessions: stats.totalSessions,
        isConnected: stats.isConnected
      });
      
      this.addTestResult('Integridade dos Dados', true, `Rides: ${ridesData.length}, Drivers: ${stats.totalDrivers}, Sessões: ${stats.totalSessions}`);
      console.log('   ✅ Integridade dos dados verificada!\n');
      
    } catch (error) {
      this.addTestResult('Integridade dos Dados', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha na verificação de integridade!\n');
      console.error('     📋 Detalhes:', error);
    }
  }

  // 🔄 TESTE 7: Simulação Completa do Fluxo
  private async simulateMonitoringServiceFlow(): Promise<void> {
    console.log('7️⃣ SIMULANDO FLUXO COMPLETO DO MONITORING SERVICE...');
    
    try {
      console.log('   🎯 Simulando execução do performScraping()...');
      
      // 1. Simular scraping de rides
      const scrapingResult = this.createSimulatedScrapingResult();
      console.log(`   🚗 Scraping simulado: ${scrapingResult.data.length} tabelas`);
      
      // 2. Converter dados como no MonitoringService
      const rawData = this.convertRidesToRawData(scrapingResult.data);
      console.log(`   🔄 Convertidos: ${rawData.length} registros`);
      
      // 3. Detectar mudanças (simulado)
      const changes = this.simulateDetectChanges(scrapingResult.data);
      console.log(`   🔍 Mudanças detectadas: ${changes.summary.newCount} novos, ${changes.summary.updatedCount} atualizados`);
      
      // 4. Salvar dados de rides
      if (rawData.length > 0) {
        const rideRecords = rawData.map(ride => ({
          table_name: ride.table_name || 'unknown',
          data_hash: this.generateDataHash(ride),
          ride_data: ride,
          session_info: scrapingResult.sessionInfo || {},
          source: 'monitoring-service-flow-test'
        }));
        
        await this.databaseManager.insertRideData(rideRecords);
        console.log(`   💾 Rides salvos: ${rideRecords.length} registros`);
      }
      
      // 5. Simular scraping de drivers
      const driversResult = this.createSimulatedDriversResult();
      console.log(`   👥 Drivers simulado: ${driversResult.data.length} páginas`);
      
      // 6. Processar drivers
      if (driversResult.success && driversResult.data.length > 0) {
        const driversTransformed = await this.driversTransformer.transformAndSave(
          driversResult.data,
          scrapingResult.sessionInfo,
          'drivers-monitoring-service-flow-test',
          driversResult.hasChanges
        );
        console.log(`   💾 Drivers processados: ${driversTransformed.totalRecords} registros`);
      }
      
      this.addTestResult('Fluxo Completo', true, 'Simulação do MonitoringService executada com sucesso');
      console.log('   ✅ Fluxo completo simulado com sucesso!\n');
      
    } catch (error) {
      this.addTestResult('Fluxo Completo', false, `Erro: ${error instanceof Error ? error.message : error}`);
      console.log('   ❌ Falha na simulação do fluxo completo!\n');
      console.error('     📋 Detalhes:', error);
    }
  }

  // 📊 MÉTODOS AUXILIARES PARA GERAÇÃO DE DADOS SIMULADOS

  private generateSimulatedRidesData(): SimulatedRideData[] {
    return [
      {
        name: 'Active Rides',
        table_name: 'active_rides',
        url: 'test://active-rides',
        headers: ['Ride ID', 'Driver', 'Passenger', 'Status', 'Date', 'Time', 'Route'],
        rows: [
          ['RIDE001', 'João Silva', 'Maria Santos', 'Active', '2025-08-04', '14:30', 'Centro -> Aeroporto'],
          ['RIDE002', 'Pedro Costa', 'Ana Lima', 'Active', '2025-08-04', '14:45', 'Mall -> Casa'],
          ['RIDE003', 'Carlos Souza', 'José Oliveira', 'Completed', '2025-08-04', '15:00', 'Hospital -> Centro']
        ],
        isEmpty: false
      },
      {
        name: 'Scheduled Rides',
        table_name: 'scheduled_rides',
        url: 'test://scheduled-rides',
        headers: ['Ride ID', 'Driver', 'Passenger', 'Status', 'Scheduled Date', 'Scheduled Time'],
        rows: [
          ['RIDE004', 'Roberto Lima', 'Sandra Costa', 'Scheduled', '2025-08-04', '16:00'],
          ['RIDE005', 'Fernando Santos', 'Paulo Silva', 'Scheduled', '2025-08-04', '16:30']
        ],
        isEmpty: false
      }
    ];
  }

  private generateSimulatedDriversData(): SimulatedDriverData[] {
    return [
      {
        name: 'Active Drivers',
        url: 'test://active-drivers',
        headers: ['Driver ID', 'Driver Name', 'Mobile', 'Email', 'City', 'Status'],
        rows: [
          ['DRV001', 'João Silva', '+5511999999999', 'joao@email.com', 'São Paulo', 'Active'],
          ['DRV002', 'Pedro Costa', '+5511888888888', 'pedro@email.com', 'São Paulo', 'Active'],
          ['DRV003', 'Carlos Souza', '+5511777777777', 'carlos@email.com', 'São Paulo', 'Active']
        ],
        isEmpty: false
      },
      {
        name: 'Deactive Drivers',
        url: 'test://deactive-drivers',
        headers: ['Driver ID', 'Driver Name', 'Mobile', 'Email', 'Status', 'Deactivation Date'],
        rows: [
          ['DRV004', 'Roberto Lima', '+5511666666666', 'roberto@email.com', 'Inactive', '2025-08-01'],
          ['DRV005', 'Fernando Santos', '+5511555555555', 'fernando@email.com', 'Inactive', '2025-08-02']
        ],
        isEmpty: false
      }
    ];
  }

  private convertRidesToRawData(tablesData: SimulatedRideData[]): any[] {
    const rawData: any[] = [];
    
    tablesData.forEach((table: any) => {
      if (table.rows && table.rows.length > 0) {
        table.rows.forEach((row: any) => {
          const rowData: any = {};
          table.headers.forEach((header: any, index: number) => {
            rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
          });
          rowData.table_name = table.name;
          rawData.push(rowData);
        });
      }
    });
    
    return rawData;
  }

  private generateDataHash(rideData: any): string {
    const hashData = {
      table_name: rideData.table_name || 'unknown',
      data: JSON.stringify(rideData)
    };
    
    const dataString = JSON.stringify(hashData);
    return createHash('md5').update(dataString).digest('hex');
  }

  private createSimulatedScrapingResult(): SimulatedScrapingResult {
    return {
      success: true,
      data: this.generateSimulatedRidesData(),
      sessionInfo: {
        isNewLogin: false,
        browserStatus: 'active',
        sessionValid: true,
        timestamp: new Date().toISOString()
      },
      message: 'Scraping simulado executado com sucesso'
    };
  }

  private createSimulatedDriversResult(): SimulatedDriversResult {
    return {
      success: true,
      data: this.generateSimulatedDriversData(),
      sessionInfo: {
        isNewLogin: false,
        browserStatus: 'active',
        sessionValid: true,
        timestamp: new Date().toISOString()
      },
      message: 'Scraping de drivers simulado executado com sucesso',
      hasChanges: true
    };
  }

  private simulateDetectChanges(scrapingData: any[]): any {
    const totalRecords = scrapingData.reduce((sum, table) => sum + table.rows.length, 0);
    
    return {
      timestamp: new Date().toISOString(),
      totalRecords,
      newRecords: [],
      updatedRecords: [],
      cancelledRecords: [],
      completedRecords: [],
      summary: {
        newCount: Math.floor(totalRecords * 0.3), // Simular 30% como novos
        updatedCount: Math.floor(totalRecords * 0.1), // Simular 10% como atualizados
        cancelledCount: 0,
        completedCount: Math.floor(totalRecords * 0.2) // Simular 20% como concluídos
      }
    };
  }

  // 📋 MÉTODOS DE RELATÓRIO
  private addTestResult(test: string, success: boolean, message: string): void {
    this.testResults.push({ test, success, message });
  }

  private generateTestReport(): void {
    console.log('📋 ====== RELATÓRIO FINAL DOS TESTES ======');
    console.log();
    
    let successCount = 0;
    let failCount = 0;
    
    this.testResults.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'SUCESSO' : 'FALHA';
      
      console.log(`${index + 1}. ${icon} ${result.test}: ${status}`);
      console.log(`   📄 ${result.message}`);
      console.log();
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    });
    
    console.log('📊 ====== RESUMO FINAL ======');
    console.log(`✅ Testes com sucesso: ${successCount}`);
    console.log(`❌ Testes com falha: ${failCount}`);
    console.log(`📈 Taxa de sucesso: ${((successCount / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failCount === 0) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando corretamente.');
    } else {
      console.log('⚠️ ALGUNS TESTES FALHARAM! Verificar logs acima para detalhes.');
    }
    
    console.log();
    console.log('🔚 ====== FIM DOS TESTES ======');
  }
}

// 🚀 EXECUTAR TESTE
async function runDatabaseLogicTest() {
  const tester = new MonitoringLogicTester();
  await tester.runCompleteTest();
  
  // Fechar conexão
  const dbManager = DatabaseManager.getInstance();
  await dbManager.close();
  
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  runDatabaseLogicTest().catch(error => {
    console.error('❌ Erro crítico:', error);
    process.exit(1);
  });
}

export { MonitoringLogicTester };
