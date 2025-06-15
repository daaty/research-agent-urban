import { chromium, Browser, Page } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

interface CancelledRideData {
    [key: string]: any;
}

export class FocusCancelledRidesScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async initialize() {
        console.log('🚀 Inicializando browser para FOCAR NA ABA CANCELADOS...');
        
        this.browser = await chromium.launch({
            headless: process.env.HEADLESS_MODE === 'true',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Configurar viewport e user agent
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    async login() {
        if (!this.page) throw new Error('Page not initialized');

        console.log('🔐 Fazendo login no sistema...');
        
        try {
            await this.page.goto('https://rides.urban.com.br/app/login', { 
                waitUntil: 'networkidle',
                timeout: 60000 
            });

            console.log('📄 Página de login carregada');

            // Preencher credenciais
            await this.page.fill('input[name="email"]', process.env.RIDES_EMAIL || '');
            await this.page.fill('input[name="password"]', process.env.RIDES_PASSWORD || '');
            
            console.log('✅ Credenciais preenchidas');

            // Fazer login
            await this.page.click('button[type="submit"]');
            
            // Aguardar redirecionamento
            await this.page.waitForURL('**/dashboard**', { timeout: 30000 });
            
            console.log('🎉 Login realizado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    }

    async focusOnCancelledTab() {
        if (!this.page) throw new Error('Page not initialized');

        console.log('🎯 FOCANDO NA ABA CANCELADOS...');
        
        try {
            // Navegar para a aba cancelados
            console.log('📍 Navegando para aba Cancelados...');
            await this.page.click('a[href="#cancelled"]');
            
            // Aguardar um pouco para a aba carregar
            await this.page.waitForTimeout(3000);
            
            console.log('✅ Aba Cancelados clicada');

            // Aguardar a tabela aparecer
            console.log('⏳ Aguardando tabela de cancelados carregar...');
            
            // Tentar múltiplos seletores para a tabela
            const possibleSelectors = [
                '#cancelled table',
                '#cancelled .dataTables_wrapper table',
                '#cancelled tbody',
                'table[id*="cancelled"]',
                'table[class*="cancelled"]',
                '.tab-pane.active table',
                'div[id="cancelled"] table'
            ];

            let tableFound = false;
            let tableSelector = '';

            for (const selector of possibleSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    tableFound = true;
                    tableSelector = selector;
                    console.log(`✅ Tabela encontrada com seletor: ${selector}`);
                    break;
                } catch (e) {
                    console.log(`❌ Seletor ${selector} não encontrou tabela`);
                }
            }

            if (!tableFound) {
                console.log('⚠️ Nenhuma tabela encontrada com seletores padrão. Vamos investigar o HTML...');
            }

            return tableSelector;

        } catch (error) {
            console.error('❌ Erro ao focar na aba cancelados:', error);
            throw error;
        }
    }

    async investigatePageContent() {
        if (!this.page) throw new Error('Page not initialized');

        console.log('🔍 INVESTIGANDO CONTEÚDO COMPLETO DA PÁGINA...');

        try {
            // Aguardar mais tempo para garantir carregamento completo
            console.log('⏳ Aguardando 10 segundos para carregamento completo...');
            await this.page.waitForTimeout(10000);

            // Verificar se estamos na aba correta
            const currentUrl = this.page.url();
            console.log('🌐 URL atual:', currentUrl);

            // Verificar se a aba cancelados está ativa
            const activeTabs = await this.page.$$eval('.nav-tabs a', tabs => 
                tabs.map(tab => ({
                    text: tab.textContent?.trim(),
                    href: tab.getAttribute('href'),
                    isActive: tab.classList.contains('active')
                }))
            );
            console.log('📋 Abas disponíveis:', JSON.stringify(activeTabs, null, 2));

            // Verificar o HTML completo da div cancelled
            const cancelledContent = await this.page.$eval('#cancelled', el => el.innerHTML).catch(() => null);
            if (cancelledContent) {
                console.log('📄 HTML da div #cancelled (primeiros 2000 chars):');
                console.log(cancelledContent.substring(0, 2000));
            } else {
                console.log('❌ Div #cancelled não encontrada');
            }

            // Verificar todas as tabelas na página
            const allTables = await this.page.$$eval('table', tables => 
                tables.map((table, index) => ({
                    index,
                    id: table.id,
                    className: table.className,
                    innerHTML: table.innerHTML.substring(0, 500) // Primeiros 500 chars
                }))
            );
            console.log('📊 Todas as tabelas encontradas na página:');
            console.log(JSON.stringify(allTables, null, 2));

            // Verificar elementos com ng-repeat
            const ngRepeatElements = await this.page.$$eval('[ng-repeat]', elements => 
                elements.map((el, index) => ({
                    index,
                    tagName: el.tagName,
                    ngRepeat: el.getAttribute('ng-repeat'),
                    textContent: el.textContent?.trim().substring(0, 100),
                    innerHTML: el.innerHTML.substring(0, 200)
                }))
            ).catch(() => []);
            console.log('🔄 Elementos com ng-repeat:');
            console.log(JSON.stringify(ngRepeatElements, null, 2));

            // Verificar se há dados carregando
            const loadingElements = await this.page.$$eval('[class*="loading"], [class*="spinner"], .dataTables_processing', elements => 
                elements.map(el => ({
                    className: el.className,
                    textContent: el.textContent?.trim(),
                    visible: el.offsetParent !== null
                }))
            ).catch(() => []);
            console.log('⏳ Elementos de loading:');
            console.log(JSON.stringify(loadingElements, null, 2));

            // Verificar mensagens de "no data"
            const noDataElements = await this.page.$$eval('[class*="empty"], .dataTables_empty, [class*="no-data"]', elements => 
                elements.map(el => ({
                    className: el.className,
                    textContent: el.textContent?.trim(),
                    visible: el.offsetParent !== null
                }))
            ).catch(() => []);
            console.log('🚫 Elementos de "sem dados":');
            console.log(JSON.stringify(noDataElements, null, 2));

        } catch (error) {
            console.error('❌ Erro ao investigar conteúdo:', error);
        }
    }

    async waitForDataToLoad() {
        if (!this.page) throw new Error('Page not initialized');

        console.log('⏳ AGUARDANDO DADOS CARREGAREM DINAMICAMENTE...');

        try {
            // Aguardar até 60 segundos para dados aparecerem
            const maxWaitTime = 60000; // 60 segundos
            const checkInterval = 2000; // 2 segundos
            let waited = 0;

            while (waited < maxWaitTime) {
                console.log(`⏱️ Aguardando dados... (${waited/1000}s/${maxWaitTime/1000}s)`);

                // Verificar se há dados na tabela
                const hasData = await this.page.evaluate(() => {
                    // Verificar múltiplos seletores para dados
                    const selectors = [
                        '#cancelled tbody tr:not(.dataTables_empty)',
                        '#cancelled [ng-repeat]',
                        '#cancelled table tbody tr',
                        'div[id="cancelled"] tbody tr'
                    ];

                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            // Verificar se não são elementos vazios
                            for (const el of elements) {
                                if (el.textContent && el.textContent.trim() !== '' && !el.textContent.includes('No data available')) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                });

                if (hasData) {
                    console.log('✅ Dados encontrados!');
                    break;
                }

                await this.page.waitForTimeout(checkInterval);
                waited += checkInterval;
            }

            if (waited >= maxWaitTime) {
                console.log('⚠️ Timeout aguardando dados. Continuando com o que temos...');
            }

        } catch (error) {
            console.error('❌ Erro aguardando dados:', error);
        }
    }

    async extractAllData() {
        if (!this.page) throw new Error('Page not initialized');

        console.log('📊 EXTRAINDO TODOS OS DADOS DA ABA CANCELADOS...');

        try {
            // Extrair dados de todas as formas possíveis
            const extractedData: any = {};

            // 1. Extrair via seletores de tabela
            console.log('🔍 Tentativa 1: Extraindo via seletores de tabela...');
            const tableData = await this.page.evaluate(() => {
                const tables = document.querySelectorAll('#cancelled table, div[id="cancelled"] table');
                const results: any[] = [];

                tables.forEach((table, tableIndex) => {
                    const rows = table.querySelectorAll('tbody tr');
                    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim());
                    
                    const tableResult = {
                        tableIndex,
                        headers,
                        rows: []
                    };

                    rows.forEach((row, rowIndex) => {
                        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim());
                        if (cells.length > 0 && !cells.join('').includes('No data available')) {
                            (tableResult.rows as any[]).push({ rowIndex, cells });
                        }
                    });

                    results.push(tableResult);
                });

                return results;
            });
            extractedData.tableData = tableData;
            console.log('📋 Dados extraídos via tabela:', JSON.stringify(tableData, null, 2));

            // 2. Extrair via ng-repeat
            console.log('🔍 Tentativa 2: Extraindo via ng-repeat...');
            const ngRepeatData = await this.page.evaluate(() => {
                const ngElements = document.querySelectorAll('#cancelled [ng-repeat], div[id="cancelled"] [ng-repeat]');
                return Array.from(ngElements).map((el, index) => ({
                    index,
                    ngRepeat: el.getAttribute('ng-repeat'),
                    textContent: el.textContent?.trim(),
                    innerHTML: el.innerHTML
                }));
            });
            extractedData.ngRepeatData = ngRepeatData;
            console.log('🔄 Dados extraídos via ng-repeat:', JSON.stringify(ngRepeatData, null, 2));

            // 3. Extrair todo o conteúdo textual da aba
            console.log('🔍 Tentativa 3: Extraindo todo conteúdo textual...');
            const allTextContent = await this.page.$eval('#cancelled', el => el.textContent).catch(() => 'Conteúdo não encontrado');
            extractedData.allTextContent = allTextContent;
            console.log('📝 Todo o conteúdo textual da aba:', allTextContent.substring(0, 1000));

            // 4. Extrair elementos com dados visíveis
            console.log('🔍 Tentativa 4: Extraindo elementos com dados visíveis...');
            const visibleData = await this.page.evaluate(() => {
                const cancelledDiv = document.querySelector('#cancelled');
                if (!cancelledDiv) return [];

                const allElements = cancelledDiv.querySelectorAll('*');
                const visibleElements: any[] = [];

                allElements.forEach(el => {
                    if (el.offsetParent !== null && el.textContent && el.textContent.trim() !== '') {
                        visibleElements.push({
                            tagName: el.tagName,
                            className: el.className,
                            textContent: el.textContent.trim().substring(0, 200),
                            innerHTML: el.innerHTML.substring(0, 300)
                        });
                    }
                });

                return visibleElements;
            });
            extractedData.visibleData = visibleData.slice(0, 20); // Limitar a 20 elementos para não poluir
            console.log('👁️ Elementos visíveis (primeiros 20):', JSON.stringify(visibleData.slice(0, 20), null, 2));

            return extractedData;

        } catch (error) {
            console.error('❌ Erro ao extrair dados:', error);
            return { error: error.message };
        }
    }

    async run() {
        try {
            console.log('🚀 INICIANDO FOCO TOTAL NA ABA CANCELADOS...');
            
            await this.initialize();
            await this.login();
            
            const tableSelector = await this.focusOnCancelledTab();
            
            await this.investigatePageContent();
            await this.waitForDataToLoad();
            
            const allData = await this.extractAllData();
            
            console.log('🎯 RESULTADO FINAL - TUDO DA ABA CANCELADOS:');
            console.log('='.repeat(80));
            console.log(JSON.stringify(allData, null, 2));
            console.log('='.repeat(80));
            
            return allData;
            
        } catch (error) {
            console.error('💥 Erro geral no scraper focado:', error);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🏁 Browser fechado');
            }
        }
    }
}

// Função para executar o scraper
export async function runFocusCancelledScraper() {
    const scraper = new FocusCancelledRidesScraper();
    return await scraper.run();
}

// Execução direta se chamado como script
if (require.main === module) {
    runFocusCancelledScraper()
        .then(data => {
            console.log('✅ Scraper executado com sucesso!');
            console.log('📊 Dados extraídos:', JSON.stringify(data, null, 2));
        })
        .catch(error => {
            console.error('❌ Erro na execução:', error);
            process.exit(1);
        });
}
