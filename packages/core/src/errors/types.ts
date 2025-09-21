/**
 * Error handling interfaces and types.
 * This file defines interfaces for error handling, retry logic, and circuit breaker patterns.
 * These interfaces can be implemented to provide consistent error management across the application.
 */
export interface IErrorHandler {
	safeExecute<T>(
		operation: () => Promise<T>,
		defaultValue?: T,
	): Promise<T | undefined>;
	handleError<T extends Error>(
		error: unknown,
		ErrorClass: new (message: string) => T,
		options?: Omit<T, "message" | "name" | "cause"> &
			Partial<Pick<T, "message">>,
	): T;
}

/**
 * RetryHandler interface for executing operations with retry logic.
 * The execute method takes an asynchronous operation and an optional shouldRetry function.
 * The shouldRetry function determines whether to retry the operation based on the error encountered.
 */
export interface IRetryHandler {
	execute<T>(
		operation: () => Promise<T>,
		shouldRetry?: (error: Error) => boolean,
	): Promise<T>;
}

/**
 * CircuitBreaker interface for executing operations with circuit breaker pattern.
 *
 * The circuit breaker can be in one of three states: CLOSED, OPEN, or HALF_OPEN.
 * - CLOSED: The circuit is functioning normally, and operations are allowed to proceed.
 * - OPEN: The circuit has detected a failure threshold and is blocking operations to prevent further failures.
 * - HALF_OPEN: The circuit is testing if the underlying issue has been resolved by allowing a limited number of operations to proceed.
 *
 * The interface provides methods to execute operations, get the current state of the circuit breaker,
 * and retrieve the count of consecutive failures.
 */
export interface ICircuitBreaker {
	execute<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
	getState(): "CLOSED" | "OPEN" | "HALF_OPEN";
	getFailureCount(): number;
}
