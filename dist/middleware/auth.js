"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleRateLimit = exports.optionalAuth = exports.validateApiToken = void 0;
/**
 * 🔑 Validar token de API
 */
const validateApiToken = (req, res, next) => {
    try {
        // Obter token do header Authorization ou query parameter
        const authHeader = req.headers.authorization;
        const queryToken = req.query.token;
        let token = null;
        // Verificar header Authorization (Bearer token)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove "Bearer "
        }
        // Ou verificar query parameter
        else if (queryToken) {
            token = queryToken;
        }
        // Se não há token
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de acesso obrigatório',
                message: 'Forneça o token via Authorization header (Bearer) ou query parameter (?token=...)'
            });
        }
        // Obter tokens válidos das variáveis de ambiente
        const validTokens = [
            process.env.API_TOKEN,
            process.env.RECHARGE_API_TOKEN,
            process.env.ADMIN_TOKEN
        ].filter(Boolean); // Remove valores undefined/null
        // Se não há tokens configurados, bloquear acesso
        if (validTokens.length === 0) {
            console.error('⚠️ SEGURANÇA: Nenhum token de API configurado! Bloqueando acesso.');
            return res.status(503).json({
                success: false,
                error: 'Serviço temporariamente indisponível',
                message: 'Tokens de API não configurados'
            });
        }
        // Validar token
        if (!validTokens.includes(token)) {
            console.warn(`🚫 Tentativa de acesso com token inválido: ${token.substring(0, 8)}...`);
            return res.status(403).json({
                success: false,
                error: 'Token inválido',
                message: 'Token de acesso não autorizado'
            });
        }
        // Token válido - adicionar informações do usuário ao request
        req.user = {
            authenticated: true,
            tokenType: 'api'
        };
        console.log(`✅ Acesso autorizado com token: ${token.substring(0, 8)}...`);
        next();
    }
    catch (error) {
        console.error('❌ Erro na validação do token:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno na autenticação'
        });
    }
};
exports.validateApiToken = validateApiToken;
/**
 * 🔓 Middleware para endpoints públicos (opcional)
 * Permite acesso sem token mas registra o uso
 */
const optionalAuth = (req, res, next) => {
    try {
        // Tentar validar token se fornecido
        const authHeader = req.headers.authorization;
        const queryToken = req.query.token;
        if (authHeader || queryToken) {
            // Se token fornecido, validar
            return (0, exports.validateApiToken)(req, res, next);
        }
        else {
            // Sem token - acesso público
            console.log(`ℹ️ Acesso público ao endpoint: ${req.method} ${req.path}`);
            req.user = {
                authenticated: false,
                tokenType: 'public'
            };
            next();
        }
    }
    catch (error) {
        console.error('❌ Erro no middleware de auth opcional:', error);
        next(); // Continuar mesmo com erro
    }
};
exports.optionalAuth = optionalAuth;
/**
 * 🛡️ Rate limiting simples baseado em IP
 */
const requestCounts = new Map();
const simpleRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        // Limpar contadores expirados
        for (const [ip, data] of requestCounts.entries()) {
            if (now > data.resetTime) {
                requestCounts.delete(ip);
            }
        }
        // Verificar/atualizar contador para este IP
        const current = requestCounts.get(clientIp);
        if (!current) {
            // Primeiro request deste IP
            requestCounts.set(clientIp, {
                count: 1,
                resetTime: now + windowMs
            });
            next();
        }
        else if (current.count >= maxRequests) {
            // Limite excedido
            console.warn(`⚠️ Rate limit excedido para IP: ${clientIp}`);
            return res.status(429).json({
                success: false,
                error: 'Muitas requisições',
                message: `Limite de ${maxRequests} requisições por ${windowMs / 1000 / 60} minutos excedido`,
                retryAfter: Math.ceil((current.resetTime - now) / 1000)
            });
        }
        else {
            // Incrementar contador
            current.count++;
            next();
        }
    };
};
exports.simpleRateLimit = simpleRateLimit;
