import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private logDir: string;
  private consoleLevel: LogLevel = LogLevel.INFO;
  private fileLevel: LogLevel = LogLevel.DEBUG;

  private constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogFileName(category: string): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${category}-${date}.log`);
  }

  private formatMessage(level: string, category: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${category}] ${message}`;
  }

  private writeToFile(category: string, level: string, message: string): void {
    try {
      const logFile = this.getLogFileName(category);
      const formattedMessage = this.formatMessage(level, category, message);
      // Usar encoding UTF-8 explícito
      fs.appendFileSync(logFile, formattedMessage + '\n', { encoding: 'utf8' });
    } catch (error) {
      console.error('Erro ao escrever log:', error);
    }
  }

  private shouldLogToConsole(level: LogLevel): boolean {
    return level >= this.consoleLevel;
  }

  private shouldLogToFile(level: LogLevel): boolean {
    return level >= this.fileLevel;
  }

  public debug(category: string, message: string): void {
    if (this.shouldLogToFile(LogLevel.DEBUG)) {
      this.writeToFile(category, 'DEBUG', message);
    }
    if (this.shouldLogToConsole(LogLevel.DEBUG)) {
      console.log(`🔍 [${category}] ${message}`);
    }
  }

  public info(category: string, message: string): void {
    if (this.shouldLogToFile(LogLevel.INFO)) {
      this.writeToFile(category, 'INFO', message);
    }
    if (this.shouldLogToConsole(LogLevel.INFO)) {
      console.log(`ℹ️ [${category}] ${message}`);
    }
  }

  public warn(category: string, message: string): void {
    if (this.shouldLogToFile(LogLevel.WARN)) {
      this.writeToFile(category, 'WARN', message);
    }
    if (this.shouldLogToConsole(LogLevel.WARN)) {
      console.log(`⚠️ [${category}] ${message}`);
    }
  }

  public error(category: string, message: string, error?: any): void {
    const fullMessage = error ? `${message} - ${error.message || error}` : message;
    
    if (this.shouldLogToFile(LogLevel.ERROR)) {
      this.writeToFile(category, 'ERROR', fullMessage);
      if (error?.stack) {
        this.writeToFile(category, 'ERROR', `Stack: ${error.stack}`);
      }
    }
    if (this.shouldLogToConsole(LogLevel.ERROR)) {
      console.error(`❌ [${category}] ${fullMessage}`);
    }
  }

  public success(category: string, message: string): void {
    if (this.shouldLogToFile(LogLevel.INFO)) {
      this.writeToFile(category, 'SUCCESS', message);
    }
    if (this.shouldLogToConsole(LogLevel.INFO)) {
      console.log(`✅ [${category}] ${message}`);
    }
  }

  public setConsoleLevel(level: LogLevel): void {
    this.consoleLevel = level;
  }

  public setFileLevel(level: LogLevel): void {
    this.fileLevel = level;
  }
}

export const logger = Logger.getInstance();
