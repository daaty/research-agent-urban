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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversDataTransformer = void 0;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// === LOGGING UNIVERSAL PARA DEBUG ===
const logFilePath = path_1.default.resolve(__dirname, '../../driver_transformer_debug.log');
const logStream = fs_1.default.createWriteStream(logFilePath, { flags: 'a' });
function logToFile(type, ...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] [${type}] ${msg}\n`);
}
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
console.log = (...args) => {
    logToFile('LOG', ...args);
    origLog(...args);
};
console.warn = (...args) => {
    logToFile('WARN', ...args);
    origWarn(...args);
};
console.error = (...args) => {
    logToFile('ERROR', ...args);
    origError(...args);
};
const databaseManager_1 = require("./databaseManager");
class DriversDataTransformer {
    constructor() {
        this.databaseManager = databaseManager_1.DatabaseManager.getInstance();
    }
    static getInstance() {
        if (!DriversDataTransformer.instance) {
            DriversDataTransformer.instance = new DriversDataTransformer();
        }
        return DriversDataTransformer.instance;
    }
    /**
     * Transforma dados do scraping de drivers seguindo o PADRÃO DO RIDES SCRAPER
     * ✅ NOVA LÓGICA: Estrutura consistente igual ao rides_data
     */
    transformScrapingData(scrapingData, sessionInfo, executionSource = 'drivers-persistent-scraper', hasChanges = true) {
        const records = [];
        let totalRecords = 0;
        let newRecords = 0;
        console.log('🔄 [DRIVERS TRANSFORMER] Iniciando transformação seguindo padrão do rides scraper...');
        // Transformar cada tabela em registros do banco
        scrapingData.forEach(table => {
            var _a;
            console.log(`📊 [DRIVERS TRANSFORMER] Processando tabela: ${table.name}`);
            // Verificar se a tabela tem dados válidos
            if (!table.isEmpty &&
                table.rows.length > 0 &&
                table.name &&
                table.name.trim() !== '') {
                // ✅ VALIDAÇÃO CRÍTICA: Ignorar tabelas que só contêm "No data available"
                const hasValidData = table.rows.some(row => row.length > 1 ||
                    (row.length === 1 && !row[0].includes('No data available')));
                if (!hasValidData) {
                    console.log(`⚠️ [DRIVERS TRANSFORMER] Tabela ${table.name} ignorada: apenas "No data available"`);
                    return; // Pular esta tabela completamente
                }
                // ✅ VALIDAÇÃO ESPECÍFICA PARA DRIVER PERFORMANCE
                if (table.name.includes('Driver Performance')) {
                    const allRowsEmpty = table.rows.every(row => row.length === 1 && row[0].includes('No data available'));
                    if (allRowsEmpty) {
                        console.log(`⚠️ [DRIVERS TRANSFORMER] Driver Performance ignorada: sem dados válidos`);
                        return; // Pular completamente Driver Performance vazia
                    }
                }
                // Processar cada linha da tabela como um registro individual
                table.rows.forEach((row, rowIdx) => {
                    // ✅ VALIDAÇÃO: Ignorar linhas com "No data available"
                    if (row.length === 1 && row[0].includes('No data available')) {
                        console.log(`⚠️ [DRIVERS TRANSFORMER] Linha ignorada: "No data available"`);
                        return; // Pular esta linha
                    }
                    // LOG DETALHADO PARA DEBUG DE MAPEAMENTO
                    console.log(`[DEBUG] Linha ${rowIdx + 1}/${table.rows.length} (${table.name})`);
                    console.log('[DEBUG] Headers:', JSON.stringify(table.headers));
                    console.log('[DEBUG] Row:', JSON.stringify(row));
                    // ✅ EXTRAIR ID ÚNICO DO DRIVER (seguindo padrão do rides)
                    const driverId = this.extractDriverId(row, table.headers);
                    if (!driverId || driverId.trim() === '') {
                        console.warn(`[DRIVERS TRANSFORMER] Linha ignorada: driver_id vazio. Tabela: ${table.name}, Row: ${JSON.stringify(row)}`);
                        return;
                    }
                    // ✅ EXTRAIR INFORMAÇÕES BÁSICAS (como no rides)
                    const driverInfo = this.extractBasicDriverInfo(row, table.headers, table.name);
                    // additional_data: mapeamento 1:1 headers <-> row (PURO, sem campos extras)
                    const additional_data = table.headers.reduce((acc, header, idx) => {
                        acc[header] = row[idx] !== undefined ? row[idx] : null;
                        return acc;
                    }, {});
                    // LOG EXPLÍCITO PARA DEBUG
                    console.log('[DEBUG] additional_data gerado:', JSON.stringify(additional_data));
                    // HASH ÚNICO BASEADO EM TABLE + DRIVER_ID (igual ao rides)
                    const uniqueHash = (0, crypto_1.createHash)('md5')
                        .update(`${table.name}|${driverId}`)
                        .digest('hex');
                    // UNIQUE_ID PARA EVITAR DUPLICATAS
                    const uniqueId = this.generateDriverUniqueId(driverId, table.name);
                    // MAPEAR TIPO DE DADOS
                    const dataType = this.mapTableNameToDataType(table.name);
                    // CRIAR REGISTRO NO FORMATO DO BANCO
                    const record = {
                        driver_id: driverId,
                        name: driverInfo.name || '',
                        email: driverInfo.email || null,
                        mobile: driverInfo.mobile || null,
                        data_type: dataType,
                        page_source: table.name,
                        additional_data: additional_data, // Mapeamento 1:1 headers <-> row (PURO)
                        data_hash: uniqueHash,
                        session_info: sessionInfo,
                        source: executionSource,
                        unique_id: uniqueId
                    };
                    records.push(record);
                    totalRecords++;
                    if (hasChanges) {
                        newRecords++;
                    }
                    console.log(`✅ [DRIVERS TRANSFORMER] Registro criado: ${driverId} - ${driverInfo.name || 'Sem nome'}`);
                });
            }
            else {
                console.log(`⚠️ [DRIVERS TRANSFORMER] Tabela ignorada: ${table.name || 'sem nome'} (isEmpty: ${table.isEmpty}, rows: ${((_a = table.rows) === null || _a === void 0 ? void 0 : _a.length) || 0})`);
            }
        });
        // ✅ CRIAR SESSÃO DE SCRAPING (igual ao rides)
        const session = {
            total_records: totalRecords,
            new_records: newRecords,
            has_changes: hasChanges,
            execution_source: executionSource,
            browser_session_id: (sessionInfo === null || sessionInfo === void 0 ? void 0 : sessionInfo.browserSessionId) || null
        };
        console.log(`📊 [DRIVERS TRANSFORMER] Transformação concluída: ${totalRecords} registros processados`);
        return {
            records,
            session,
            totalRecords,
            newRecords
        };
    }
    /**
     * ✅ EXTRAI ID DO DRIVER usando detecção inteligente (não position-based)
     * Seguindo padrão do rides: busca por padrão, não por posição
     */
    extractDriverId(row, headers) {
        var _a;
        // Função para normalizar header
        const normalize = (str) => str
            .toLowerCase()
            .normalize('NFD').replace(/[ -- -- -- -- -- -- -- -- -- --]/g, '')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        // 1. Procurar por header "Driver ID" ou similar (variações)
        const driverIdIndex = headers.findIndex(header => {
            if (!header)
                return false;
            const h = normalize(header);
            return (h.includes('driver id') ||
                h === 'id' ||
                h === 'codigo' ||
                h === 'código' ||
                h === 'matricula' ||
                h === 'matrícula');
        });
        if (driverIdIndex >= 0 && driverIdIndex < row.length) {
            const candidateId = (_a = row[driverIdIndex]) === null || _a === void 0 ? void 0 : _a.trim();
            if (candidateId && /^\d{7,10}$/.test(candidateId)) {
                return candidateId;
            }
        }
        // 2. Buscar por padrão de ID de driver (7-10 dígitos, não telefone)
        for (const cell of row) {
            if (cell && /^\d{7,10}$/.test(cell) && !cell.startsWith('+') && !cell.startsWith('55')) {
                return cell;
            }
        }
        // 3. Fallback: primeiro item que parece ID
        for (const cell of row) {
            if (cell && /^\d+$/.test(cell) && cell.length >= 4) {
                return cell;
            }
        }
        return row[0] || ''; // Último recurso
    }
    /**
     * ✅ EXTRAI INFORMAÇÕES BÁSICAS DO DRIVER
     * Seguindo padrão do rides: detecção por padrão, não por posição
     */
    extractBasicDriverInfo(row, headers, tableName) {
        var _a, _b, _c;
        const info = {};
        // Função para normalizar header
        const normalize = (str) => str
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Buscar nome do driver (aceita variações)
        const nameIndex = headers.findIndex(header => {
            if (!header)
                return false;
            const h = normalize(header);
            return (h.includes('name') ||
                h.includes('nome') ||
                h === 'driver' ||
                h === 'motorista' ||
                h === 'condutor');
        });
        if (nameIndex >= 0 && nameIndex < row.length) {
            info.name = (_a = row[nameIndex]) === null || _a === void 0 ? void 0 : _a.trim();
        }
        else {
            info.name = row.find(cell => cell &&
                cell.length > 3 &&
                /[a-zA-Z\s]/.test(cell) &&
                !cell.includes('@') &&
                !cell.startsWith('+')) || '';
            if (!info.name)
                console.warn(`[DRIVERS TRANSFORMER] Nome não encontrado na linha:`, row);
        }
        // Buscar telefone (aceita variações)
        const phoneIndex = headers.findIndex(header => {
            if (!header)
                return false;
            const h = normalize(header);
            return (h.includes('phone') ||
                h.includes('mobile') ||
                h.includes('telefone') ||
                h.includes('celular'));
        });
        if (phoneIndex >= 0 && phoneIndex < row.length) {
            info.mobile = (_b = row[phoneIndex]) === null || _b === void 0 ? void 0 : _b.trim();
        }
        else {
            info.mobile = row.find(cell => cell && (cell.startsWith('+55') ||
                cell.startsWith('55') ||
                /^\+?\d{10,15}$/.test(cell))) || null;
            if (!info.mobile)
                console.warn(`[DRIVERS TRANSFORMER] Telefone não encontrado na linha:`, row);
        }
        // Buscar email (aceita variações)
        const emailIndex = headers.findIndex(header => {
            if (!header)
                return false;
            const h = normalize(header);
            return h.includes('email') || h === 'e-mail';
        });
        if (emailIndex >= 0 && emailIndex < row.length) {
            info.email = (_c = row[emailIndex]) === null || _c === void 0 ? void 0 : _c.trim();
        }
        else {
            info.email = row.find(cell => cell && cell.includes('@') && cell.includes('.')) || null;
            if (!info.email)
                console.warn(`[DRIVERS TRANSFORMER] Email não encontrado na linha:`, row);
        }
        return info;
    }
    /**
     * ✅ GERA ID ÚNICO PARA EVITAR DUPLICATAS
     */
    generateDriverUniqueId(driverId, tableName) {
        return (0, crypto_1.createHash)('md5')
            .update(`${tableName}|${driverId}|${Date.now()}`)
            .digest('hex');
    }
    /**
     * ✅ MAPEIA NOME DA TABELA PARA TIPO DE DADOS
     */
    mapTableNameToDataType(tableName) {
        const typeMap = {
            'Active Drivers': 'active',
            'Deactive Drivers': 'deactive',
            'Drivers Enrollment': 'enrollment',
            'Leaderboard': 'leaderboard',
            'Driver Performance': 'performance'
        };
        return typeMap[tableName] || 'unknown';
    }
    /**
     * ✅ TRANSFORMA E SALVA NO BANCO (método principal)
     */
    transformAndSave(scrapingData_1, sessionInfo_1) {
        return __awaiter(this, arguments, void 0, function* (scrapingData, sessionInfo, executionSource = 'drivers-persistent-scraper', hasChanges = true) {
            console.log('🔄 [DRIVERS TRANSFORMER] Iniciando transformação e salvamento...');
            // Transformar dados
            const transformedData = this.transformScrapingData(scrapingData, sessionInfo, executionSource, hasChanges);
            try {
                // Salvar no banco de dados
                if (transformedData.records.length > 0) {
                    console.log(`💾 [DRIVERS TRANSFORMER] Salvando ${transformedData.records.length} registros no banco...`);
                    yield this.databaseManager.insertDriverData(transformedData.records);
                    console.log('✅ [DRIVERS TRANSFORMER] Dados salvos com sucesso no banco!');
                }
                else {
                    console.log('⚠️ [DRIVERS TRANSFORMER] Nenhum registro para salvar');
                }
                // Criar sessão de scraping
                if (transformedData.session) {
                    console.log('📊 [DRIVERS TRANSFORMER] Criando sessão de scraping...');
                    yield this.databaseManager.createScrapingSession(transformedData.session);
                    console.log('✅ [DRIVERS TRANSFORMER] Sessão de scraping criada!');
                }
            }
            catch (error) {
                console.error('❌ [DRIVERS TRANSFORMER] Erro ao salvar no banco:', error.message);
                throw error;
            }
            return transformedData;
        });
    }
}
exports.DriversDataTransformer = DriversDataTransformer;
