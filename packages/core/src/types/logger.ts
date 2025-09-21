// Logger interface
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
