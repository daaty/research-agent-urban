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
exports.DriversPersistentScraper = void 0;
exports.rowToObject = rowToObject;
exports.scrapeAllDriversDataPersistent = scrapeAllDriversDataPersistent;
/**
 * Mapeia dinamicamente uma linha de dados para um objeto usando os headers como chave.
 * Exemplo: rowToObject(['Driver ID', 'Name'], ['123', 'João']) => { 'Driver ID': '123', Name: 'João' }
 */
function rowToObject(headers, row) {
    return headers.reduce((acc, header, idx) => {
        acc[header] = row[idx];
        return acc;
    }, {});
}
const browserSessionManager_1 = require("../services/browserSessionManager");
const driverCacheManager_1 = require("../services/driverCacheManager");
class DriversPersistentScraper {
    constructor() {
        this.sessionManager = browserSessionManager_1.BrowserSessionManager.getInstance();
        this.cacheManager = driverCacheManager_1.DriverCacheManager.getInstance();
        // Extrair domínio base da URL de login (sem barra final)
        const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
        this.baseUrl = loginUrl.split('#')[0].replace(/\/$/, ''); // Remove barra final se existir
        // URLs das páginas de drivers baseado no domínio (URLs corretas)
        this.driversPages = [
            { name: 'Active Drivers', url: `${this.baseUrl}/#/app/active-drivers//` },
            { name: 'Deactive Drivers', url: `${this.baseUrl}/#/app/deactivated-drivers/` },
            { name: 'Drivers Enrollment', url: `${this.baseUrl}#/app/selfEnrolled-driver//` },
            { name: 'Leaderboard', url: `${this.baseUrl}#/app/driver-leaderboard/` },
            { name: 'Driver Performance', url: `${this.baseUrl}#/app/high-cancellations/` }
        ];
    }
    /**
     * Executa scraping de drivers usando sessão persistente (reutiliza sessão das rides)
     */
    scrapeAllDriversData() {
        return __awaiter(this, arguments, void 0, function* (skipLoginVerification = false) {
            try {
                // Usar constante interna para sempre pular login nos drivers
                const shouldSkipLogin = DriversPersistentScraper.ALWAYS_SKIP_LOGIN || skipLoginVerification;
                console.log('🚗 Iniciando scraping de drivers com sessão persistente...');
                console.log(`🔧 Skip Login Original: ${skipLoginVerification}`);
                console.log(`🔧 Skip Login Final (DRIVERS): ${shouldSkipLogin}`);
                // Verificar se a sessão está ativa (deve estar devido ao scraping de rides)
                if (!this.sessionManager.isActive()) {
                    // Se shouldSkipLogin for true, tentar inicializar mas não fazer login
                    if (shouldSkipLogin) {
                        console.log('⚡ Inicializando browser sem verificação de login...');
                        yield this.sessionManager.initializeBrowser();
                    }
                    else {
                        return {
                            success: false,
                            data: [],
                            message: 'Sessão do browser não está ativa. Execute primeiro o scraping de rides.',
                            sessionInfo: {
                                isNewLogin: false,
                                browserStatus: 'inactive',
                                sessionValid: false
                            }
                        };
                    }
                }
                console.log('✅ Usando sessão existente do browser para drivers');
                // Extrair dados de todas as páginas de drivers
                const allDriversData = [];
                for (const driverPage of this.driversPages) {
                    console.log(`👥 Processando: ${driverPage.name}...`);
                    try {
                        // Navegar diretamente para a página (sem verificações de login)
                        yield this.navigateDirectly(driverPage.url);
                        // Aguardar página carregar
                        if (driverPage.name.includes('Performance')) {
                            console.log(`⏳ Driver Performance detectado - será necessário clicar no Search...`);
                            yield this.delay(2000); // Tempo básico para Performance
                        }
                        else {
                            yield this.delay(1500);
                        }
                        // Aguardar especificamente elementos Angular carregarem
                        yield this.waitForAngularLoad();
                        // Aguardar especificamente a tabela de drivers carregar
                        const tableData = yield this.extractDriverTableData(driverPage.name);
                        allDriversData.push(tableData);
                        const recordCount = tableData.isEmpty ? 0 : tableData.rows.length;
                        console.log(`✅ ${driverPage.name}: ${recordCount} registros encontrados`);
                    }
                    catch (error) {
                        console.error(`❌ Erro ao processar ${driverPage.name}:`, error.message);
                        allDriversData.push({
                            name: driverPage.name,
                            url: driverPage.url,
                            headers: [],
                            rows: [],
                            isEmpty: true
                        });
                    }
                }
                const totalRecords = allDriversData.reduce((sum, table) => sum + table.rows.length, 0);
                // Comparar com dados anteriores de drivers
                console.log('🔍 Comparando dados de drivers com cache anterior...');
                const comparison = this.cacheManager.compareAndGetDifferences(allDriversData);
                let resultMessage = '';
                if (comparison.hasChanges) {
                    const newRecords = comparison.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0);
                    resultMessage = `✅ Scraping de drivers concluído! ${newRecords} novos registros encontrados de ${totalRecords} total`;
                }
                else {
                    resultMessage = `✅ Scraping de drivers concluído! Nenhuma mudança detectada (${totalRecords} registros existentes)`;
                }
                console.log(resultMessage);
                return {
                    success: true,
                    data: allDriversData,
                    message: resultMessage,
                    sessionInfo: {
                        isNewLogin: false,
                        browserStatus: 'active',
                        sessionValid: true
                    },
                    differences: comparison.differences
                };
            }
            catch (error) {
                console.error('❌ Erro durante scraping de drivers:', error.message);
                return {
                    success: false,
                    data: [],
                    message: `Erro durante scraping: ${error.message}`,
                    sessionInfo: {
                        isNewLogin: false,
                        browserStatus: 'error',
                        sessionValid: false
                    }
                };
            }
        });
    }
    /**
     * Extrai dados específicos da tabela de drivers com seletores otimizados
     *
     * Após a extração, imprime exemplos de objetos mapeados dinamicamente para Active Drivers e Drivers Enrollment.
     */
    extractDriverTableData(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = this.sessionManager.getPage();
            if (!page) {
                throw new Error('Browser não está inicializado');
            }
            const currentUrl = page.url();
            try {
                // Determinar qual seletor usar baseado no tipo de página
                let tableSelector = '';
                let rowSelector = '';
                if (tableName.includes('Active')) {
                    tableSelector = '#activeDriver';
                    rowSelector = '#activeDriver tbody tr[ng-repeat*="data in displayData"]';
                }
                else if (tableName.includes('Deactive')) {
                    tableSelector = '#deactivatedDriver';
                    rowSelector = '#deactivatedDriver tbody tr[ng-repeat*="data in displayData"]';
                }
                else if (tableName.includes('Enrollment')) {
                    tableSelector = '#manUploaded';
                    rowSelector = '#manUploaded tbody tr[ng-repeat*="value in displayData"]';
                }
                else if (tableName.includes('Leaderboard')) {
                    tableSelector = '#datatable2';
                    rowSelector = '#datatable2 tbody tr[ng-repeat*="data in TableData"]';
                }
                else if (tableName.includes('Performance')) {
                    // Driver Performance pode usar seletor diferente
                    tableSelector = '#datatable2, table.t-fancy-table, .dataTables_wrapper table';
                    rowSelector = '#datatable2 tbody tr[ng-repeat*="data in TableData"], table.t-fancy-table tbody tr[ng-repeat*="data"]';
                }
                else {
                    // Fallback genérico para outras páginas
                    tableSelector = 'table.t-fancy-table';
                    rowSelector = 'table.t-fancy-table tbody tr[ng-repeat*="data in displayData"]';
                }
                console.log(`🔍 Usando seletor: ${tableSelector} para ${tableName}`);
                // Tratamento especial para Driver Performance
                if (tableName.includes('Performance')) {
                    return yield this.extractPerformanceTableData(tableName, currentUrl);
                }
                yield page.waitForSelector(tableSelector, { timeout: 5000 });
                yield page.waitForTimeout(1500);
                try {
                    yield page.waitForSelector(`${tableSelector} tbody tr`, { timeout: 3000 });
                }
                catch (error) {
                    console.log(`⚠️ Nenhuma linha encontrada em ${tableName} - tabela pode estar vazia`);
                }
                const tableExists = yield page.$(tableSelector);
                if (!tableExists) {
                    return {
                        name: tableName,
                        url: currentUrl,
                        headers: [],
                        rows: [],
                        isEmpty: true
                    };
                }
                // 1. Extrair headers visíveis e seus índices reais (sem offsetParent)
                let headerInfo = yield page.$$eval(`${tableSelector} thead tr th`, (ths) => {
                    const result = [];
                    ths.forEach((th, idx) => {
                        const classList = th.classList;
                        const hidden = classList.contains('ng-hide') || th.getAttribute('aria-hidden') === 'true';
                        const style = th.getAttribute('style') || '';
                        const widthZero = /width:\s*0(px)?/.test(style) || /display:\s*none/.test(style);
                        if (!hidden && !widthZero) {
                            result.push({ text: (th.textContent || '').trim(), realIndex: idx });
                        }
                    });
                    return result;
                });
                // Fallback: se não encontrar nenhum header visível, extrai todos para debug
                if (headerInfo.length === 0) {
                    headerInfo = yield page.$$eval(`${tableSelector} thead tr th`, (ths) => {
                        return ths.map((th, idx) => ({ text: (th.textContent || '').trim(), realIndex: idx }));
                    });
                    console.log(`[extractDriverTableData][DEBUG] Fallback: headers brutos extraídos:`, headerInfo);
                }
                const headers = headerInfo.map(h => h.text);
                const headerIndices = headerInfo.map(h => h.realIndex);
                console.log(`📋 Headers encontrados para ${tableName}:`, headers);
                // 2. Para cada linha, extrair os <td> usando o índice real de cada header
                const rows = yield page.$$eval(`${tableSelector} tbody tr`, (trs, headerInfo) => {
                    return trs.map((tr, trIdx) => {
                        const tds = Array.from(tr.children);
                        // Para cada header, pega o <td> pelo realIndex (garante alinhamento)
                        return headerInfo.map(h => {
                            const td = tds[h.realIndex];
                            return td ? (td.textContent || '').trim() : '';
                        });
                    });
                }, headerInfo);
                if (rows.length > 0) {
                    console.log('[extractDriverTableData] First 3 rows:', rows.slice(0, 3));
                    // Tentar recuperar o log de ordem dos tds
                    try {
                        const tdOrder = yield page.evaluate(() => window.__debug_td_order || []);
                        if (tdOrder && tdOrder.length > 0) {
                            console.log('[extractDriverTableData][DEBUG] Ordem real dos <td> e índices usados nas 3 primeiras linhas:', JSON.stringify(tdOrder, null, 2));
                        }
                    }
                    catch (e) { /* ignore */ }
                }
                // Verificar se a tabela está vazia (com mensagem "No drivers found !!!")
                const emptyMessage = yield page.$eval(`${tableSelector} tbody`, tbody => {
                    var _a;
                    const emptyCell = tbody.querySelector('.dataTables_empty');
                    return emptyCell ? (_a = emptyCell.textContent) === null || _a === void 0 ? void 0 : _a.trim() : null;
                }).catch(() => null);
                if (emptyMessage && emptyMessage.includes('No drivers found')) {
                    console.log(`⚠️ Tabela ${tableName} está vazia: ${emptyMessage}`);
                    return {
                        name: tableName,
                        url: currentUrl,
                        headers: headers,
                        rows: [],
                        isEmpty: true
                    };
                }
                if (rows.length === 0) {
                    console.log(`⚠️ Nenhuma linha de dados encontrada em ${tableName}`);
                    return {
                        name: tableName,
                        url: currentUrl,
                        headers: headers,
                        rows: [],
                        isEmpty: true
                    };
                }
                console.log(`📊 Extraídas ${rows.length} linhas de dados de ${tableName}`);
                if (rows.length > 0) {
                    console.log(`🔍 Primeira linha de exemplo:`, rows[0]);
                }
                // Exemplo de uso do mapeamento dinâmico para debug
                if (tableName.includes('Active') || tableName.includes('Enrollment')) {
                    const exemplos = rows.slice(0, 3).map(row => rowToObject(headers, row));
                    console.log(`[DEBUG] Exemplo de objetos mapeados dinamicamente (${tableName}):`, exemplos);
                }
                return {
                    name: tableName,
                    url: currentUrl,
                    headers: headers,
                    rows: rows,
                    isEmpty: rows.length === 0
                };
            }
            catch (error) {
                console.error(`❌ Erro ao extrair dados da tabela ${tableName}:`, error);
                return {
                    name: tableName,
                    url: currentUrl,
                    headers: [],
                    rows: [],
                    isEmpty: true
                };
            }
        });
    }
    /**
     * Navega diretamente para uma URL sem verificações de login
     * (usado para drivers após login já ter sido confirmado no scraping de rides)
     */
    navigateDirectly(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = this.sessionManager.getPage();
            if (!page) {
                throw new Error('Browser não está inicializado');
            }
            console.log(`📍 Navegando para: ${url}`);
            try {
                // Navegação direta sem verificações de login
                yield page.goto(url, {
                    waitUntil: 'networkidle',
                    timeout: 20000
                });
            }
            catch (error) {
                console.log(`⚠️ Timeout com networkidle, tentando com domcontentloaded...`);
                // Se der timeout, tentar com domcontentloaded
                yield page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000
                });
            }
            yield page.waitForTimeout(1500);
        });
    }
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Aguarda carregamento específico do Angular
     */
    waitForAngularLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = this.sessionManager.getPage();
            if (!page)
                return;
            try {
                // Aguardar Angular carregar (verificação genérica - timeout reduzido)
                yield page.waitForFunction(() => window.angular && window.angular.element, { timeout: 6000 });
                // Aguardar dados serem carregados (verificar se há loading spinners - timeout reduzido)
                yield page.waitForFunction(() => !document.querySelector('.loading, .spinner, [ng-show*="loading"]'), { timeout: 3000 }).catch(() => {
                    // Ignorar timeout aqui, continuar mesmo se ainda houver loading
                });
                // Delay reduzido para garantir
                yield this.delay(500);
            }
            catch (error) {
                console.log('⚠️ Timeout aguardando Angular - continuando...');
            }
        });
    }
    /**
     * Aguarda carregamento específico da página Driver Performance
     */
    /**
     * Extração específica para página Driver Performance
     */
    extractPerformanceTableData(tableName, currentUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = this.sessionManager.getPage();
            if (!page) {
                throw new Error('Browser não está inicializado');
            }
            try {
                console.log('🎯 Iniciando extração específica para Driver Performance...');
                // 🔍 PRIMEIRO: Procurar e clicar no botão Search para carregar os dados
                console.log('🔍 Procurando botão Search para carregar dados...');
                const searchButtonSelectors = [
                    'button.fancyButton[ng-click="High_Cancellation()"]',
                    'button[ng-click="High_Cancellation()"]',
                    'button.fancyButton:has-text("Search")',
                    'button:has-text("Search")',
                    '.fancyButton:has-text("Search")'
                ];
                let searchButtonFound = false;
                for (const selector of searchButtonSelectors) {
                    try {
                        const button = yield page.$(selector);
                        if (button) {
                            console.log(`🔍 Botão Search encontrado: ${selector}`);
                            console.log('⚡ Clicando no botão Search para carregar dados...');
                            yield button.click();
                            searchButtonFound = true;
                            // Aguardar dados carregarem após o clique
                            console.log('⏳ Aguardando carregamento dos dados após clique...');
                            yield this.delay(3000); // Aguardar 3 segundos para carregar
                            break;
                        }
                    }
                    catch (error) {
                        console.log(`⚠️ Seletor de botão ${selector} não funcionou`);
                    }
                }
                if (!searchButtonFound) {
                    console.log('⚠️ Botão Search não encontrado - tentando aguardar dados direto...');
                }
                else {
                    console.log('✅ Botão Search clicado com sucesso!');
                }
                // 🔍 SEGUNDO: Aguardar elementos da tabela carregarem
                console.log('🔍 Aguardando tabela Driver Performance carregar...');
                // Seletores específicos para Driver Performance baseado no HTML real
                const possibleSelectors = [
                    '#datatable2', // ID principal da tabela
                    'table#datatable2.table.t-fancy-table.table-striped', // Seletor completo
                    '.dataTables_wrapper table#datatable2', // Dentro do wrapper do DataTables
                    'table.t-fancy-table.table-striped.dataTable', // Classes da tabela
                    '.dataTables_scrollBody table', // Tabela dentro do scroll
                    'table[aria-describedby="datatable2_info"]' // Por atributo aria
                ];
                let workingSelector = '';
                let tableElement = null;
                // Aguardar especificamente elementos da Driver Performance
                try {
                    console.log('🔍 Aguardando wrapper da tabela...');
                    yield page.waitForSelector('#datatable2_wrapper', { timeout: 10000 });
                    console.log('✅ Driver Performance: wrapper da tabela encontrado');
                    // Aguardar dados carregarem (tempo maior após o clique)
                    console.log('🔍 Aguardando dados da tabela...');
                    yield page.waitForSelector('#datatable2 tbody tr', { timeout: 8000 });
                    console.log('✅ Driver Performance: dados da tabela carregados');
                }
                catch (error) {
                    console.log('⚠️ Driver Performance: timeout aguardando carregamento, tentando continuar...');
                }
                // 🔍 TERCEIRO: Encontrar qual seletor funciona
                for (const selector of possibleSelectors) {
                    try {
                        yield page.waitForSelector(selector, { timeout: 3000 });
                        tableElement = yield page.$(selector);
                        if (tableElement) {
                            workingSelector = selector;
                            console.log(`✅ Driver Performance: usando seletor ${selector}`);
                            break;
                        }
                    }
                    catch (error) {
                        console.log(`⚠️ Seletor ${selector} não encontrado`);
                    }
                }
                if (!workingSelector || !tableElement) {
                    console.log('❌ Nenhuma tabela encontrada na página Driver Performance');
                    console.log('🔄 Tentando recarregar a página e repetir o processo...');
                    try {
                        // Usar método reload() nativo do Playwright que é mais confiável
                        console.log('⚡ Executando reload forçado da página...');
                        yield page.reload({ waitUntil: 'networkidle' });
                        // Aguardar um pouco após o reload
                        console.log('⏳ Aguardando página recarregar completamente...');
                        yield this.delay(4000);
                        // Verificar se ainda estamos na página correta, se não, navegar novamente
                        const reloadUrl = page.url();
                        console.log(`🔍 URL após reload: ${reloadUrl}`);
                        if (!reloadUrl.includes('high-cancellations')) {
                            console.log('📍 Navegando novamente para Driver Performance...');
                            yield page.goto('https://rides.ec2dashboard.com/#/app/high-cancellations/', { waitUntil: 'networkidle' });
                            yield this.delay(2000);
                        }
                        // SEGUNDA TENTATIVA: Procurar e clicar no botão Search novamente
                        console.log('🔍 SEGUNDA TENTATIVA: Procurando botão Search...');
                        let searchButtonFound = false;
                        for (const selector of searchButtonSelectors) {
                            try {
                                const button = yield page.$(selector);
                                if (button) {
                                    console.log(`🔍 Botão Search encontrado (2ª tentativa): ${selector}`);
                                    console.log('⚡ Clicando no botão Search novamente...');
                                    yield button.click();
                                    searchButtonFound = true;
                                    // Aguardar dados carregarem após o clique
                                    console.log('⏳ Aguardando carregamento dos dados (2ª tentativa)...');
                                    yield this.delay(5000); // Mais tempo na segunda tentativa
                                    break;
                                }
                            }
                            catch (error) {
                                console.log(`⚠️ Seletor de botão ${selector} não funcionou (2ª tentativa)`);
                            }
                        }
                        if (searchButtonFound) {
                            console.log('✅ Botão Search clicado na segunda tentativa!');
                            // Tentar encontrar a tabela novamente
                            for (const selector of possibleSelectors) {
                                try {
                                    yield page.waitForSelector(selector, { timeout: 5000 });
                                    tableElement = yield page.$(selector);
                                    if (tableElement) {
                                        workingSelector = selector;
                                        console.log(`✅ Driver Performance: tabela encontrada na 2ª tentativa com seletor ${selector}`);
                                        break;
                                    }
                                }
                                catch (error) {
                                    console.log(`⚠️ Seletor ${selector} não encontrado (2ª tentativa)`);
                                }
                            }
                        }
                    }
                    catch (reloadError) {
                        console.log('⚠️ Erro durante reload da página:', reloadError.message || reloadError);
                    }
                    // Se ainda não encontrou a tabela após a segunda tentativa
                    if (!workingSelector || !tableElement) {
                        console.log('❌ Driver Performance: tabela não encontrada mesmo após reload');
                        return {
                            name: tableName,
                            url: currentUrl,
                            headers: [],
                            rows: [],
                            isEmpty: true
                        };
                    }
                }
                // Aguardar dados carregarem especificamente
                yield this.delay(2000);
                // Extrair headers
                const headers = yield page.$$eval(`${workingSelector} thead th, ${workingSelector} th`, ths => ths.map(th => {
                    var _a;
                    const text = ((_a = th.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                    return text.replace(/\s+/g, ' ').replace(/\n/g, ' ');
                }).filter(text => text.length > 0)).catch(() => {
                    console.log('⚠️ Headers não encontrados para Driver Performance');
                    return [];
                });
                // Extrair dados das linhas usando múltiplos seletores
                const rowSelectors = [
                    `${workingSelector} tbody tr[ng-repeat*="data"]`,
                    `${workingSelector} tbody tr[ng-repeat*="TableData"]`,
                    `${workingSelector} tbody tr`,
                    `${workingSelector} tr:not(:first-child)` // fallback
                ];
                let rows = [];
                for (const rowSelector of rowSelectors) {
                    try {
                        rows = yield page.$$eval(rowSelector, trs => trs.map(tr => {
                            var _a;
                            // Se a linha contém a mensagem de "No data available", retorna uma linha vazia
                            if (((_a = tr.textContent) === null || _a === void 0 ? void 0 : _a.trim()) === 'No data available in table') {
                                return [];
                            }
                            const cells = tr.querySelectorAll('td');
                            return Array.from(cells).map(td => {
                                var _a;
                                const text = ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                                return text.replace(/\s+/g, ' ').replace(/\n/g, ' ');
                            }).filter(text => text.length > 0);
                        }).filter(row => row.length > 0));
                        if (rows.length > 0) {
                            console.log(`✅ Driver Performance: ${rows.length} linhas extraídas com seletor ${rowSelector}`);
                            break;
                        }
                    }
                    catch (error) {
                        console.log(`⚠️ Erro com seletor de linhas ${rowSelector}`);
                    }
                }
                console.log(`📊 Driver Performance - Headers: ${headers.length}, Rows: ${rows.length}`);
                if (rows.length > 0) {
                    console.log(`[DEBUG] Driver Performance - Primeira linha de exemplo:`, rows[0]);
                    console.log(`[DEBUG] Driver Performance - Headers extraídos:`, headers);
                }
                return {
                    name: tableName,
                    url: currentUrl,
                    headers: headers,
                    rows: rows,
                    isEmpty: rows.length === 0
                };
            }
            catch (error) {
                console.error(`❌ Erro na extração específica da Driver Performance:`, error.message);
                return {
                    name: tableName,
                    url: currentUrl,
                    headers: [],
                    rows: [],
                    isEmpty: true
                };
            }
        });
    }
    /**
     * Processa dados de Driver Performance em formato estruturado
     */
    processDriverPerformanceData(tableData) {
        const performanceData = [];
        if (!tableData || tableData.isEmpty || tableData.rows.length === 0) {
            console.log('⚠️ Nenhum dado de performance para processar');
            return performanceData;
        }
        console.log(`🔄 Processando ${tableData.rows.length} registros de Driver Performance...`);
        const headers = tableData.headers;
        for (const row of tableData.rows) {
            try {
                const obj = rowToObject(headers, row);
                // Garantir que temos pelo menos os dados mínimos (ID e nome)
                if (!obj['Driver ID'] || !obj['Driver Name']) {
                    console.log('⚠️ Registro inválido ignorado - falta ID ou nome:', obj);
                    continue;
                }
                const performance = {
                    driver_id: obj['Driver ID'] || '',
                    driver_name: obj['Driver Name'] || '',
                    phone_number: obj['Phone Number'] || '',
                    request_sent: parseInt(obj['Request Sent'] || '0') || 0,
                    requests_received: parseInt(obj['Requests Received'] || '0') || 0,
                    user_cancelled_rides: parseInt(obj['User Cancelled Rides'] || '0') || 0,
                    user_cancelled_ride_cash: parseInt(obj['User Cancelled Ride (cash)'] || '0') || 0,
                    user_cancelled_ride_wallet: parseInt(obj['User Cancelled Ride (wallet)'] || '0') || 0,
                    driver_cancelled_rides: parseInt(obj['Driver Cancelled Rides'] || '0') || 0,
                    driver_cancelled_ride_cash: parseInt(obj['Driver Cancelled Ride (cash)'] || '0') || 0,
                    driver_cancelled_ride_wallet: parseInt(obj['Driver Cancelled Ride (wallet)'] || '0') || 0,
                    rejected_rides: parseInt(obj['Rejected Rides'] || '0') || 0,
                    success_rides: parseInt(obj['Success Rides'] || '0') || 0,
                    missed_rides: parseInt(obj['Missed Rides'] || '0') || 0,
                    active_days: parseInt(obj['Active Days'] || '0') || 0,
                    online_hours: parseFloat(obj['Online Hours'] || '0') || 0,
                    d2c_referral: parseInt(obj['D2C Referral'] || '0') || 0,
                    d2d_referral: parseInt(obj['D2D Referral'] || '0') || 0,
                    start_end_cheating_rides: parseInt(obj['Start End Cheating Rides'] || '0') || 0,
                    manual_start_end_cheating_rides: parseInt(obj['Manual Start End Cheating Rides'] || '0') || 0,
                    vehicle: obj['Vehicle'] || ''
                };
                performanceData.push(performance);
            }
            catch (error) {
                console.log('❌ Erro processando linha de performance:', error.message, row);
            }
        }
        console.log(`✅ ${performanceData.length} registros de Driver Performance processados`);
        return performanceData;
    }
    /**
     * Obtém as páginas de drivers configuradas
     */
    getDriversPages() {
        return this.driversPages;
    }
    /**
     * Fecha a sessão do browser (compartilhada com rides)
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🧹 Cleanup de drivers (sessão compartilhada)...');
            // Não fechamos o browser aqui pois é compartilhado com rides
        });
    }
}
exports.DriversPersistentScraper = DriversPersistentScraper;
// 🔥 DRIVERS SEMPRE DEVEM PULAR LOGIN (runs após rides)
DriversPersistentScraper.ALWAYS_SKIP_LOGIN = true;
/**
 * Função principal para scraping de drivers (interface compatível com rides)
 */
function scrapeAllDriversDataPersistent() {
    return __awaiter(this, arguments, void 0, function* (skipLoginVerification = false) {
        console.log('🚗🔧 DRIVERS SEMPRE SKIPA LOGIN - Executando função wrapper...');
        const scraper = new DriversPersistentScraper();
        // Sempre true para drivers já que eles executam DEPOIS das rides
        return yield scraper.scrapeAllDriversData(true);
    });
}
