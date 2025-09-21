/**
 * @fileoverview Tests for sensitive data masking utility.
 * @author github/artemkdr
 */

import { describe, expect, it } from "bun:test";
import {
	SensitiveDataMasker,
	type SensitiveDataMaskingConfig,
} from "../utils/sensitive-data-masker";

describe("SensitiveDataMasker", () => {
	describe("constructor", () => {
		it("should use default config when no config provided", () => {
			const masker = new SensitiveDataMasker();
			expect(masker).toBeDefined();
		});

		it("should merge provided config with defaults", () => {
			const customConfig: Partial<SensitiveDataMaskingConfig> = {
				maskString: "REDACTED",
				customPatterns: ["customField"],
			};
			const masker = new SensitiveDataMasker(customConfig);
			expect(masker).toBeDefined();
		});
	});

	describe("maskMessage", () => {
		const masker = new SensitiveDataMasker();

		it("should mask email addresses in messages", () => {
			const message = "User email is john.doe@example.com";
			const result = masker.maskMessage(message);
			expect(result).toBe("User email is ***MASKED***");
		});

		it("should mask multiple emails in a message", () => {
			const message = "Emails: admin@test.com, user@domain.org";
			const result = masker.maskMessage(message);
			expect(result).toBe("Emails: ***MASKED***, ***MASKED***");
		});

		it("should mask Bearer tokens", () => {
			const message = "Authorization: Bearer abc123xyz789";
			const result = masker.maskMessage(message);
			expect(result).toBe("Authorization: ***MASKED***");
		});

		it("should mask Basic auth tokens", () => {
			const message = "Auth: Basic YWRtaW46cGFzc3dvcmQ=";
			const result = masker.maskMessage(message);
			expect(result).toBe("Auth: ***MASKED***");
		});

		it("should mask credit card numbers", () => {
			const message = "CC: 1234-5678-9012-3456";
			const result = masker.maskMessage(message);
			expect(result).toBe("CC: ***MASKED***");
		});

		it("should handle credit card numbers without dashes", () => {
			const message = "Card: 1234567890123456";
			const result = masker.maskMessage(message);
			expect(result).toBe("Card: ***MASKED***");
		});

		it("should not modify non-sensitive messages", () => {
			const message = "This is a normal log message";
			const result = masker.maskMessage(message);
			expect(result).toBe(message);
		});

		it("should handle non-string input gracefully", () => {
			const masker = new SensitiveDataMasker();
			expect(masker.maskMessage(null)).toBeNull();
			expect(masker.maskMessage(undefined)).toBeUndefined();
			expect(masker.maskMessage(123)).toBe(123);
		});

		it("should respect custom mask string", () => {
			const customMasker = new SensitiveDataMasker({
				maskString: "[REDACTED]",
			});
			const message = "Email: test@example.com";
			const result = customMasker.maskMessage(message);
			expect(result).toBe("Email: [REDACTED]");
		});

		it("should be disabled when config.enabled is false", () => {
			const disabledMasker = new SensitiveDataMasker({ enabled: false });
			const message = "Email: test@example.com";
			const result = disabledMasker.maskMessage(message);
			expect(result).toBe(message);
		});
	});

	describe("maskMetadata", () => {
		const masker = new SensitiveDataMasker();

		it("should mask sensitive field names", () => {
			const meta = {
				apiKey: "secret123",
				username: "admin",
				password: "pass123",
				normalField: "normal value",
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				apiKey: "***MASKED***",
				username: "***MASKED***",
				password: "***MASKED***",
				normalField: "normal value",
			});
		});

		it("should mask various API key field patterns", () => {
			const meta = {
				apiKey: "secret123",
				api_key: "secret456",
				"api-key": "secret789",
				API_KEY: "secret000",
				openaiApiKey: "secret111",
				stripe_api_key: "secret222",
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				apiKey: "***MASKED***",
				api_key: "***MASKED***",
				"api-key": "***MASKED***",
				API_KEY: "***MASKED***",
				openaiApiKey: "***MASKED***",
				stripe_api_key: "***MASKED***",
			});
		});

		it("should mask password field patterns", () => {
			const meta = {
				password: "secret123",
				passwd: "secret456",
				pwd: "secret789",
				dbPassword: "secret000",
				db_password: "secret111",
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				password: "***MASKED***",
				passwd: "***MASKED***",
				pwd: "***MASKED***",
				dbPassword: "***MASKED***",
				db_password: "***MASKED***",
			});
		});

		it("should mask token field patterns", () => {
			const meta = {
				token: "jwt123",
				accessToken: "access456",
				access_token: "access789",
				refreshToken: "refresh000",
				jwt: "jwt111",
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				token: "***MASKED***",
				accessToken: "***MASKED***",
				access_token: "***MASKED***",
				refreshToken: "***MASKED***",
				jwt: "***MASKED***",
			});
		});

		it("should mask nested objects recursively", () => {
			const meta = {
				config: {
					database: {
						password: "secret123",
						host: "localhost",
					},
					api: {
						apiKey: "key456",
					},
				},
				normalField: "value",
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				config: {
					database: {
						password: "***MASKED***",
						host: "localhost",
					},
					api: {
						apiKey: "***MASKED***",
					},
				},
				normalField: "value",
			});
		});

		it("should mask arrays recursively", () => {
			const meta = {
				configs: [
					{ apiKey: "key1", name: "config1" },
					{ password: "pass2", name: "config2" },
				],
				items: ["normal", "email@test.com", "another normal"],
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				configs: [
					{ apiKey: "***MASKED***", name: "config1" },
					{ password: "***MASKED***", name: "config2" },
				],
				items: ["normal", "***MASKED***", "another normal"],
			});
		});

		it("should handle null and undefined values", () => {
			const masker = new SensitiveDataMasker();
			expect(masker.maskMetadata(undefined)).toBeUndefined();
		});

		it("should handle non-object metadata", () => {
			const masker = new SensitiveDataMasker();
			// These will pass through unchanged since they don't match Record<string, unknown>
			expect(masker.maskMetadata("string")).toBe("string");
			expect(masker.maskMetadata(123)).toBe(123);
		});

		it("should mask string values in non-sensitive fields that contain sensitive data", () => {
			const meta = {
				message: "User logged in with email: user@example.com",
				description: "Bearer token abc123 was used",
				title: "Normal title",
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				message: "User logged in with email: ***MASKED***",
				description: "***MASKED*** abc123 was used",
				title: "Normal title",
			});
		});

		it("should respect custom patterns", () => {
			const customMasker = new SensitiveDataMasker({
				customPatterns: ["customSecret", "myPrivateField"],
			});

			const meta = {
				customSecret: "secret123",
				myPrivateField: "private456",
				normalField: "normal",
			};

			const result = customMasker.maskMetadata(meta);
			expect(result).toEqual({
				customSecret: "***MASKED***",
				myPrivateField: "***MASKED***",
				normalField: "normal",
			});
		});

		it("should be disabled when config.enabled is false", () => {
			const disabledMasker = new SensitiveDataMasker({ enabled: false });
			const meta = {
				apiKey: "secret123",
				password: "pass123",
			};

			const result = disabledMasker.maskMetadata(meta);
			expect(result).toBe(meta);
		});
	});

	describe("integration scenarios", () => {
		const masker = new SensitiveDataMasker();

		it("should handle complex nested structures with mixed sensitive data", () => {
			const meta = {
				user: {
					email: "user@example.com",
					name: "John Doe",
					credentials: {
						password: "secret123",
						apiKey: "key456",
					},
				},
				logs: [
					"User authenticated with Bearer abc123",
					"Normal log entry",
					{ message: "Auth failed", token: "failed_token" },
				],
				config: {
					database: {
						host: "localhost",
						port: 5432,
						connectionString: "postgresql://user:pass@host/db",
					},
				},
			};

			const result = masker.maskMetadata(meta);
			expect(result).toEqual({
				user: {
					email: "***MASKED***", // email in field value gets masked by string masking
					name: "John Doe",
					credentials: {
						password: "***MASKED***",
						apiKey: "***MASKED***",
					},
				},
				logs: [
					"User authenticated with ***MASKED***", // Bearer token masked
					"Normal log entry",
					{ message: "Auth failed", token: "***MASKED***" },
				],
				config: {
					database: {
						host: "localhost",
						port: 5432,
						connectionString: "***MASKED***",
					},
				},
			});
		});

		it("should handle edge cases with circular references gracefully", () => {
			const meta: Record<string, unknown> = {
				apiKey: "secret123",
				normal: "value",
			};
			// Create circular reference
			meta["self"] = meta;

			// Should not throw an error and should handle circular references
			const result = masker.maskMetadata(meta) as Record<string, unknown>;
			expect(result).toHaveProperty("apiKey", "***MASKED***");
			expect(result).toHaveProperty("normal", "value");
			expect(result).toHaveProperty("self", "[Circular]");
		});
	});
});
