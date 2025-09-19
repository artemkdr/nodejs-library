export interface IErrorHandler {
    safeExecute<T>(
        operation: () => Promise<T>,
        defaultValue?: T,
    ): Promise<T | undefined>;
    formatError(error: Error): {
        message: string;
        type: string;
        details?: unknown;
    };
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
