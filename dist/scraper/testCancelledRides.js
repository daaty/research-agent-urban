"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCancelledRidesOnly = testCancelledRidesOnly;
const playwright_1 = require("playwright");
function testCancelledRidesOnly() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            const email = process.env.RIDES_EMAIL || '';
            const password = process.env.RIDES_PASSWORD || '';
            const headless = process.env.HEADLESS_MODE === 'true';
            console.log('🚀 TESTE FOCADO - ABA CANCELADOS');
            console.log('📧 Email:', email);
            console.log('🔧 Headless:', headless);
            browser = yield playwright_1.chromium.launch({
                headless: headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // 1. LOGIN
            console.log('🔐 Fazendo login...');
            yield page.goto('https://rides.ec2dashboard.com/#/page/login');
            yield page.waitForTimeout(3000);
            // Preencher login
            yield page.fill('#exampleInputEmail1', email);
            yield page.fill('#exampleInputPassword1', password);
            yield page.click('button[type="submit"]');
            // Aguardar login
            yield page.waitForTimeout(5000);
            const currentUrl = page.url();
            console.log('🌐 URL após login:', currentUrl);
            if (currentUrl.includes('login')) {
                throw new Error('LOGIN FALHOU!');
            }
            console.log('✅ LOGIN SUCESSO!');
            // 2. IR PARA ABA CANCELADOS E AGUARDAR DADOS
            console.log('🔍 Navegando para CANCELLED RIDES...');
            yield page.goto('https://rides.ec2dashboard.com/#/app/cancelled-rides/4/', {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            // Aguardar AngularJS carregar completamente
            console.log('⏳ Aguardando AngularJS e dados carregarem...');
            // Estratégia: Aguardar até que não haja mais o "No data available" OU aguardar 20 segundos
            let attempts = 0;
            const maxAttempts = 20; // 20 segundos
            let hasData = false;
            while (attempts < maxAttempts && !hasData) {
                yield page.waitForTimeout(1000);
                attempts++;
                // Verificar se ainda há "No data available"
                const noDataElement = yield page.$('td.dataTables_empty');
                if (!noDataElement) {
                    console.log(`✅ "No data available" desapareceu após ${attempts} segundos!`);
                    hasData = true;
                    break;
                }
                // Verificar se há linhas com dados reais (ng-scope sem dataTables_empty)
                const dataRows = yield page.$$('#ridesTable tbody tr.ng-scope:not(:has(.dataTables_empty))');
                if (dataRows.length > 0) {
                    console.log(`✅ ${dataRows.length} linhas de dados encontradas após ${attempts} segundos!`);
                    hasData = true;
                    break;
                }
                // A cada 5 segundos, mostrar progresso
                if (attempts % 5 === 0) {
                    console.log(`⏳ ${attempts}/${maxAttempts}s - ainda aguardando dados...`);
                }
            }
            if (!hasData) {
                console.log('⚠️  Timeout após 20s aguardando dados - continuando com o que temos...');
            }
            // Aguardar mais um pouco para garantir
            yield page.waitForTimeout(2000);
            // DEBUG: Procurar por filtros de data na página
            console.log('🔍 Procurando filtros de data...');
            const dateFilters = yield page.$$('input[type="date"], .datepicker, input[placeholder*="date"], input[placeholder*="Date"]');
            console.log(`📅 Filtros de data encontrados: ${dateFilters.length}`);
            // DEBUG: Procurar botões de filtro/pesquisa
            const filterButtons = yield page.$$('button:has-text("Filter"), button:has-text("Search"), button:has-text("Apply"), .btn-search, .btn-filter');
            console.log(`🔍 Botões de filtro encontrados: ${filterButtons.length}`);
            // DEBUG: Verificar se há mensagens de loading
            const loadingElements = yield page.$$('.loading, .spinner, [class*="load"]');
            console.log(`⏳ Elementos de loading: ${loadingElements.length}`);
            // DEBUG: Aguardar mais um pouco para verificar se há carregamento AJAX
            console.log('⏳ Aguardando mais 15 segundos para carregamento AJAX...');
            yield page.waitForTimeout(15000);
            // NOVA ESTRATÉGIA: Aguardar dados carregarem dinamicamente
            console.log('🔄 Tentando aguardar dados aparecerem dinamicamente...');
            // Aguardar até 30 segundos para dados aparecerem OU timeout
            let dataFound = false;
            let ajaxAttempts = 0;
            const maxAjaxAttempts = 15; // 30 segundos total (2s * 15)
            while (!dataFound && ajaxAttempts < maxAjaxAttempts) {
                // Verificar se há dados agora
                const hasData = yield page.evaluate(() => {
                    const tbody = document.querySelector('#ridesTable tbody');
                    if (!tbody)
                        return false;
                    const emptyMessage = tbody.querySelector('td.dataTables_empty');
                    if (emptyMessage)
                        return false;
                    const dataRows = tbody.querySelectorAll('tr:not(:has(.dataTables_empty))');
                    return dataRows.length > 0;
                });
                if (hasData) {
                    dataFound = true;
                    console.log(`✅ Dados encontrados após ${ajaxAttempts * 2} segundos!`);
                    break;
                }
                ajaxAttempts++;
                console.log(`🔄 Tentativa ${ajaxAttempts}/${maxAjaxAttempts} - aguardando dados...`);
                yield page.waitForTimeout(2000);
            }
            if (!dataFound) {
                console.log('⚠️  Timeout: dados não apareceram após 30 segundos');
            }
            // 3. DEBUGAR TUDO
            console.log('🐛 === DEBUG COMPLETO ===');
            // Verificar URL atual
            console.log('🌐 URL atual:', page.url());
            // Verificar se existe a tabela
            const tableExists = yield page.$('table');
            console.log('📊 Tabela existe?', !!tableExists);
            // Pegar todo HTML da página
            const pageHTML = yield page.content();
            console.log('📄 Tamanho total do HTML:', pageHTML.length);
            // Procurar por tabelas
            const allTables = yield page.$$('table');
            console.log('📊 Quantidade de tabelas encontradas:', allTables.length);
            // Para cada tabela, mostrar informações
            for (let i = 0; i < allTables.length; i++) {
                const tableId = yield allTables[i].getAttribute('id');
                const tableClass = yield allTables[i].getAttribute('class');
                console.log(`📊 Tabela ${i + 1}:`, { id: tableId, class: tableClass });
            }
            // Procurar especificamente por ridesTable
            const ridesTable = yield page.$('#ridesTable');
            console.log('🎯 ridesTable existe?', !!ridesTable);
            if (ridesTable) {
                // Pegar HTML completo da tabela
                const tableHTML = yield page.innerHTML('#ridesTable');
                console.log('📋 HTML da ridesTable (primeiros 2000 chars):');
                console.log(tableHTML.substring(0, 2000));
                // Procurar tbody
                const tbody = yield page.$('#ridesTable tbody');
                console.log('📋 tbody existe?', !!tbody);
                if (tbody) {
                    const tbodyHTML = yield page.innerHTML('#ridesTable tbody');
                    console.log('📋 HTML do tbody COMPLETO:');
                    console.log(tbodyHTML);
                    // Contar linhas tr
                    const allTRs = yield page.$$('#ridesTable tbody tr');
                    console.log('📋 Quantidade de TRs no tbody:', allTRs.length);
                    // Para cada TR, mostrar conteúdo
                    for (let i = 0; i < allTRs.length; i++) {
                        const trHTML = yield allTRs[i].innerHTML();
                        const trClass = yield allTRs[i].getAttribute('class');
                        console.log(`📋 TR ${i + 1} (class: ${trClass}):`);
                        console.log(trHTML.substring(0, 500));
                        console.log('---');
                    }
                }
            }
            // Procurar por qualquer elemento com ng-repeat
            const ngRepeats = yield page.$$('[ng-repeat]');
            console.log('🔄 Elementos com ng-repeat:', ngRepeats.length);
            // Procurar por dados usando diferentes seletores
            const selectors = [
                'tbody tr',
                'table tbody tr',
                '#ridesTable tbody tr',
                'tr[ng-repeat]',
                'tr.ng-scope',
                '.dataTables_scrollBody tbody tr'
            ];
            for (const selector of selectors) {
                const elements = yield page.$$(selector);
                console.log(`🔍 Seletor "${selector}": ${elements.length} elementos`);
            }
            return {
                success: true,
                url: page.url(),
                tableExists: !!ridesTable,
                message: 'Debug completo realizado'
            };
        }
        catch (error) {
            console.error('❌ ERRO:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
