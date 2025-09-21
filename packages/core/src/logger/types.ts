export type LogLevel = "error" | "warn" | "info" | "debug";
export type LogFormat = "json" | "simple" | "combined";

/**
 * Logger interface defining standard logging methods.
 * Each method accepts a message and optional metadata.
 */
export interface ILogger {
	error(
		message: string,
		meta?: Record<string, unknown> | Error | string | unknown,
	): void;
	warn(
		message: string,
		meta?: Record<string, unknown> | Error | string | unknown,
	): void;
	info(
		message: string,
		meta?: Record<string, unknown> | Error | string | unknown,
	): void;
	debug(
		message: string,
		meta?: Record<string, unknown> | Error | string | unknown,
	): void;
}

import type { SensitiveDataMaskingConfig } from "./sensitive-data-masker";

/**
 * Configuration for logging within the application.
 * Includes log level, format, file and console settings, and sensitive data masking options.
 */
export interface LoggingConfig {
	readonly level: LogLevel;
	readonly format: LogFormat;
	readonly file: FileLogConfig;
	readonly console: ConsoleLogConfig;
	readonly masking: SensitiveDataMaskingConfig;
}

/**
 * Configuration for file-based logging.
 * Includes options to:
 * - enable file logging,
 * - specify filename,
 * - max size in string format (e.g., '10m' for 10 megabytes),
 * - and max number of files for rotation.
 *
 */
export interface FileLogConfig {
	readonly enabled: boolean;
	readonly filename: string;
	readonly maxSize: string;
	readonly maxFiles: number;
}

/**
 * Configuration for console-based logging.
 * Includes options to enable console logging and whether to colorize the output.
 */
export interface ConsoleLogConfig {
	readonly enabled: boolean;
	readonly colorize: boolean;
}
