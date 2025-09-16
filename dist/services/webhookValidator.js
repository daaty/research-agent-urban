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
exports.WebhookValidator = void 0;
/**
 * 🔧 WebhookValidator - Valida e sanitiza payloads antes do envio
 */
class WebhookValidator {
    constructor(config) {
        this.config = Object.assign({ strictMode: true, sanitizeData: true, maxPayloadSize: 1024 * 1024, allowEmptyArrays: false, validateDataTypes: true, checkForDuplicates: true, requireMetadata: true }, config);
    }
    /**
     * 🔍 Validação principal do payload
     */
    validate(result) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const errors = [];
            const warnings = [];
            console.log('🔍 [WebhookValidator] Iniciando validação do payload...');
            try {
                // 1. Validar estrutura básica
                this.validateBasicStructure(result, errors);
                // 2. Validar consistência de hasChanges
                this.validateHasChangesConsistency(result, errors, warnings);
                // 3. Validar arrays de dados
                this.validateDataArrays(result, errors, warnings);
                // 4. Verificar duplicatas
                if (this.config.checkForDuplicates) {
                    this.checkForDuplicates(result, errors, warnings);
                }
                // 5. Validar tipos de dados
                if (this.config.validateDataTypes) {
                    this.validateDataTypes(result, errors, warnings);
                }
                // 6. Verificar tamanho do payload
                this.validatePayloadSize(result, errors, warnings);
                // 7. Sanitizar dados (se habilitado)
                let sanitizedPayload = result;
                if (this.config.sanitizeData) {
                    sanitizedPayload = this.sanitizePayload(result, warnings);
                }
                const validationTime = Date.now() - startTime;
                const payloadSize = this.calculatePayloadSize(result);
                const originalHashChanges = this.calculateHasChanges(result);
                const correctedHashChanges = this.calculateHasChanges(sanitizedPayload);
                const isValid = errors.filter(e => e.severity === 'critical').length === 0;
                console.log(`🔍 [WebhookValidator] Validação concluída em ${validationTime}ms`);
                console.log(`📊 [WebhookValidator] Payload: ${payloadSize} bytes, ${errors.length} erros, ${warnings.length} avisos`);
                return {
                    isValid,
                    errors,
                    warnings,
                    sanitizedPayload: this.config.sanitizeData ? sanitizedPayload : undefined,
                    metadata: {
                        validationTime,
                        payloadSize,
                        originalHashChanges,
                        correctedHashChanges,
                        sanitizationApplied: this.config.sanitizeData
                    }
                };
            }
            catch (validationError) {
                console.error('❌ [WebhookValidator] Erro durante validação:', validationError);
                errors.push({
                    field: 'validator',
                    message: `Erro interno do validador: ${(validationError === null || validationError === void 0 ? void 0 : validationError.message) || 'Erro desconhecido'}`,
                    severity: 'critical',
                    suggestion: 'Verifique a estrutura do payload ou contate o suporte'
                });
                return {
                    isValid: false,
                    errors,
                    warnings,
                    metadata: {
                        validationTime: Date.now() - startTime,
                        payloadSize: 0,
                        originalHashChanges: false,
                        correctedHashChanges: false,
                        sanitizationApplied: false
                    }
                };
            }
        });
    }
    /**
     * 🏗️ Validar estrutura básica do payload
     */
    validateBasicStructure(result, errors) {
        // Campos obrigatórios
        const requiredFields = ['timestamp', 'totalRecords', 'summary'];
        for (const field of requiredFields) {
            if (!(field in result) || result[field] === undefined || result[field] === null) {
                errors.push({
                    field: field,
                    message: `Campo obrigatório '${field}' ausente ou nulo`,
                    severity: 'critical',
                    suggestion: `Certifique-se de que o campo '${field}' está presente no payload`
                });
            }
        }
        // Validar timestamp
        if (result.timestamp && !this.isValidISO8601(result.timestamp)) {
            errors.push({
                field: 'timestamp',
                message: 'Timestamp não está no formato ISO8601 válido',
                severity: 'high',
                suggestion: 'Use new Date().toISOString() para gerar o timestamp'
            });
        }
        // Validar summary
        if (result.summary) {
            const summaryFields = ['newCount', 'updatedCount', 'cancelledCount', 'completedCount'];
            for (const field of summaryFields) {
                if (typeof result.summary[field] !== 'number' || result.summary[field] < 0) {
                    errors.push({
                        field: `summary.${field}`,
                        message: `Campo '${field}' deve ser um número não-negativo`,
                        severity: 'high',
                        suggestion: `Defina '${field}' como 0 se não houver registros deste tipo`
                    });
                }
            }
        }
    }
    /**
     * ⚖️ Validar consistência entre hasChanges e contadores
     */
    validateHasChangesConsistency(result, errors, warnings) {
        if (!result.summary)
            return;
        const actualChanges = this.calculateHasChanges(result);
        const declaredChanges = result.hasChanges;
        // Se hasChanges está presente no payload
        if (typeof declaredChanges === 'boolean') {
            if (declaredChanges !== actualChanges) {
                if (declaredChanges && !actualChanges) {
                    // hasChanges = true mas sem mudanças reais
                    errors.push({
                        field: 'hasChanges',
                        message: 'hasChanges=true mas não há mudanças reais detectadas',
                        severity: 'critical',
                        suggestion: 'Defina hasChanges=false ou remova registros vazios dos arrays'
                    });
                }
                else if (!declaredChanges && actualChanges) {
                    // hasChanges = false mas há mudanças
                    warnings.push({
                        field: 'hasChanges',
                        message: 'hasChanges=false mas há mudanças detectadas',
                        suggestion: 'Defina hasChanges=true para refletir as mudanças reais'
                    });
                }
            }
        }
    }
    /**
     * 📋 Validar arrays de dados
     */
    validateDataArrays(result, errors, warnings) {
        const arrayFields = ['newRecords', 'updatedRecords', 'cancelledRecords', 'completedRecords'];
        for (const fieldName of arrayFields) {
            const array = result[fieldName];
            // Verificar se é array
            if (array && !Array.isArray(array)) {
                errors.push({
                    field: fieldName,
                    message: `${fieldName} deve ser um array`,
                    severity: 'critical',
                    suggestion: `Defina ${fieldName} como [] se não houver registros`
                });
                continue;
            }
            // Verificar arrays vazios (se não permitido)
            if (!this.config.allowEmptyArrays && Array.isArray(array) && array.length === 0) {
                const expectedCount = this.getExpectedCountForField(fieldName, result.summary);
                if (expectedCount > 0) {
                    warnings.push({
                        field: fieldName,
                        message: `${fieldName} está vazio mas summary indica ${expectedCount} registros`,
                        suggestion: `Popule ${fieldName} com os registros correspondentes ou ajuste o contador`
                    });
                }
            }
            // Validar estrutura dos registros
            if (Array.isArray(array) && array.length > 0) {
                this.validateRecordStructure(array, fieldName, errors, warnings);
            }
        }
    }
    /**
     * 🔍 Verificar registros duplicados
     */
    checkForDuplicates(result, errors, warnings) {
        const allRecords = [
            ...(result.newRecords || []),
            ...(result.updatedRecords || []),
            ...(result.cancelledRecords || []),
            ...(result.completedRecords || [])
        ];
        const seenIds = new Set();
        const duplicateIds = new Set();
        for (const record of allRecords) {
            if (record.id) {
                if (seenIds.has(record.id)) {
                    duplicateIds.add(record.id);
                }
                else {
                    seenIds.add(record.id);
                }
            }
        }
        if (duplicateIds.size > 0) {
            errors.push({
                field: 'records',
                message: `Registros duplicados encontrados: ${Array.from(duplicateIds).join(', ')}`,
                severity: 'high',
                suggestion: 'Remova registros duplicados ou certifique-se de que cada registro tenha um ID único'
            });
        }
    }
    /**
     * 🔢 Validar tipos de dados
     */
    validateDataTypes(result, errors, warnings) {
        // Validar totalRecords
        if (typeof result.totalRecords !== 'number') {
            errors.push({
                field: 'totalRecords',
                message: 'totalRecords deve ser um número',
                severity: 'high',
                suggestion: 'Converta totalRecords para número usando Number() ou parseInt()'
            });
        }
        // Validar se totalRecords bate com a soma dos arrays
        const actualTotal = [
            ...(result.newRecords || []),
            ...(result.updatedRecords || []),
            ...(result.cancelledRecords || []),
            ...(result.completedRecords || [])
        ].length;
        if (result.totalRecords !== actualTotal) {
            warnings.push({
                field: 'totalRecords',
                message: `totalRecords (${result.totalRecords}) não bate com o total de registros nos arrays (${actualTotal})`,
                suggestion: 'Recalcule totalRecords ou ajuste os arrays'
            });
        }
    }
    /**
     * 📏 Validar tamanho do payload
     */
    validatePayloadSize(result, errors, warnings) {
        const payloadSize = this.calculatePayloadSize(result);
        if (payloadSize > this.config.maxPayloadSize) {
            errors.push({
                field: 'payload',
                message: `Payload muito grande: ${this.formatBytes(payloadSize)} (limite: ${this.formatBytes(this.config.maxPayloadSize)})`,
                severity: 'high',
                suggestion: 'Considere paginar os dados ou implementar compressão'
            });
        }
        else if (payloadSize > this.config.maxPayloadSize * 0.8) {
            warnings.push({
                field: 'payload',
                message: `Payload próximo do limite: ${this.formatBytes(payloadSize)}`,
                suggestion: 'Monitore o crescimento do payload para evitar problemas futuros'
            });
        }
    }
    /**
     * 🧹 Sanitizar dados sensíveis
     */
    sanitizePayload(result, warnings) {
        console.log('🧹 [WebhookValidator] Aplicando sanitização de dados...');
        const sanitized = JSON.parse(JSON.stringify(result)); // Deep clone
        let sanitizationApplied = false;
        const arrayFields = ['newRecords', 'updatedRecords', 'cancelledRecords', 'completedRecords'];
        for (const fieldName of arrayFields) {
            const array = sanitized[fieldName];
            if (Array.isArray(array)) {
                for (const record of array) {
                    // Sanitizar nomes (manter apenas primeira letra)
                    if (record.passenger && typeof record.passenger === 'string') {
                        const sanitizedName = this.sanitizeName(record.passenger);
                        if (sanitizedName !== record.passenger) {
                            record.passenger = sanitizedName;
                            sanitizationApplied = true;
                        }
                    }
                    if (record.driver && typeof record.driver === 'string') {
                        const sanitizedName = this.sanitizeName(record.driver);
                        if (sanitizedName !== record.driver) {
                            record.driver = sanitizedName;
                            sanitizationApplied = true;
                        }
                    }
                    // Sanitizar endereços (remover números)
                    if (record.origem && typeof record.origem === 'string') {
                        const sanitizedAddress = this.sanitizeAddress(record.origem);
                        if (sanitizedAddress !== record.origem) {
                            record.origem = sanitizedAddress;
                            sanitizationApplied = true;
                        }
                    }
                    if (record.destino && typeof record.destino === 'string') {
                        const sanitizedAddress = this.sanitizeAddress(record.destino);
                        if (sanitizedAddress !== record.destino) {
                            record.destino = sanitizedAddress;
                            sanitizationApplied = true;
                        }
                    }
                    // Remover campos potencialmente sensíveis
                    const sensitiveFields = ['telefone', 'cpf', 'email', 'endereco_completo'];
                    for (const field of sensitiveFields) {
                        if (record[field]) {
                            delete record[field];
                            sanitizationApplied = true;
                        }
                    }
                }
            }
        }
        if (sanitizationApplied) {
            warnings.push({
                field: 'payload',
                message: 'Dados sensíveis foram sanitizados',
                suggestion: 'Revise os dados sanitizados para garantir que ainda são úteis'
            });
        }
        return sanitized;
    }
    /**
     * 🔧 Métodos auxiliares
     */
    calculateHasChanges(result) {
        if (!result.summary)
            return false;
        return result.summary.newCount > 0 ||
            result.summary.updatedCount > 0 ||
            result.summary.cancelledCount > 0 ||
            result.summary.completedCount > 0;
    }
    getExpectedCountForField(fieldName, summary) {
        const fieldMap = {
            'newRecords': 'newCount',
            'updatedRecords': 'updatedCount',
            'cancelledRecords': 'cancelledCount',
            'completedRecords': 'completedCount'
        };
        const summaryField = fieldMap[fieldName];
        return summary && summaryField ? (summary[summaryField] || 0) : 0;
    }
    validateRecordStructure(records, fieldName, errors, warnings) {
        const requiredFields = ['id', 'status', 'date', 'time'];
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            for (const field of requiredFields) {
                if (!record[field]) {
                    warnings.push({
                        field: `${fieldName}[${i}].${field}`,
                        message: `Campo '${field}' ausente no registro`,
                        suggestion: `Adicione o campo '${field}' ao registro ou use valor padrão`
                    });
                }
            }
            // Validar ID único
            if (!record.id || typeof record.id !== 'string') {
                errors.push({
                    field: `${fieldName}[${i}].id`,
                    message: 'Registro deve ter um ID string válido',
                    severity: 'high',
                    suggestion: 'Gere um ID único para cada registro'
                });
            }
        }
    }
    calculatePayloadSize(payload) {
        return new Blob([JSON.stringify(payload)]).size;
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    isValidISO8601(dateString) {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        return iso8601Regex.test(dateString) && !isNaN(Date.parse(dateString));
    }
    sanitizeName(name) {
        // Manter apenas primeira letra de cada palavra + "..."
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + '...')
            .join(' ');
    }
    sanitizeAddress(address) {
        // Remover números específicos, manter apenas nomes de ruas
        return address.replace(/\d+/g, 'XXX').replace(/,\s*XXX/g, '');
    }
    /**
     * 📊 Obter estatísticas de validação
     */
    getValidationStats() {
        // Implementação de métricas (para versão futura)
        return {
            totalValidations: 0,
            successRate: 0,
            commonErrors: {}
        };
    }
}
exports.WebhookValidator = WebhookValidator;
