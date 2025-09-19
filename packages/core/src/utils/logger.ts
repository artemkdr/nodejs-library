import winston from "winston";
import { ILogger } from "../types/logger";
import { LoggingConfig } from "../types/config";
import {
    SensitiveDataMasker,
    DEFAULT_MASKING_CONFIG,
} from "../utils/sensitive-data-masker";

export class Logger implements ILogger {
    private winston: winston.Logger;
    private masker: SensitiveDataMasker;

    constructor(config: LoggingConfig) {
        // Initialize the masker with config or defaults
        const maskingConfig = config.masking || DEFAULT_MASKING_CONFIG;
        this.masker = new SensitiveDataMasker(maskingConfig);

        this.winston = winston.createLogger({
            level: config.level,
            format: this.createFormat(config.format),
            transports: this.createTransports(config),
        });
    }

    error(message: string, meta?: Record<string, unknown>): void {
        const maskedMessage = this.masker.maskMessage(message) as string;
        const maskedMeta = this.masker.maskMetadata(meta);
        this.winston.error(
            maskedMessage,
            maskedMeta as Record<string, unknown>,
        );
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        const maskedMessage = this.masker.maskMessage(message) as string;
        const maskedMeta = this.masker.maskMetadata(meta);
        this.winston.warn(maskedMessage, maskedMeta as Record<string, unknown>);
    }

    info(message: string, meta?: Record<string, unknown>): void {
        const maskedMessage = this.masker.maskMessage(message) as string;
        const maskedMeta = this.masker.maskMetadata(meta);
        this.winston.info(maskedMessage, maskedMeta as Record<string, unknown>);
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        const maskedMessage = this.masker.maskMessage(message) as string;
        const maskedMeta = this.masker.maskMetadata(meta);
        this.winston.debug(
            maskedMessage,
            maskedMeta as Record<string, unknown>,
        );
    }

    private createFormat(
        format: LoggingConfig["format"],
    ): winston.Logform.Format {
        const baseFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
        );

        switch (format) {
            case "json":
                return winston.format.combine(
                    baseFormat,
                    winston.format.json(),
                );
            case "simple":
                return winston.format.combine(
                    baseFormat,
                    winston.format.simple(),
                );
            case "combined":
                return winston.format.combine(
                    baseFormat,
                    winston.format.printf(
                        ({ timestamp, level, message, ...meta }) => {
                            const metaStr = Object.keys(meta).length
                                ? JSON.stringify(meta)
                                : "";
                            return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
                        },
                    ),
                );
            default:
                return winston.format.combine(
                    baseFormat,
                    winston.format.json(),
                );
        }
    }

    private createTransports(config: LoggingConfig): winston.transport[] {
        const transports: winston.transport[] = [];

        if (config.console.enabled) {
            const consoleFormat = config.console.colorize
                ? winston.format.combine(
                      winston.format.colorize(),
                      winston.format.simple(),
                  )
                : winston.format.simple();

            transports.push(
                new winston.transports.Console({
                    format: consoleFormat,
                }),
            );
        }

        if (config.file.enabled) {
            transports.push(
                new winston.transports.File({
                    filename: config.file.filename,
                    maxsize: this.parseSize(config.file.maxSize),
                    maxFiles: config.file.maxFiles,
                }),
            );
        }

        return transports;
    }

    private parseSize(sizeStr: string): number {
        const match = sizeStr.match(/^(\d+)([kmg]?)$/i);
        if (!match) return 10 * 1024 * 1024; // Default 10MB

        const [, num, unit = ""] = match;
        if (!num) return 10 * 1024 * 1024;

        const size = parseInt(num, 10);

        switch (unit.toLowerCase()) {
            case "k":
                return size * 1024;
            case "m":
                return size * 1024 * 1024;
            case "g":
                return size * 1024 * 1024 * 1024;
            default:
                return size;
        }
    }
}
