/**
 * @fileoverview Comprehensive unit tests for error handling utilities.
 * @author GitHub Copilot
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import { APIError } from "./api-error";
import { CircuitBreaker, ErrorHandler, RetryHandler } from "./error-handler";

describe("RetryHandler", () => {
	let retryHandler: RetryHandler;

	beforeEach(() => {
		jest.clearAllMocks();
		retryHandler = new RetryHandler(3, 10);
	});

	describe("execute", () => {
		it("should execute operation successfully on first attempt", async () => {
			// Arrange
			const operation = jest.fn().mockResolvedValue("success");

			// Act
			const result = await retryHandler.execute(operation);

			// Assert
			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure and succeed eventually", async () => {
			// Arrange
			const operation = jest
				.fn()
				.mockRejectedValueOnce(new Error("First failure"))
				.mockRejectedValueOnce(new Error("Second failure"))
				.mockResolvedValue("success");

			//const originalJest = (await import("jest")).default;

			jest.useFakeTimers();

			// Act
			const resultPromise = retryHandler.execute(operation);

			// Fast-forward through all timers
			// NOT IMPLEMENTED YET IN BUN:TEST
			//jest.advanceTimersByTime(3000);

			const result = await resultPromise;

			// Assert
			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(3);
			jest.useRealTimers();
		});

		it("should fail after max attempts", async () => {
			// Arrange
			const error = new Error("Persistent failure");
			const operation = jest.fn().mockRejectedValue(error);

			// Act & Assert
			await expect(retryHandler.execute(operation)).rejects.toThrow(
				"Persistent failure",
			);

			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should respect shouldRetry function", async () => {
			// Arrange
			const error = new Error("Non-retryable error");
			const operation = jest.fn().mockRejectedValue(error);
			const shouldRetry = jest.fn().mockReturnValue(false);

			// Act & Assert
			await expect(
				retryHandler.execute(operation, shouldRetry),
			).rejects.toThrow("Non-retryable error");

			expect(operation).toHaveBeenCalledTimes(1);
			expect(shouldRetry).toHaveBeenCalledWith(error);
		});

		it("should handle non-Error rejections", async () => {
			// Arrange
			const operation = jest.fn().mockRejectedValue("string error");

			// Act & Assert
			await expect(retryHandler.execute(operation)).rejects.toThrow(
				"string error",
			);

			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should use exponential backoff delays", async () => {
			// Arrange
			const operation = jest
				.fn()
				.mockRejectedValueOnce(new Error("First failure"))
				.mockRejectedValueOnce(new Error("Second failure"))
				.mockResolvedValue("success");

			// Spy on the private delay method through the class prototype
			const delaySpy = jest.spyOn(
				RetryHandler.prototype as unknown as {
					delay: (ms: number) => Promise<void>;
				},
				"delay",
			);
			delaySpy.mockImplementation(() => Promise.resolve());

			// Act
			await retryHandler.execute(operation);

			// Assert
			expect(delaySpy).toHaveBeenCalledTimes(2);
			// First retry: 1000ms * 2^0 = 1000ms
			expect(delaySpy).toHaveBeenNthCalledWith(1, 10);
			// Second retry: 1000ms * 2^1 = 2000ms
			expect(delaySpy).toHaveBeenNthCalledWith(2, 20);

			// Cleanup
			delaySpy.mockRestore();
		});
	});
});

describe("CircuitBreaker", () => {
	let circuitBreaker: CircuitBreaker;
	let mockDateNow: jest.Mock;
	let cleanup: (() => void) | undefined;

	beforeEach(() => {
		jest.clearAllMocks();
		circuitBreaker = new CircuitBreaker(3, 100); // 3 failures, 100ms timeout

		// Mock Date.now for time control
		mockDateNow = jest.fn();
		const originalDateNow = Date.now;
		Date.now = mockDateNow;

		// Start at time 0
		mockDateNow.mockReturnValue(0);

		// Cleanup function to restore Date.now after tests
		cleanup = () => {
			Date.now = originalDateNow;
		};
	});

	afterEach(() => {
		cleanup?.();
	});

	describe("execute", () => {
		it("should execute operation successfully when circuit is closed", async () => {
			// Arrange
			const operation = jest.fn().mockResolvedValue("success");

			// Act
			const result = await circuitBreaker.execute(operation, "testOperation");

			// Assert
			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(1);
			expect(circuitBreaker.getState()).toBe("CLOSED");
			expect(circuitBreaker.getFailureCount()).toBe(0);
		});

		it("should open circuit after failure threshold", async () => {
			// Arrange
			const error = new Error("Test failure");
			const operation = jest.fn().mockRejectedValue(error);

			// Act & Assert
			// First failure
			await expect(
				circuitBreaker.execute(operation, "testOperation"),
			).rejects.toThrow("Test failure");
			expect(circuitBreaker.getState()).toBe("CLOSED");
			expect(circuitBreaker.getFailureCount()).toBe(1);

			// Second failure
			await expect(
				circuitBreaker.execute(operation, "testOperation"),
			).rejects.toThrow("Test failure");
			expect(circuitBreaker.getState()).toBe("CLOSED");
			expect(circuitBreaker.getFailureCount()).toBe(2);

			// Third failure - should open circuit
			await expect(
				circuitBreaker.execute(operation, "testOperation"),
			).rejects.toThrow("Test failure");
			expect(circuitBreaker.getState()).toBe("OPEN");
			expect(circuitBreaker.getFailureCount()).toBe(3);
		});

		it("should reject immediately when circuit is open", async () => {
			// Arrange - Force circuit to open
			const error = new Error("Test failure");
			const operation = jest.fn().mockRejectedValue(error);

			// Open the circuit
			for (let i = 0; i < 3; i++) {
				try {
					await circuitBreaker.execute(operation, "testOperation");
				} catch {
					// Ignore errors
				}
			}
			expect(circuitBreaker.getState()).toBe("OPEN");

			// Reset operation mock
			operation.mockClear();

			// Act & Assert
			await expect(
				circuitBreaker.execute(operation, "testOperation"),
			).rejects.toThrow("Circuit breaker is open for testOperation");

			expect(operation).not.toHaveBeenCalled();
		});

		it("should transition to half-open after timeout", async () => {
			// Arrange - Open the circuit
			const error = new Error("Test failure");
			const failingOperation = jest.fn().mockRejectedValue(error);

			for (let i = 0; i < 3; i++) {
				try {
					await circuitBreaker.execute(failingOperation, "testOperation");
				} catch {
					// Ignore errors
				}
			}
			expect(circuitBreaker.getState()).toBe("OPEN");

			// Advance time past timeout (5000ms)
			mockDateNow.mockReturnValue(6000);

			const successOperation = jest.fn().mockResolvedValue("success");

			// Act
			const result = await circuitBreaker.execute(
				successOperation,
				"testOperation",
			);

			// Assert
			expect(result).toBe("success");
			expect(circuitBreaker.getState()).toBe("CLOSED");
			expect(circuitBreaker.getFailureCount()).toBe(0);
		});

		it("should reopen circuit if half-open operation fails", async () => {
			// Arrange - Open the circuit
			const error = new Error("Test failure");
			const failingOperation = jest.fn().mockRejectedValue(error);

			for (let i = 0; i < 3; i++) {
				try {
					await circuitBreaker.execute(failingOperation, "testOperation");
				} catch {
					// Ignore errors
				}
			}

			// Advance time past timeout
			mockDateNow.mockReturnValue(6000);

			// Act & Assert
			await expect(
				circuitBreaker.execute(failingOperation, "testOperation"),
			).rejects.toThrow("Test failure");

			expect(circuitBreaker.getState()).toBe("OPEN");
			expect(circuitBreaker.getFailureCount()).toBe(4);
		});

		it("should not attempt reset before timeout", async () => {
			// Arrange - Open the circuit
			const error = new Error("Test failure");
			const operation = jest.fn().mockRejectedValue(error);

			for (let i = 0; i < 3; i++) {
				try {
					await circuitBreaker.execute(operation, "testOperation");
				} catch {
					// Ignore errors
				}
			}

			// Advance time but not past timeout (90ms < 100ms)
			mockDateNow.mockReturnValue(90);

			// Act & Assert
			await expect(
				circuitBreaker.execute(operation, "testOperation"),
			).rejects.toThrow("Circuit breaker is open for testOperation");

			expect(circuitBreaker.getState()).toBe("OPEN");
		});

		it("should handle non-Error rejections", async () => {
			// Arrange
			const operation = jest.fn().mockRejectedValue("string error");

			// Act & Assert
			await expect(
				circuitBreaker.execute(operation, "testOperation"),
			).rejects.toBe("string error");

			expect(circuitBreaker.getFailureCount()).toBe(1);
		});

		it("should reset failure count on success in closed state", async () => {
			// Arrange
			const failingOperation = jest
				.fn()
				.mockRejectedValue(new Error("Failure"));
			const successOperation = jest.fn().mockResolvedValue("success");

			// Fail once
			try {
				await circuitBreaker.execute(failingOperation, "testOperation");
			} catch {
				// Ignore errors
			}
			expect(circuitBreaker.getFailureCount()).toBe(1);

			// Act - succeed
			const result = await circuitBreaker.execute(
				successOperation,
				"testOperation",
			);

			// Assert
			expect(result).toBe("success");
			expect(circuitBreaker.getFailureCount()).toBe(0);
		});
	});
});

describe("ErrorHandler", () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		jest.clearAllMocks();
		errorHandler = new ErrorHandler();
	});

	describe("handleError", () => {
		it("should handle error object with default message", () => {
			// Arrange
			const httpError = {
				response: {
					status: 404,
					data: { message: "Not found" },
				},
				message: "Request failed",
			};

			try {
				throw errorHandler.handleError(httpError, APIError, {
					service: "TestService",
					statusCode: httpError.response.status,
				});
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).message).toBe("Request failed");
				expect((error as APIError).statusCode).toBe(404);
				expect((error as APIError).service).toBe("TestService");
			}
		});

		it("should handle Error with custom message", () => {
			// Arrange
			const httpError = new Error("Request failed");
			(
				httpError as unknown as {
					response: { status: number; data: { message: string } };
				}
			).response = {
				status: 404,
				data: { message: "Not found" },
			};

			try {
				throw errorHandler.handleError(httpError, APIError, {
					message: `${httpError.message}: Not Found`,
					service: "TestService",
					statusCode: (httpError as unknown as { response: { status: number } })
						.response.status,
				});
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).message).toBe("Request failed: Not Found");
				expect((error as APIError).statusCode).toBe(404);
				expect((error as APIError).service).toBe("TestService");
			}
		});
	});

	describe("safeExecute", () => {
		it("should return operation result on success", async () => {
			// Arrange
			const operation = jest.fn().mockResolvedValue("success");

			// Act
			const result = await errorHandler.safeExecute(operation, "testOperation");

			// Assert
			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should return undefined on error without default value", async () => {
			// Arrange
			const error = new Error("Operation failed");
			const operation = jest.fn().mockRejectedValue(error);

			// Act
			const result = await errorHandler.safeExecute(operation);

			// Assert
			expect(result).toBeUndefined();
		});

		it("should return default value on error", async () => {
			// Arrange
			const error = new Error("Operation failed");
			const operation = jest.fn().mockRejectedValue(error);
			const defaultValue = "fallback";

			// Act
			const result = await errorHandler.safeExecute(operation, defaultValue);

			// Assert
			expect(result).toBe("fallback");
		});
	});
});
