/**
 * @fileoverview Error handling utilities and middleware.
 * @author github/artemkdr
 */

import type {
	ICircuitBreaker,
	IErrorHandler,
	IRetryHandler,
} from "../types/errors";
import type { ZodError } from "zod";

/**
 * Custom error classes for specific error types.
 */
export class APIError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly service?: string,
		originalError?: Error,
	) {
		super(message);
		this.name = "APIError";
		this.cause = originalError;
	}
}

export class ConfigurationError extends Error {
	constructor(
		message: string,
		public readonly configKey?: string,
	) {
		super(message);
		this.name = "ConfigurationError";
	}
}

export class DataFetchError extends Error {
	constructor(
		message: string,
		public readonly source?: string,
		public readonly operation?: string,
		public readonly retryCount?: number,
		originalError?: Error,
	) {
		super(message);
		this.name = "DataFetchError";
		this.cause = originalError;
	}
}

export class DataValidationError extends Error {
	public readonly validationErrors?:
		| Array<{ path: string; message: string }>
		| undefined;
	public readonly originalMessage: string;

	constructor(message: string, validationError?: ZodError) {
		const zodError = validationError;
		const validationErrors = zodError?.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		}));
		super(`Validation failed: ${JSON.stringify(validationErrors)}`);
		this.originalMessage = message;
		this.name = "DataValidationError";
		this.validationErrors = validationErrors;
		this.cause = validationError;
	}
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly source?: string,
		public readonly operation?: string,
		originalError?: Error,
	) {
		super(message);
		this.name = "DatabaseError";
		this.cause = originalError;
	}
}

/**
 * Retry utility with exponential backoff.
 */
export class RetryHandler implements IRetryHandler {
	constructor(
		private readonly maxAttempts: number = 3,
		private readonly baseDelayMs: number = 1000,
	) {}

	async execute<T>(
		operation: () => Promise<T>,
		shouldRetry: (error: Error) => boolean = () => true,
	): Promise<T> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt === this.maxAttempts || !shouldRetry(lastError)) {
					throw lastError;
				}

				const delayMs = this.baseDelayMs * 2 ** (attempt - 1);
				await this.delay(delayMs);
			}
		}
		return Promise.reject();
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Circuit breaker pattern implementation.
 */
export class CircuitBreaker implements ICircuitBreaker {
	private failures = 0;
	private lastFailureTime?: number | undefined;
	private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

	constructor(
		private readonly failureThreshold: number = 5,
		private readonly resetTimeoutMs: number = 60000,
	) {}

	async execute<T>(
		operation: () => Promise<T>,
		operationName: string,
	): Promise<T> {
		if (this.state === "OPEN") {
			if (this.shouldAttemptReset()) {
				this.state = "HALF_OPEN";
			} else {
				throw new Error(`Circuit breaker is open for ${operationName}`);
			}
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private shouldAttemptReset(): boolean {
		return (
			this.lastFailureTime !== undefined &&
			Date.now() - this.lastFailureTime >= this.resetTimeoutMs
		);
	}

	private onSuccess(): void {
		this.failures = 0;
		this.lastFailureTime = undefined;
		if (this.state === "HALF_OPEN") {
			this.state = "CLOSED";
		}
	}

	private onFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.failureThreshold) {
			this.state = "OPEN";
		}
	}

	getState() {
		return this.state;
	}

	getFailureCount(): number {
		return this.failures;
	}
}

/**
 * Error handler utility functions.
 */
export class ErrorHandler implements IErrorHandler {
	/**
	 * Handle generic error
	 * @param error The error to handle.
	 * @param ErrorClass The error class to instantiate (defaults to Error).
	 * @param options Additional properties to assign to the error instance (excluding 'cause').
	 * @returns new instance of the specified ErrorClass
	 *
	 * @example
	 * ```typescript
	 * const errorHandler = new ErrorHandler();
	 * try {
	 *     // Some operation that may throw
	 * } catch (error) {
	 *     errorHandler.handlerError(error, ApiError, { statusCode: 500, service: 'UserService' });
	 * }
	 * ```
	 */
	handleError<T extends Error>(
		error: unknown,
		ErrorClass: new (message: string) => T,
		options?: Omit<T, "message" | "name" | "cause"> &
			Partial<Pick<T, "message">>,
	): T {
		// Default to Error if no class provided
		const ErrClass = ErrorClass ?? Error;
		// Construct error instance
		const errInstance = new ErrClass(
			error instanceof Error
				? error.message
				: "message" in (error as { message: string })
					? (
							error as {
								message: string;
							}
						).message
					: String(error),
		);
		// Set cause property if supported
		if ("cause" in errInstance) {
			(errInstance as T).cause = error;
		}
		// Assign additional properties from options
		if (options) {
			for (const [key, value] of Object.entries(options)) {
				if (key in errInstance) {
					(errInstance as Record<string, unknown>)[key] = value;
				}
			}
		}
		return errInstance;
	}

	/**
	 * Safely handle promises with error logging.
	 */
	async safeExecute<T>(
		operation: () => Promise<T>,
		defaultValue?: T,
	): Promise<T | undefined> {
		try {
			return await operation();
		} catch {
			return defaultValue;
		}
	}
}
