/**
 * @fileoverview Error handling utilities and middleware.
 * @author github/artemkdr
 */

import {
    ICircuitBreaker,
    IErrorHandler,
    IRetryHandler,
} from "../types/errors";
import { ZodError } from "zod";

/**
 * Custom error classes for specific error types.
 */
export class APIError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly service?: string,
        public readonly originalError?: Error,
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
        public readonly originalError?: Error,
    ) {
        super(message);
        this.name = "DataFetchError";
        this.cause = originalError;
    }
}

export class DataValidationError extends Error {
    public readonly validationErrors: Array<{ path: string; message: string }>;

    constructor(validationError: ZodError) {
        const zodError = validationError;
        const validationErrors = zodError.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }));
        super(`Validation failed: ${JSON.stringify(validationErrors)}`);
        this.name = "DataValidationError";
        this.validationErrors = validationErrors;
        this.cause = validationError;
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
        let lastError: Error;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError =
                    error instanceof Error ? error : new Error(String(error));

                if (attempt === this.maxAttempts || !shouldRetry(lastError)) {
                    throw lastError;
                }

                const delayMs = this.baseDelayMs * Math.pow(2, attempt - 1);
                await this.delay(delayMs);
            }
        }

        throw lastError!;
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
    constructor() {}

    /**
     * Handle and categorize errors from API calls.
     */
    handleAPIError(error: unknown, service: string, operation: string): never {
        if (
            typeof error === "object" &&
            error !== null &&
            "response" in error
        ) {
            // HTTP error response
            const err = error as {
                response: { status: number; data?: { message?: string } };
                message?: string;
            };
            const statusCode = err.response.status;
            const message =
                err.response.data?.message ||
                err.message ||
                "Unknown API error";
            throw new APIError(
                `${service} ${operation} failed: ${message}`,
                statusCode,
                service,
                error instanceof Error ? error : undefined,
            );
        } else if (
            typeof error === "object" &&
            error !== null &&
            "request" in error
        ) {
            // Network error
            throw new APIError(
                `${service} ${operation} failed: Network error`,
                undefined,
                service,
                error instanceof Error ? error : undefined,
            );
        } else {
            // Other error
            const errMsg =
                typeof error === "object" && error && "message" in error
                    ? (error as { message: string }).message
                    : "Unknown error";
            throw new APIError(
                `${service} ${operation} failed: ${errMsg}`,
                undefined,
                service,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Handle data fetch errors.
     */
    handleDataFetchError(
        error: unknown,
        source: string,
        operation: string,
        retryCount?: number,
    ): never {
        if (error instanceof DataFetchError) {
            throw error;
        }

        const message =
            typeof error === "object" && error && "message" in error
                ? (error as { message: string }).message
                : "Unknown data fetch error";
        throw new DataFetchError(
            `Data fetch from ${source} failed during ${operation}${retryCount ? ` after ${retryCount} retries` : ""}: ${message}`,
            source,
            operation,
            retryCount,
            error instanceof Error ? error : undefined,
        );
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

    /**
     * Format error for user-friendly display.
     */
    formatError(error: Error): {
        message: string;
        type: string;
        details?: unknown;
    } {
        if (error instanceof APIError) {
            return {
                message: `API error${error.service ? ` from ${error.service}` : ""}`,
                type: "api",
                details: {
                    service: error.service,
                    statusCode: error.statusCode,
                },
            };
        }

        if (error instanceof DataFetchError) {
            return {
                message: `Data fetch error${error.source ? ` from ${error.source}` : ""}`,
                type: "data-fetch",
                details: {
                    source: error.source,
                    operation: error.operation,
                    retryCount: error.retryCount,
                },
            };
        }

        if (error instanceof DataValidationError) {
            return {
                message: "Data validation error",
                type: "data-validation",
                details: {
                    dataType: error.message,
                    validationErrors: error.validationErrors,
                },
            };
        }

        if (error instanceof ConfigurationError) {
            return {
                message: "Configuration error",
                type: "configuration",
                details: { configKey: error.configKey },
            };
        }

        return {
            message: error.message || "Unknown error",
            type: "unknown",
        };
    }
}
