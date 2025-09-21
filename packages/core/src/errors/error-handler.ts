/**
 * @fileoverview Error handling utilities and middleware.
 * @author github/artemkdr
 */

import type { ICircuitBreaker, IErrorHandler, IRetryHandler } from "./types";

/**
 * Retry utility with exponential backoff.
 *
 * @example
 * This example demonstrates how to use the RetryHandler to execute an asynchronous operation with retry logic.
 * The operation will be retried up to 5 times with an initial delay of 500ms, doubling the delay after each attempt.
 * The shouldRetry function is used to determine if the operation should be retried based on the error encountered.
 * ```typescript
 * const retryHandler = new RetryHandler(5, 500);
 * try {
 *     const result = await retryHandler.execute(asyncOperation, (error) => {
 *         // Retry only on network errors
 *         return error.message.includes("Network Error");
 *     });
 * } catch (error) {
 *     console.error("Operation failed after retries:", error);
 * }
 * ```
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
 *
 * @example
 * This example demonstrates how to use the CircuitBreaker to execute an asynchronous operation with circuit breaker logic.
 * The circuit breaker will open after 3 consecutive failures and will attempt to reset after 30 seconds.
 * ```typescript
 * const circuitBreaker = new CircuitBreaker(3, 30000);
 * try {
 *     const result = await circuitBreaker.execute(asyncOperation, "AsyncOperation");
 * } catch (error) {
 *     console.error("Operation failed:", error);
 * }
 * ```
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
 *
 * @example
 * This example demonstrates how to use the ErrorHandler to handle errors in asynchronous operations.
 * The handleError method is used to wrap an error into a specified error class with additional context.
 * The utility of handleError is to standardize error handling and provide more informative error messages
 * before propagating them up the call stack.
 *
 * The safeExecute method is used to safely execute an asynchronous operation, returning a default value in case of failure.
 * ```typescript
 * const errorHandler = new ErrorHandler();
 * try {
 *     const result = await errorHandler.safeExecute(asyncOperation, defaultValue);
 * } catch (error) {
 *     const handledError = errorHandler.handleError(error, CustomError, { context: 'Additional info' });
 *     console.error(handledError);
 * }
 * ```
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
