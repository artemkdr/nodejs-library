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

export interface IRetryHandler {
	execute<T>(
		operation: () => Promise<T>,
		shouldRetry?: (error: Error) => boolean,
	): Promise<T>;
}

export interface ICircuitBreaker {
	execute<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
	getState(): "CLOSED" | "OPEN" | "HALF_OPEN";
	getFailureCount(): number;
}
