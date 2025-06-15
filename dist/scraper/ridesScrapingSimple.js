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
exports.scrapeAllRidesData = scrapeAllRidesData;
const playwright_1 = require("playwright");
function scrapeAllRidesData() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        let browser;
        try {
            const email = process.env.RIDES_EMAIL || '';
            const password = process.env.RIDES_PASSWORD || '';
            const headless = process.env.HEADLESS_MODE === 'true';
            if (!email || !password) {
                throw new Error('Credenciais não configuradas nas variáveis de ambiente');
            }
            console.log('🚀 Iniciando browser para scraping completo...');
            console.log('🔧 Modo headless:', headless);
            browser = yield playwright_1.chromium.launch({
                headless: headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // PASSO 1: LOGIN
            console.log('🔐 Fazendo login...');
            yield page.goto('https://rides.ec2dashboard.com/#/page/login', {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            // Aguardar os campos de login aparecerem
            console.log('⏳ Aguardando campos de login...');
            yield page.waitForSelector('#exampleInputEmail1', { timeout: 15000 });
            yield page.waitForSelector('#exampleInputPassword1', { timeout: 15000 });
            // Preencher credenciais com mais cuidado
            console.log('📝 Preenchendo credenciais...');
            // Limpar e preencher email
            yield page.click('#exampleInputEmail1');
            yield page.keyboard.press('Control+a');
            yield page.keyboard.press('Delete');
            yield page.type('#exampleInputEmail1', email, { delay: 50 });
            yield page.waitForTimeout(500);
            // Limpar e preencher senha
            yield page.click('#exampleInputPassword1');
            yield page.keyboard.press('Control+a');
            yield page.keyboard.press('Delete');
            yield page.type('#exampleInputPassword1', password, { delay: 50 });
            yield page.waitForTimeout(500);
            // Verificar se os campos foram preenchidos
            const emailValue = yield page.inputValue('#exampleInputEmail1');
            const passwordValue = yield page.inputValue('#exampleInputPassword1');
            console.log('📧 Email preenchido:', emailValue);
            console.log('🔒 Password preenchido:', passwordValue ? 'Sim (oculto)' : 'Não');
            if (!emailValue || !passwordValue) {
                throw new Error('Falha ao preencher credenciais');
            }
            // Aguardar um pouco antes de submeter
            yield page.waitForTimeout(1000);
            // Tentar múltiplos seletores para o botão de login
            console.log('🔍 Procurando botão de login...');
            let loginButton = null;
            // Tentar diferentes seletores
            const buttonSelectors = [
                'button[type="submit"]',
                '.fancyButton',
                'button:has-text("Login")',
                'input[type="submit"]',
                '.btn-primary',
                'button.btn'
            ];
            for (const selector of buttonSelectors) {
                loginButton = yield page.$(selector);
                if (loginButton) {
                    console.log(`✅ Botão de login encontrado com seletor: ${selector}`);
                    break;
                }
            }
            if (loginButton) {
                console.log('🎯 Clicando no botão de login...');
                yield loginButton.click();
                yield page.waitForTimeout(2000);
            }
            else {
                console.log('⚠️  Botão não encontrado, tentando Enter...');
                yield page.press('#exampleInputPassword1', 'Enter');
                yield page.waitForTimeout(2000);
            }
            // Aguardar redirecionamento com múltiplas verificações
            console.log('⏳ Aguardando redirecionamento...');
            let attempts = 0;
            const maxAttempts = 10;
            while (attempts < maxAttempts) {
                yield page.waitForTimeout(1000);
                const currentUrl = page.url();
                console.log(`🌐 Tentativa ${attempts + 1}: URL atual: ${currentUrl}`);
                if (!currentUrl.includes('login')) {
                    console.log('✅ Login bem-sucedido! Redirecionamento detectado.');
                    break;
                }
                attempts++;
            }
            // Verificação final
            const finalUrl = page.url();
            console.log('🌐 URL final após login:', finalUrl);
            if (finalUrl.includes('login')) {
                // Tentar verificar se há mensagem de erro
                const errorMessages = yield page.$$eval('.alert, .error, .danger', els => els.map(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).filter(text => text));
                if (errorMessages.length > 0) {
                    console.log('❌ Mensagens de erro encontradas:', errorMessages);
                }
                yield browser.close();
                return {
                    success: false,
                    data: [],
                    message: 'Falha no login - ainda na página de login'
                };
            }
            console.log('✅ Login bem-sucedido! Iniciando extração das abas...');
            // PASSO 2: NAVEGAR E EXTRAIR DADOS DE CADA ABA
            const ridesPages = [
                { name: 'Ongoing Rides', url: 'https://rides.ec2dashboard.com/#/app/ongoing-rides/' },
                { name: 'Scheduled Rides', url: 'https://rides.ec2dashboard.com/#/app/scheduled-rides/' },
                { name: 'Completed Rides', url: 'https://rides.ec2dashboard.com/#/app/completed-rides/' },
                { name: 'Cancelled Rides', url: 'https://rides.ec2dashboard.com/#/app/cancelled-rides/4/' },
                { name: 'Missed Rides', url: 'https://rides.ec2dashboard.com/#/app/missed-rides/3/' }
            ];
            const allData = [];
            for (const ridePage of ridesPages) {
                console.log(`\n🔍 Navegando para: ${ridePage.name}...`);
                console.log(`🌐 URL: ${ridePage.url}`);
                try {
                    yield page.goto(ridePage.url, {
                        waitUntil: 'networkidle',
                        timeout: 30000
                    });
                    // Aguardar mais tempo para tabela carregar completamente
                    console.log(`⏳ Aguardando ${ridePage.name} carregar por 8 segundos...`);
                    yield page.waitForTimeout(8000);
                    // Tentar aguardar elementos específicos aparecerem
                    try {
                        console.log(`🔄 Aguardando dados carregarem em ${ridePage.name}...`);
                        // Aguardar até que não haja mais texto "Nenhum dado disponível" OU que apareçam linhas de dados
                        yield page.waitForFunction(() => {
                            const table = document.querySelector('table.t-fancy-table tbody');
                            if (!table)
                                return false;
                            // Se há linhas com dados (não só a mensagem de vazio)
                            const dataRows = table.querySelectorAll('tr:not(.odd):not(.even), tr.odd, tr.even');
                            const hasDataRows = Array.from(dataRows).some(row => {
                                const isEmpty = row.querySelector('td.dataTables_empty');
                                return !isEmpty && row.querySelectorAll('td').length > 1;
                            });
                            return hasDataRows || document.querySelector('td.dataTables_empty');
                        }, {}, 10000).catch(() => {
                            console.log(`⚠️  Timeout aguardando dados em ${ridePage.name}, continuando...`);
                        });
                    }
                    catch (waitError) {
                        console.log(`⚠️  Erro aguardando dados em ${ridePage.name}:`, waitError.message);
                    }
                    // Aguardar mais um pouco após o carregamento
                    yield page.waitForTimeout(2000);
                    console.log(`📊 Procurando tabela em ${ridePage.name}...`);
                    // Tentar encontrar a tabela
                    const tableExists = yield page.$('table.t-fancy-table');
                    if (!tableExists) {
                        console.log(`❌ Nenhuma tabela encontrada em ${ridePage.name}`);
                        allData.push({
                            name: ridePage.name,
                            url: ridePage.url,
                            headers: [],
                            rows: [],
                            isEmpty: true
                        });
                        continue;
                    }
                    console.log(`✅ Tabela encontrada em ${ridePage.name}`);
                    // Extrair headers
                    const headers = yield page.$$eval('table.t-fancy-table thead th', ths => ths.map(th => { var _a; return ((_a = th.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')) || ''; }));
                    console.log(`🔍 Headers encontrados (${headers.length}):`, headers.slice(0, 5)); // Mostrar só os primeiros 5
                    console.log(`🔎 Procurando dados em ${ridePage.name}...`);
                    // Aguardar um pouco mais antes de extrair dados
                    yield page.waitForTimeout(1000);
                    // DEBUG: Para Cancelled Rides, vamos capturar o HTML da tabela
                    if (ridePage.name === 'Cancelled Rides') {
                        const htmlContent = yield page.innerHTML('table.t-fancy-table tbody');
                        console.log(`� DEBUG - HTML do tbody de ${ridePage.name}:`, htmlContent.substring(0, 1000));
                    }
                    // Tentar múltiplas estratégias para capturar dados
                    let finalRows = [];
                    // Estratégia 1: Tentar capturar linhas do DataTables (específico)
                    try {
                        finalRows = yield page.$$eval('#ridesTable tbody tr, #ongoingRides tbody tr, .dataTables_scrollBody tbody tr', trs => {
                            return trs
                                .map(tr => {
                                // Ignorar linhas com mensagem "Nenhum dado disponível"
                                if (tr.querySelector('td.dataTables_empty')) {
                                    return null;
                                }
                                const tds = tr.querySelectorAll('td');
                                if (tds.length === 0)
                                    return null;
                                // Verificar se a linha tem conteúdo real (incluindo ng-binding)
                                const hasContent = Array.from(tds).some(td => {
                                    var _a;
                                    const text = ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                                    const hasNgBinding = td.classList.contains('ng-binding');
                                    return (text && text !== '--' && text !== '') || hasNgBinding;
                                });
                                if (!hasContent)
                                    return null;
                                return Array.from(tds).map(td => {
                                    var _a;
                                    let text = ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')) || '';
                                    // Remover múltiplas tags <font> aninhadas
                                    text = text.replace(/\s+/g, ' ').trim();
                                    return text;
                                });
                            })
                                .filter(row => row !== null && row.some(cell => cell.trim() !== '' && cell !== '--'));
                        });
                        if (finalRows.length > 0) {
                            console.log(`✅ Dados encontrados na estratégia 1 para ${ridePage.name}: ${finalRows.length} linhas`);
                        }
                    }
                    catch (err) {
                        console.log(`⚠️  Erro na estratégia 1 para ${ridePage.name}:`, err.message);
                    }
                    // Se não encontrou dados, tentar estratégia 2: seletores AngularJS específicos
                    if (finalRows.length === 0) {
                        try {
                            console.log(`🔄 Tentando estratégia 2 (AngularJS) para ${ridePage.name}...`);
                            finalRows = yield page.$$eval('tbody tr[ng-repeat*="data in"], tbody tr.ng-scope, tr[ng-repeat]', trs => {
                                return trs
                                    .map(tr => {
                                    // Verificar se é linha de dados válida
                                    if (tr.querySelector('td.dataTables_empty'))
                                        return null;
                                    const tds = tr.querySelectorAll('td');
                                    if (tds.length === 0)
                                        return null;
                                    // Verificar se tem dados reais
                                    const hasRealData = Array.from(tds).some(td => {
                                        var _a;
                                        const text = ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                                        const hasNgBinding = td.classList.contains('ng-binding');
                                        return hasNgBinding && text && text !== '--' && text !== '';
                                    });
                                    if (!hasRealData)
                                        return null;
                                    return Array.from(tds).map(td => {
                                        var _a;
                                        let text = ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')) || '';
                                        text = text.replace(/\s+/g, ' ').trim();
                                        return text;
                                    });
                                })
                                    .filter(row => row !== null && row.some(cell => cell.trim() !== '' && cell !== '--'));
                            });
                            if (finalRows.length > 0) {
                                console.log(`✅ Dados encontrados na estratégia 2 para ${ridePage.name}: ${finalRows.length} linhas`);
                            }
                        }
                        catch (err) {
                            console.log(`⚠️  Erro na estratégia 2 para ${ridePage.name}:`, err.message);
                        }
                    }
                    console.log(`📈 ${ridePage.name}: Encontrados ${finalRows.length} registros`);
                    // Log das primeiras linhas para debug
                    if (finalRows.length > 0) {
                        console.log(`🔍 Primeira linha de ${ridePage.name}:`, (_a = finalRows[0]) === null || _a === void 0 ? void 0 : _a.slice(0, 3)); // Primeiras 3 colunas
                        if (finalRows.length > 1) {
                            console.log(`🔍 Segunda linha de ${ridePage.name}:`, (_b = finalRows[1]) === null || _b === void 0 ? void 0 : _b.slice(0, 3)); // Primeiras 3 colunas
                        }
                    }
                    allData.push({
                        name: ridePage.name,
                        url: ridePage.url,
                        headers: headers,
                        rows: finalRows,
                        isEmpty: finalRows.length === 0
                    });
                }
                catch (error) {
                    console.error(`❌ Erro ao processar ${ridePage.name}:`, error.message);
                    allData.push({
                        name: ridePage.name,
                        url: ridePage.url,
                        headers: [],
                        rows: [],
                        isEmpty: true
                    });
                }
            }
            yield browser.close();
            const totalRecords = allData.reduce((sum, table) => sum + table.rows.length, 0);
            console.log(`\n🎉 Scraping concluído!`);
            console.log(`📊 Resumo: ${allData.length} abas processadas, ${totalRecords} registros extraídos`);
            return {
                success: true,
                data: allData,
                message: `Scraping concluído! ${allData.length} abas processadas, ${totalRecords} registros extraídos.`
            };
        }
        catch (error) {
            console.error('❌ Erro geral durante scraping:', error.message);
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                data: [],
                message: `Erro durante scraping: ${error.message}`
            };
        }
    });
}
