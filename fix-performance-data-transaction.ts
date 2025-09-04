/**
 * 🚨 CORREÇÃO CRÍTICA: Unificar transações para evitar perda de dados da Performance
 * 
 * PROBLEMA IDENTIFICADO:
 * - Performance é salva em transação separada
 * - Se VPS crashar entre transações, Performance é perdida
 * 
 * SOLUÇÃO:
 * - Unificar salvamento em uma única transação
 * - Garantir atomicidade: TUDO ou NADA
 */

import { DatabaseManager } from './src/services/databaseManager';
import { DriversDataTransformer } from './src/services/driversDataTransformer';

/**
 * NOVA FUNÇÃO: Salvamento unificado com transação única
 */
export async function saveDriversDataUnified(
  driversData: any[],
  sessionInfo: any,
  hasChanges: boolean = true
): Promise<void> {
  const databaseManager = DatabaseManager.getInstance();
  const driversTransformer = DriversDataTransformer.getInstance();
  
  // Obter pool de conexão
  const pool = databaseManager.getPool();
  if (!pool) {
    throw new Error('Pool de conexão não disponível');
  }

  const client = await pool.connect();
  console.log('🔄 [UNIFIED TRANSACTION] Iniciando transação unificada para drivers...');

  try {
    // ===== INÍCIO DA TRANSAÇÃO UNIFICADA =====
    await client.query('BEGIN');
    console.log('✅ [UNIFIED TRANSACTION] Transação iniciada');

    // 1. PROCESSAR DADOS GENÉRICOS DE DRIVERS
    const transformedData = driversTransformer.transformScrapingData(
      driversData,
      sessionInfo,
      'drivers-unified-transaction',
      hasChanges
    );

    let insertedCount = 0;
    let updatedCount = 0;

    // 2. INSERIR DADOS GENÉRICOS
    for (const record of transformedData.records) {
      const query = `
        INSERT INTO drivers_data (
          driver_id, name, email, mobile, data_type, page_source, 
          additional_data, data_hash, session_info, source, unique_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (data_type, driver_id, data_hash) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          mobile = EXCLUDED.mobile,
          additional_data = EXCLUDED.additional_data,
          scraped_at = NOW(),
          session_info = EXCLUDED.session_info,
          source = EXCLUDED.source
        RETURNING (xmax = 0) AS inserted
      `;
      
      const result = await client.query(query, [
        record.driver_id,
        record.name,
        record.email || null,
        record.mobile || null,
        record.data_type,
        record.page_source,
        JSON.stringify(record.additional_data || {}),
        record.data_hash,
        JSON.stringify(record.session_info || {}),
        record.source || 'drivers-unified-transaction',
        record.unique_id
      ]);

      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`✅ [UNIFIED TRANSACTION] Dados genéricos: ${insertedCount} inseridos, ${updatedCount} atualizados`);

    // 3. PROCESSAR ESPECIFICAMENTE PERFORMANCE (NA MESMA TRANSAÇÃO)
    const performanceData = driversData.find(table => 
      table.name && table.name.includes('Performance') && !table.isEmpty
    );

    if (performanceData) {
      console.log('🏆 [UNIFIED TRANSACTION] Processando Performance na mesma transação...');
      
      // Processar dados de Performance
      const performanceRecords = [];
      performanceData.rows.forEach((row: any[], rowIdx: number) => {
        if (row.length === 1 && row[0].includes('No data available')) {
          return; // Pular linhas vazias
        }

        // Mapear dados usando headers
        const driverPerformance: any = {};
        performanceData.headers.forEach((header: string, idx: number) => {
          driverPerformance[header] = row[idx] || '';
        });

        // Criar hash específico para Performance
        const hashData = `performance-${driverPerformance['Driver ID'] || rowIdx}-${JSON.stringify(driverPerformance)}`;
        const dataHash = require('crypto').createHash('md5').update(hashData).digest('hex');

        performanceRecords.push({
          driver_id: driverPerformance['Driver ID'] || `unknown-${rowIdx}`,
          name: driverPerformance['Driver Name'] || '',
          mobile: driverPerformance['Phone Number'] || null,
          data_type: 'performance',
          page_source: 'Driver Performance',
          additional_data: driverPerformance,
          data_hash: dataHash,
          session_info: sessionInfo,
          source: 'drivers-unified-transaction',
          unique_id: `performance-unified-${driverPerformance['Driver ID'] || rowIdx}-${Date.now()}`
        });
      });

      // Inserir dados de Performance na MESMA transação
      let perfInserted = 0;
      let perfUpdated = 0;

      for (const perfRecord of performanceRecords) {
        const perfQuery = `
          INSERT INTO drivers_data (
            driver_id, name, email, mobile, data_type, page_source, 
            additional_data, data_hash, session_info, source, unique_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (data_type, driver_id, data_hash) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            additional_data = EXCLUDED.additional_data,
            scraped_at = NOW(),
            session_info = EXCLUDED.session_info,
            source = EXCLUDED.source
          RETURNING (xmax = 0) AS inserted
        `;
        
        const perfResult = await client.query(perfQuery, [
          perfRecord.driver_id,
          perfRecord.name,
          null, // email
          perfRecord.mobile,
          perfRecord.data_type,
          perfRecord.page_source,
          JSON.stringify(perfRecord.additional_data),
          perfRecord.data_hash,
          JSON.stringify(perfRecord.session_info),
          perfRecord.source,
          perfRecord.unique_id
        ]);

        if (perfResult.rows[0].inserted) {
          perfInserted++;
        } else {
          perfUpdated++;
        }
      }

      console.log(`✅ [UNIFIED TRANSACTION] Performance: ${perfInserted} inseridos, ${perfUpdated} atualizados`);
    } else {
      console.log('ℹ️ [UNIFIED TRANSACTION] Nenhum dado de Performance encontrado');
    }

    // 4. CRIAR SESSÃO DE SCRAPING (NA MESMA TRANSAÇÃO)
    const sessionQuery = `
      INSERT INTO scraping_sessions (
        total_records, new_records, has_changes, execution_source, browser_session_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    await client.query(sessionQuery, [
      transformedData.totalRecords,
      transformedData.newRecords,
      hasChanges,
      'drivers-unified-transaction',
      sessionInfo?.browserSessionId || null
    ]);

    // ===== COMMIT DA TRANSAÇÃO UNIFICADA =====
    await client.query('COMMIT');
    console.log('🎉 [UNIFIED TRANSACTION] Transação unificada COMMITADA com sucesso!');
    console.log('🎯 [UNIFIED TRANSACTION] Todos os dados (incluindo Performance) salvos atomicamente');

  } catch (error: any) {
    // ===== ROLLBACK EM CASO DE ERRO =====
    await client.query('ROLLBACK');
    console.error('💥 [UNIFIED TRANSACTION] Erro na transação unificada:', error.message);
    console.error('🔄 [UNIFIED TRANSACTION] ROLLBACK executado - nenhum dado foi perdido');
    throw error;
  } finally {
    client.release();
    console.log('🔓 [UNIFIED TRANSACTION] Conexão liberada');
  }
}

/**
 * FUNÇÃO DE TESTE: Verificar integridade dos dados
 */
export async function verifyPerformanceDataIntegrity(): Promise<void> {
  const databaseManager = DatabaseManager.getInstance();
  const pool = databaseManager.getPool();
  
  if (!pool) {
    console.error('❌ Pool de conexão não disponível');
    return;
  }

  const client = await pool.connect();
  
  try {
    // Contar registros de Performance
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM drivers_data 
      WHERE data_type = 'performance' OR page_source = 'Driver Performance'
    `;
    
    const result = await client.query(countQuery);
    const total = result.rows[0].total;
    
    console.log(`📊 [INTEGRITY CHECK] Total de registros Performance no banco: ${total}`);
    
    if (total === 0) {
      console.log('🚨 [INTEGRITY CHECK] NENHUM dado de Performance encontrado no banco!');
      console.log('🔧 [INTEGRITY CHECK] Recomendação: Execute o scraping novamente com transação unificada');
    } else {
      console.log('✅ [INTEGRITY CHECK] Dados de Performance encontrados no banco');
    }
    
    // Verificar últimos registros
    const recentQuery = `
      SELECT driver_id, name, scraped_at, source
      FROM drivers_data 
      WHERE data_type = 'performance' OR page_source = 'Driver Performance'
      ORDER BY scraped_at DESC 
      LIMIT 5
    `;
    
    const recentResult = await client.query(recentQuery);
    console.log('📅 [INTEGRITY CHECK] Últimos 5 registros de Performance:');
    recentResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. Driver: ${row.driver_id} | Nome: ${row.name} | Data: ${row.scraped_at} | Source: ${row.source}`);
    });
    
  } catch (error: any) {
    console.error('❌ [INTEGRITY CHECK] Erro ao verificar integridade:', error.message);
  } finally {
    client.release();
  }
}

console.log('🚨 CORREÇÃO CRÍTICA CRIADA');
console.log('📋 RESUMO DOS PROBLEMAS IDENTIFICADOS:');
console.log('   1. Performance salva em transação separada (RISCO DE PERDA)');
console.log('   2. Duplo processamento de dados');
console.log('   3. Falta de atomicidade');
console.log('   4. Tratamento de erro insuficiente');
console.log('   5. Dependência de dados de rides');
console.log('');
console.log('✅ SOLUÇÃO IMPLEMENTADA:');
console.log('   - Transação unificada para todos os dados de drivers');
console.log('   - Salvamento atômico: TUDO ou NADA');
console.log('   - Rollback automático em caso de falha');
console.log('   - Verificação de integridade incluída');
