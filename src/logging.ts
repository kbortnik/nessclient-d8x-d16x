import util from 'util';

enum LogLevel {
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warn = 4,
  Error = 5,
}

interface Logger {
  logLevel: LogLevel;
  logEvent(level: LogLevel, message: string): void;
}

class InternalLogger {
  private _logger: Logger | null;

  private logLevel = () => this._logger?.logLevel || LogLevel.Error;

  constructor(logger: Logger | null) {
    this._logger = logger;
  }

  private log(level: LogLevel, message: string, ...placeholders: any[]) {
    this._logger?.logEvent(level, util.format('%s', ...placeholders));
  }

  public debug(message: string, ...placeholders: any[]): void {
    this.logLevel() <= LogLevel.Debug && this.log(LogLevel.Debug, message, ...placeholders);
  }

  public error(message: string, ...placeholders: any[]): void {
    this.logLevel() <= LogLevel.Error && this.log(LogLevel.Error, message, ...placeholders);
  }
}

export { LogLevel, Logger, InternalLogger };
