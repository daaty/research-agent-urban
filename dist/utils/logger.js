"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.consoleLevel = LogLevel.INFO;
        this.fileLevel = LogLevel.DEBUG;
        this.logDir = path_1.default.join(process.cwd(), 'logs');
        if (!fs_1.default.existsSync(this.logDir)) {
            fs_1.default.mkdirSync(this.logDir, { recursive: true });
        }
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    getLogFileName(category) {
        const date = new Date().toISOString().split('T')[0];
        return path_1.default.join(this.logDir, `${category}-${date}.log`);
    }
    formatMessage(level, category, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] [${category}] ${message}`;
    }
    writeToFile(category, level, message) {
        try {
            const logFile = this.getLogFileName(category);
            const formattedMessage = this.formatMessage(level, category, message);
            // Usar encoding UTF-8 explícito
            fs_1.default.appendFileSync(logFile, formattedMessage + '\n', { encoding: 'utf8' });
        }
        catch (error) {
            console.error('Erro ao escrever log:', error);
        }
    }
    shouldLogToConsole(level) {
        return level >= this.consoleLevel;
    }
    shouldLogToFile(level) {
        return level >= this.fileLevel;
    }
    debug(category, message) {
        if (this.shouldLogToFile(LogLevel.DEBUG)) {
            this.writeToFile(category, 'DEBUG', message);
        }
        if (this.shouldLogToConsole(LogLevel.DEBUG)) {
            console.log(`🔍 [${category}] ${message}`);
        }
    }
    info(category, message) {
        if (this.shouldLogToFile(LogLevel.INFO)) {
            this.writeToFile(category, 'INFO', message);
        }
        if (this.shouldLogToConsole(LogLevel.INFO)) {
            console.log(`ℹ️ [${category}] ${message}`);
        }
    }
    warn(category, message) {
        if (this.shouldLogToFile(LogLevel.WARN)) {
            this.writeToFile(category, 'WARN', message);
        }
        if (this.shouldLogToConsole(LogLevel.WARN)) {
            console.log(`⚠️ [${category}] ${message}`);
        }
    }
    error(category, message, error) {
        const fullMessage = error ? `${message} - ${error.message || error}` : message;
        if (this.shouldLogToFile(LogLevel.ERROR)) {
            this.writeToFile(category, 'ERROR', fullMessage);
            if (error === null || error === void 0 ? void 0 : error.stack) {
                this.writeToFile(category, 'ERROR', `Stack: ${error.stack}`);
            }
        }
        if (this.shouldLogToConsole(LogLevel.ERROR)) {
            console.error(`❌ [${category}] ${fullMessage}`);
        }
    }
    success(category, message) {
        if (this.shouldLogToFile(LogLevel.INFO)) {
            this.writeToFile(category, 'SUCCESS', message);
        }
        if (this.shouldLogToConsole(LogLevel.INFO)) {
            console.log(`✅ [${category}] ${message}`);
        }
    }
    setConsoleLevel(level) {
        this.consoleLevel = level;
    }
    setFileLevel(level) {
        this.fileLevel = level;
    }
}
exports.Logger = Logger;
exports.logger = Logger.getInstance();
