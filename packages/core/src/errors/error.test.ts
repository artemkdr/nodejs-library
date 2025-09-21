import { describe, expect, it } from "bun:test";
import type z from "zod";
import { ZodError } from "zod";
import { APIError } from "./api-error";
import { ConfigurationError } from "./configuration-error";
import { DataFetchError } from "./data-fetch-error";
import { DataValidationError } from "./data-validation-error";
import { DatabaseError } from "./database-error";

// Helper to create mock ZodError
function createMockZodError(
	issues: Partial<z.core.$ZodIssue>[] = [],
): ZodError {
	const defaultIssues: z.core.$ZodIssue[] = issues.map((issue) => ({
		code: "invalid_type",
		expected: "string",
		received: "number",
		path: [],
		message: "Expected string, received number",
		...issue,
	})) as z.core.$ZodIssue[];

	return new ZodError(defaultIssues);
}

describe("Error Classes", () => {
	describe("APIError", () => {
		it("should create APIError with all properties", () => {
			const originalError = new Error("Original error");
			const apiError = new APIError(
				"API failed",
				500,
				"TestService",
				originalError,
			);

			expect(apiError.name).toBe("APIError");
			expect(apiError.message).toBe("API failed");
			expect(apiError.statusCode).toBe(500);
			expect(apiError.service).toBe("TestService");
			expect(apiError.cause).toBe(originalError);
		});

		it("should create APIError with minimal properties", () => {
			const apiError = new APIError("API failed");

			expect(apiError.name).toBe("APIError");
			expect(apiError.message).toBe("API failed");
			expect(apiError.statusCode).toBeUndefined();
			expect(apiError.service).toBeUndefined();
			expect(apiError.cause).toBeUndefined();
		});
	});

	describe("ConfigurationError", () => {
		it("should create ConfigurationError with config key", () => {
			const configError = new ConfigurationError("Config missing", "api.key");

			expect(configError.name).toBe("ConfigurationError");
			expect(configError.message).toBe("Config missing");
			expect(configError.configKey).toBe("api.key");
		});

		it("should create ConfigurationError without config key", () => {
			const configError = new ConfigurationError("Config missing");

			expect(configError.name).toBe("ConfigurationError");
			expect(configError.message).toBe("Config missing");
			expect(configError.configKey).toBeUndefined();
		});
	});

	describe("DataFetchError", () => {
		it("should create DataFetchError with all properties", () => {
			const originalError = new Error("Original error");
			const dataFetchError = new DataFetchError(
				"Fetch failed",
				"API",
				"getData",
				3,
				originalError,
			);

			expect(dataFetchError.name).toBe("DataFetchError");
			expect(dataFetchError.message).toBe("Fetch failed");
			expect(dataFetchError.source).toBe("API");
			expect(dataFetchError.operation).toBe("getData");
			expect(dataFetchError.retryCount).toBe(3);
			expect(dataFetchError.cause).toBe(originalError);
		});

		it("should create DataFetchError with minimal properties", () => {
			const dataFetchError = new DataFetchError("Fetch failed");

			expect(dataFetchError.name).toBe("DataFetchError");
			expect(dataFetchError.message).toBe("Fetch failed");
			expect(dataFetchError.source).toBeUndefined();
			expect(dataFetchError.operation).toBeUndefined();
			expect(dataFetchError.retryCount).toBeUndefined();
			expect(dataFetchError.cause).toBeUndefined();
		});
	});

	describe("DataValidationError", () => {
		it("should create DataValidationError from ZodError", () => {
			const zodError = createMockZodError([
				{
					path: ["name"],
					message: "Name is required",
				},
				{
					path: ["age", "value"],
					message: "Age must be a number",
				},
			]);

			const validationError = new DataValidationError("Zod error", zodError);

			expect(validationError.name).toBe("DataValidationError");
			expect(validationError.validationErrors).toEqual([
				{ path: "name", message: "Name is required" },
				{ path: "age.value", message: "Age must be a number" },
			]);
			expect(validationError.message).toContain("Validation failed");
		});

		it("should handle empty path in ZodError", () => {
			const zodError = createMockZodError([
				{
					path: [],
					message: "Root validation error",
				},
			]);

			const validationError = new DataValidationError("Zod error", zodError);

			expect(validationError.validationErrors).toEqual([
				{ path: "", message: "Root validation error" },
			]);
		});
	});

	describe("DatabaseError", () => {
		it("should create DatabaseError with all properties", () => {
			const originalError = new Error("Original error");
			const dbError = new DatabaseError(
				"DB failed",
				"ER_BAD_FIELD_ERROR",
				"SELECT * FROM users",
				originalError,
			);

			expect(dbError.name).toBe("DatabaseError");
			expect(dbError.message).toBe("DB failed");
			expect(dbError.source).toBe("ER_BAD_FIELD_ERROR");
			expect(dbError.operation).toBe("SELECT * FROM users");
			expect(dbError.cause).toBe(originalError);
		});
	});
});
