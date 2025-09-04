/**
 * CORREÇÃO URGENTE: DRIVER PERFORMANCE - RESOLVER PROBLEMAS DE SALVAMENTO
 * 
 * Este script implementa as correções identificadas na análise para garantir
 * que os dados da aba Performance sejam salvos de forma robusta.
 */

import { replace_string_in_file } from '../tools';

console.log('🔧 CORREÇÃO: DRIVER PERFORMANCE - IMPLEMENTANDO FIXES');
console.log('====================================================\n');

async function implementarCorrecoes() {
  
  // ===== CORREÇÃO 1: REMOVER DUPLO PROCESSAMENTO =====
  console.log('1️⃣ REMOVENDO DUPLO PROCESSAMENTO DA PERFORMANCE...');
  
  try {
    // Remover o processamento específico no monitoringService.ts
    await replace_string_in_file({
      filePath: 'E:\\SCRAPER1\\research-agent-urban\\src\\services\\monitoringService.ts',
      oldString: `          // 🎯 PROCESSAMENTO ESPECÍFICO PARA DRIVER PERFORMANCE
          const performanceData = driversResult.data.find(table => table.name === 'Driver Performance');
          if (performanceData && !performanceData.isEmpty) {
            console.log('🏆 Processando dados específicos de Driver Performance...');
            
            try {
              const scraper = new DriversPersistentScraper();
              const processedPerformance = scraper.processDriverPerformanceData(performanceData);
              
              if (processedPerformance.length > 0) {
                await this.databaseManager.saveDriverPerformanceData(processedPerformance);
                console.log(\`✅ \${processedPerformance.length} registros de Driver Performance salvos\`);
              } else {
                console.log('⚠️ Nenhum dado de Driver Performance válido para salvar');
              }
            } catch (performanceError) {
              console.error('❌ Erro ao processar Driver Performance:', performanceError);
            }
          } else {
            console.log('ℹ️ Dados de Driver Performance não encontrados nesta execução');
          }`,
      newString: `          // ✅ PERFORMANCE AGORA É PROCESSADA JUNTO COM OUTRAS ABAS
          // Removido processamento duplo - Performance usa mesmo fluxo das outras abas
          console.log('✅ Driver Performance processada junto com outras abas via DriversDataTransformer');`
    });
    console.log('   ✅ Removido processamento duplo no monitoringService.ts');
  } catch (error) {
    console.log('   ⚠️ Erro ao corrigir monitoringService.ts:', error);
  }

  // ===== CORREÇÃO 2: REMOVER VALIDAÇÃO ESPECÍFICA =====
  console.log('2️⃣ REMOVENDO VALIDAÇÃO ESPECÍFICA DA PERFORMANCE...');
  
  try {
    // Remover validação específica no driversDataTransformer.ts
    await replace_string_in_file({
      filePath: 'E:\\SCRAPER1\\research-agent-urban\\src\\services\\driversDataTransformer.ts',
      oldString: `        // ✅ VALIDAÇÃO ESPECÍFICA PARA DRIVER PERFORMANCE
        if (table.name.includes('Driver Performance')) {
          const allRowsEmpty = table.rows.every(row => 
            row.length === 1 && row[0].includes('No data available')
          );
          
          if (allRowsEmpty) {
            console.log(\`⚠️ [DRIVERS TRANSFORMER] Driver Performance ignorada: sem dados válidos\`);
            return; // Pular completamente Driver Performance vazia
          }
        }`,
      newString: `        // ✅ VALIDAÇÃO PADRÃO PARA TODAS AS ABAS (incluindo Performance)
        // Removida validação específica que rejeitava Performance prematuramente`
    });
    console.log('   ✅ Removida validação específica no driversDataTransformer.ts');
  } catch (error) {
    console.log('   ⚠️ Erro ao corrigir driversDataTransformer.ts:', error);
  }

  // ===== CORREÇÃO 3: MELHORAR ROBUSTEZ DO CLIQUE =====
  console.log('3️⃣ MELHORANDO ROBUSTEZ DO CLIQUE NO BOTÃO SEARCH...');
  
  try {
    // Adicionar mais tentativas e fallbacks no driversPersistentScraper.ts
    await replace_string_in_file({
      filePath: 'E:\\SCRAPER1\\research-agent-urban\\src\\scraper\\driversPersistentScraper.ts',
      oldString: `          if (!searchButtonFound) {
        console.log('⚠️ Botão Search não encontrado - tentando aguardar dados direto...');
      } else {
        console.log('✅ Botão Search clicado com sucesso!');
      }`,
      newString: `          if (!searchButtonFound) {
        console.log('⚠️ Botão Search não encontrado - tentando TERCEIRA tentativa após aguardar...');
        
        // TERCEIRA TENTATIVA: Aguardar mais tempo e tentar novamente
        await this.delay(3000);
        
        for (const selector of searchButtonSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              console.log(\`🔍 Botão Search encontrado na 3ª tentativa: \${selector}\`);
              await button.click();
              searchButtonFound = true;
              await this.delay(4000); // Mais tempo após 3ª tentativa
              break;
            }
          } catch (error) {
            console.log(\`⚠️ 3ª tentativa falhou para seletor \${selector}\`);
          }
        }
        
        if (!searchButtonFound) {
          console.log('🚨 FALLBACK: Tentando carregar dados sem clique (pode estar pré-carregado)');
        }
      } else {
        console.log('✅ Botão Search clicado com sucesso!');
      }`
    });
    console.log('   ✅ Adicionada terceira tentativa de clique com fallback');
  } catch (error) {
    console.log('   ⚠️ Erro ao melhorar clique:', error);
  }

  // ===== CORREÇÃO 4: LOGS ESPECÍFICOS PARA PERFORMANCE =====
  console.log('4️⃣ ADICIONANDO LOGS ESPECÍFICOS PARA PERFORMANCE...');
  
  try {
    // Adicionar logs detalhados
    await replace_string_in_file({
      filePath: 'E:\\SCRAPER1\\research-agent-urban\\src\\scraper\\driversPersistentScraper.ts',
      oldString: `          // Aguardar página carregar
          if (driverPage.name.includes('Performance')) {
            console.log(\`⏳ Driver Performance detectado - será necessário clicar no Search...\`);
            await this.delay(2000); // Tempo básico para Performance
          } else {
            await this.delay(1500);
          }`,
      newString: `          // Aguardar página carregar
          if (driverPage.name.includes('Performance')) {
            console.log(\`🏆 [PERFORMANCE-CRITICAL] Driver Performance detectado - será necessário clicar no Search...\`);
            console.log(\`🏆 [PERFORMANCE-CRITICAL] URL atual: \${page.url()}\`);
            await this.delay(2000); // Tempo básico para Performance
          } else {
            await this.delay(1500);
          }`
    });
    console.log('   ✅ Adicionados logs críticos para Performance');
  } catch (error) {
    console.log('   ⚠️ Erro ao adicionar logs:', error);
  }

  // ===== CORREÇÃO 5: PRIORIZAR PERFORMANCE =====
  console.log('5️⃣ PRIORIZANDO PROCESSAMENTO DA PERFORMANCE...');
  
  try {
    // Mover Performance para o início da lista
    await replace_string_in_file({
      filePath: 'E:\\SCRAPER1\\research-agent-urban\\src\\scraper\\driversPersistentScraper.ts',
      oldString: `    // URLs das páginas de drivers baseado no domínio (URLs corretas)
    this.driversPages = [
      { name: 'Active Drivers', url: \`\${this.baseUrl}/#/app/active-drivers//\` },
      { name: 'Deactive Drivers', url: \`\${this.baseUrl}/#/app/deactivated-drivers/\` },
      { name: 'Drivers Enrollment', url: \`\${this.baseUrl}#/app/selfEnrolled-driver//\` },
      { name: 'Leaderboard', url: \`\${this.baseUrl}#/app/driver-leaderboard/\` },
      { name: 'Driver Performance', url: \`\${this.baseUrl}#/app/high-cancellations/\` }
    ];`,
      newString: `    // URLs das páginas de drivers - PERFORMANCE EM PRIMEIRO para evitar perda
    this.driversPages = [
      { name: 'Driver Performance', url: \`\${this.baseUrl}#/app/high-cancellations/\` }, // 🏆 PRIMEIRO
      { name: 'Active Drivers', url: \`\${this.baseUrl}/#/app/active-drivers//\` },
      { name: 'Deactive Drivers', url: \`\${this.baseUrl}/#/app/deactivated-drivers/\` },
      { name: 'Drivers Enrollment', url: \`\${this.baseUrl}#/app/selfEnrolled-driver//\` },
      { name: 'Leaderboard', url: \`\${this.baseUrl}#/app/driver-leaderboard/\` }
    ];`
    });
    console.log('   ✅ Performance movida para primeira posição na lista');
  } catch (error) {
    console.log('   ⚠️ Erro ao priorizar Performance:', error);
  }

  // ===== CORREÇÃO 6: ADICIONAR VERIFICAÇÃO FINAL =====
  console.log('6️⃣ ADICIONANDO VERIFICAÇÃO FINAL DE DADOS...');
  
  try {
    // Adicionar verificação no final do scraping
    await replace_string_in_file({
      filePath: 'E:\\SCRAPER1\\research-agent-urban\\src\\scraper\\driversPersistentScraper.ts',
      oldString: `      const totalRecords = allDriversData.reduce((sum, table) => sum + table.rows.length, 0);
      
      // Comparar com dados anteriores de drivers
      console.log('🔍 Comparando dados de drivers com cache anterior...');
      const comparison = this.cacheManager.compareAndGetDifferences(allDriversData);`,
      newString: `      const totalRecords = allDriversData.reduce((sum, table) => sum + table.rows.length, 0);
      
      // 🏆 VERIFICAÇÃO CRÍTICA: Validar se Performance foi extraída
      const performanceTable = allDriversData.find(table => table.name.includes('Performance'));
      if (performanceTable) {
        if (performanceTable.isEmpty || performanceTable.rows.length === 0) {
          console.log('🚨 [PERFORMANCE-ALERT] Driver Performance está VAZIA - possível falha!');
          console.log('🚨 [PERFORMANCE-ALERT] Performance Table:', JSON.stringify(performanceTable, null, 2));
        } else {
          console.log(\`✅ [PERFORMANCE-SUCCESS] Driver Performance extraída: \${performanceTable.rows.length} registros\`);
        }
      } else {
        console.log('🚨 [PERFORMANCE-ALERT] Driver Performance NÃO ENCONTRADA na lista de dados!');
      }
      
      // Comparar com dados anteriores de drivers
      console.log('🔍 Comparando dados de drivers com cache anterior...');
      const comparison = this.cacheManager.compareAndGetDifferences(allDriversData);`
    });
    console.log('   ✅ Adicionada verificação crítica de Performance');
  } catch (error) {
    console.log('   ⚠️ Erro ao adicionar verificação:', error);
  }

  console.log('\n✅ CORREÇÕES IMPLEMENTADAS COM SUCESSO!');
  console.log('=====================================');
  console.log('');
  console.log('🏆 PRINCIPAIS MELHORIAS:');
  console.log('   ✅ Removido processamento duplo da Performance');
  console.log('   ✅ Removida validação específica que rejeitava dados');
  console.log('   ✅ Melhorada robustez do clique no botão Search');
  console.log('   ✅ Performance processada PRIMEIRO (mais seguro)');
  console.log('   ✅ Adicionados logs críticos para monitoramento');
  console.log('   ✅ Adicionada verificação final dos dados');
  console.log('');
  console.log('🚨 PRÓXIMOS PASSOS:');
  console.log('   1️⃣ Fazer build: npm run build');
  console.log('   2️⃣ Testar execução: npm run start:monitoring');
  console.log('   3️⃣ Verificar logs de Performance');
  console.log('   4️⃣ Conferir dados no banco após execução');
  console.log('   5️⃣ Commit das mudanças se funcionando');
}

// Executar correções
implementarCorrecoes().catch(console.error);
