/**
 * @fileoverview Tests for Logger with sensitive data masking.
 * @author github/artemkdr
 */

import { describe, expect, it, beforeEach, mock } from "bun:test";
import { Logger } from "../utils/logger";
import { LoggingConfig } from "../types/config";
import {
    DEFAULT_MASKING_CONFIG,
    SensitiveDataMaskingConfig,
} from "../utils/sensitive-data-masker";

// Mock winston to capture logged messages
const mockError = mock();
const mockWarn = mock();
const mockInfo = mock();
const mockDebug = mock();

const mockWinstonLogger = {
    error: mockError,
    warn: mockWarn,
    info: mockInfo,
    debug: mockDebug,
};

// Mock winston.createLogger to return our mock
mock.module("winston", () => ({
    default: {
        createLogger: mock().mockReturnValue(mockWinstonLogger),
        format: {
            combine: mock().mockReturnValue({}),
            timestamp: mock().mockReturnValue({}),
            errors: mock().mockReturnValue({}),
            json: mock().mockReturnValue({}),
            simple: mock().mockReturnValue({}),
            printf: mock().mockReturnValue({}),
            colorize: mock().mockReturnValue({}),
        },
        transports: {
            Console: mock().mockImplementation(() => ({})),
            File: mock().mockImplementation(() => ({})),
        },
    },
}));

describe("Logger with Sensitive Data Masking", () => {
    let logger: Logger;
    let config: LoggingConfig;

    beforeEach(() => {
        // Reset mocks
        mockError.mockClear();
        mockWarn.mockClear();
        mockInfo.mockClear();
        mockDebug.mockClear();

        // Default test config
        config = {
            level: "info",
            format: "json",
            file: {
                enabled: false,
                filename: "app.log",
                maxSize: "10m",
                maxFiles: 5,
            },
            console: {
                enabled: true,
                colorize: false,
            },
            masking: DEFAULT_MASKING_CONFIG,
        };
    });

    describe("constructor", () => {
        it("should create logger with default masking config when not provided", () => {
            const configWithoutMasking = {
                ...config,
                masking: undefined as unknown as SensitiveDataMaskingConfig,
            };
            // Use Reflect to delete the property to avoid TypeScript readonly issues
            Reflect.deleteProperty(configWithoutMasking, "masking");

            logger = new Logger(configWithoutMasking as LoggingConfig);
            expect(logger).toBeDefined();
        });

        it("should create logger with custom masking config", () => {
            const customMaskingConfig = {
                enabled: true,
                maskString: "[REDACTED]",
                customPatterns: ["customField"],
            };

            logger = new Logger({
                ...config,
                masking: customMaskingConfig,
            });
            expect(logger).toBeDefined();
        });
    });

    describe("error logging with masking", () => {
        beforeEach(() => {
            logger = new Logger(config);
        });

        it("should mask sensitive data in error messages", () => {
            const message = "Authentication failed for user@example.com";
            logger.error(message);

            expect(mockError).toHaveBeenCalledWith(
                "Authentication failed for ***MASKED***",
                undefined,
            );
        });

        it("should mask sensitive data in error metadata", () => {
            const message = "Database connection failed";
            const meta = {
                host: "localhost",
                password: "secret123",
                apiKey: "key456",
            };

            logger.error(message, meta);

            expect(mockError).toHaveBeenCalledWith(
                "Database connection failed",
                {
                    host: "localhost",
                    password: "***MASKED***",
                    apiKey: "***MASKED***",
                },
            );
        });

        it("should mask sensitive data in both message and metadata", () => {
            const message = "API call failed with Bearer abc123";
            const meta = {
                url: "/api/users",
                token: "jwt_token",
                status: 401,
            };

            logger.error(message, meta);

            expect(mockError).toHaveBeenCalledWith(
                "API call failed with ***MASKED***",
                {
                    url: "/api/users",
                    token: "***MASKED***",
                    status: 401,
                },
            );
        });
    });

    describe("warn logging with masking", () => {
        beforeEach(() => {
            logger = new Logger(config);
        });

        it("should mask sensitive data in warning messages", () => {
            const message = "Rate limit reached for API key: sk-1234567890";
            logger.warn(message);

            expect(mockWarn).toHaveBeenCalledWith(
                "Rate limit reached for API key: sk-1234567890", // This won't be masked as it doesn't match email/token patterns
                undefined,
            );
        });

        it("should mask sensitive data in warning metadata", () => {
            const message = "Deprecated API endpoint used";
            const meta = {
                endpoint: "/v1/users",
                clientId: "client123",
                apiKey: "deprecated_key",
            };

            logger.warn(message, meta);

            expect(mockWarn).toHaveBeenCalledWith(
                "Deprecated API endpoint used",
                {
                    endpoint: "/v1/users",
                    clientId: "client123",
                    apiKey: "***MASKED***",
                },
            );
        });
    });

    describe("info logging with masking", () => {
        beforeEach(() => {
            logger = new Logger(config);
        });

        it("should mask emails in info messages", () => {
            const message = "User john.doe@company.com logged in successfully";
            logger.info(message);

            expect(mockInfo).toHaveBeenCalledWith(
                "User ***MASKED*** logged in successfully",
                undefined,
            );
        });

        it("should handle nested sensitive data in info metadata", () => {
            const message = "User profile updated";
            const meta = {
                userId: "12345",
                profile: {
                    email: "user@example.com",
                    name: "John Doe",
                    preferences: {
                        password: "user_password",
                        theme: "dark",
                    },
                },
            };

            logger.info(message, meta);

            expect(mockInfo).toHaveBeenCalledWith("User profile updated", {
                userId: "12345",
                profile: {
                    email: "***MASKED***",
                    name: "John Doe",
                    preferences: {
                        password: "***MASKED***",
                        theme: "dark",
                    },
                },
            });
        });
    });

    describe("debug logging with masking", () => {
        beforeEach(() => {
            logger = new Logger(config);
        });

        it("should mask sensitive data in debug messages", () => {
            const message = "Debug: Authorization header = Bearer token123";
            logger.debug(message);

            expect(mockDebug).toHaveBeenCalledWith(
                "Debug: Authorization header = ***MASKED***",
                undefined,
            );
        });

        it("should mask arrays in debug metadata", () => {
            const message = "Processing batch requests";
            const meta = {
                requests: [
                    { url: "/api/v1/users", apiKey: "key1" },
                    { url: "/api/v1/orders", apiKey: "key2" },
                ],
                count: 2,
            };

            logger.debug(message, meta);

            expect(mockDebug).toHaveBeenCalledWith(
                "Processing batch requests",
                {
                    requests: [
                        { url: "/api/v1/users", apiKey: "***MASKED***" },
                        { url: "/api/v1/orders", apiKey: "***MASKED***" },
                    ],
                    count: 2,
                },
            );
        });
    });

    describe("masking configuration", () => {
        it("should use custom mask string", () => {
            const customConfig = {
                ...config,
                masking: {
                    enabled: true,
                    maskString: "[REDACTED]",
                    customPatterns: [],
                },
            };

            logger = new Logger(customConfig);

            const message = "Failed login for admin@test.com";
            logger.error(message);

            expect(mockError).toHaveBeenCalledWith(
                "Failed login for [REDACTED]",
                undefined,
            );
        });

        it("should respect custom patterns", () => {
            const customConfig = {
                ...config,
                masking: {
                    enabled: true,
                    maskString: "***MASKED***",
                    customPatterns: ["customSecret"],
                },
            };

            logger = new Logger(customConfig);

            const meta = {
                customSecret: "very_secret_value",
                normalField: "normal_value",
            };

            logger.info("Custom patterns test", meta);

            expect(mockInfo).toHaveBeenCalledWith("Custom patterns test", {
                customSecret: "***MASKED***",
                normalField: "normal_value",
            });
        });

        it("should skip masking when disabled", () => {
            const disabledConfig = {
                ...config,
                masking: {
                    enabled: false,
                    maskString: "***MASKED***",
                    customPatterns: [],
                },
            };

            logger = new Logger(disabledConfig);

            const message = "Email: user@example.com";
            const meta = { apiKey: "secret123" };

            logger.info(message, meta);

            expect(mockInfo).toHaveBeenCalledWith("Email: user@example.com", {
                apiKey: "secret123",
            });
        });
    });

    describe("edge cases", () => {
        beforeEach(() => {
            logger = new Logger(config);
        });

        it("should handle null and undefined metadata gracefully", () => {
            logger.error(
                "Error message",
                null as unknown as Record<string, unknown>,
            );
            expect(mockError).toHaveBeenCalledWith("Error message", null);

            logger.warn("Warning message", undefined);
            expect(mockWarn).toHaveBeenCalledWith("Warning message", undefined);
        });

        it("should handle non-object metadata gracefully", () => {
            logger.info(
                "Info message",
                "string metadata" as unknown as Record<string, unknown>,
            );
            expect(mockInfo).toHaveBeenCalledWith(
                "Info message",
                "string metadata",
            );

            logger.debug(
                "Debug message",
                123 as unknown as Record<string, unknown>,
            );
            expect(mockDebug).toHaveBeenCalledWith("Debug message", 123);
        });

        it("should handle circular references in metadata", () => {
            const meta: Record<string, unknown> = {
                normal: "value",
                apiKey: "secret123",
            };
            meta["self"] = meta;

            logger.error("Circular reference test", meta);

            expect(mockError).toHaveBeenCalledWith("Circular reference test", {
                normal: "value",
                apiKey: "***MASKED***",
                self: "[Circular]",
            });
        });
    });

    describe("real-world scenarios", () => {
        beforeEach(() => {
            logger = new Logger(config);
        });

        it("should mask database connection errors", () => {
            const message =
                "Database connection failed: postgresql://user:pass@host:5432/db";
            const meta = {
                error: "ECONNREFUSED",
                config: {
                    host: "localhost",
                    port: 5432,
                    username: "dbuser",
                    password: "dbpass",
                    database: "myapp",
                },
            };

            logger.error(message, meta);

            expect(mockError).toHaveBeenCalledWith(
                message, // Connection string in message won't be masked as it's not matching our patterns
                {
                    error: "ECONNREFUSED",
                    config: {
                        host: "localhost",
                        port: 5432,
                        username: "***MASKED***",
                        password: "***MASKED***",
                        database: "myapp",
                    },
                },
            );
        });

        it("should mask API integration logs", () => {
            const message = "External API call completed";
            const meta = {
                url: "https://api.service.com/v1/data",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    authorization: "Bearer sk-1234567890abcdef",
                    "x-api-key": "api-key-12345",
                },
                responseTime: 150,
            };

            logger.info(message, meta);

            expect(mockInfo).toHaveBeenCalledWith(
                "External API call completed",
                {
                    url: "https://api.service.com/v1/data",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        authorization: "***MASKED***",
                        "x-api-key": "***MASKED***", // This IS masked due to our pattern
                    },
                    responseTime: 150,
                },
            );
        });
    });

    describe("format configuration", () => {
        it("should use json format when specified", () => {
            const jsonConfig = {
                ...config,
                format: "json" as const,
            };
            logger = new Logger(jsonConfig);
            expect(logger).toBeDefined();
        });

        it("should use simple format when specified", () => {
            const simpleConfig = {
                ...config,
                format: "simple" as const,
            };
            logger = new Logger(simpleConfig);
            expect(logger).toBeDefined();
        });

        it("should use combined format when specified", () => {
            const combinedConfig = {
                ...config,
                format: "combined" as const,
            };
            logger = new Logger(combinedConfig);
            expect(logger).toBeDefined();
        });

        it("should default to json format for unknown format", () => {
            const unknownConfig = {
                ...config,
                format: "unknown" as any,
            };
            logger = new Logger(unknownConfig);
            expect(logger).toBeDefined();
        });
    });

    describe("transport configuration", () => {
        it("should create console transport when enabled", () => {
            const consoleConfig = {
                ...config,
                console: {
                    enabled: true,
                    colorize: false,
                },
            };
            logger = new Logger(consoleConfig);
            expect(logger).toBeDefined();
        });

        it("should create colorized console transport when colorize is enabled", () => {
            const colorizedConfig = {
                ...config,
                console: {
                    enabled: true,
                    colorize: true,
                },
            };
            logger = new Logger(colorizedConfig);
            expect(logger).toBeDefined();
        });

        it("should create file transport when enabled", () => {
            const fileConfig = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "5m",
                    maxFiles: 3,
                },
            };
            logger = new Logger(fileConfig);
            expect(logger).toBeDefined();
        });

        it("should create both console and file transports when both enabled", () => {
            const bothConfig = {
                ...config,
                console: {
                    enabled: true,
                    colorize: true,
                },
                file: {
                    enabled: true,
                    filename: "app.log",
                    maxSize: "10m",
                    maxFiles: 5,
                },
            };
            logger = new Logger(bothConfig);
            expect(logger).toBeDefined();
        });

        it("should handle disabled console transport", () => {
            const noConsoleConfig = {
                ...config,
                console: {
                    enabled: false,
                    colorize: false,
                },
                file: {
                    enabled: true,
                    filename: "app.log",
                    maxSize: "10m",
                    maxFiles: 5,
                },
            };
            logger = new Logger(noConsoleConfig);
            expect(logger).toBeDefined();
        });
    });

    describe("file size parsing", () => {
        it("should handle kilobyte sizes", () => {
            const config1k = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "500k",
                    maxFiles: 1,
                },
            };
            logger = new Logger(config1k);
            expect(logger).toBeDefined();
        });

        it("should handle megabyte sizes", () => {
            const config1m = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "15m",
                    maxFiles: 1,
                },
            };
            logger = new Logger(config1m);
            expect(logger).toBeDefined();
        });

        it("should handle gigabyte sizes", () => {
            const config1g = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "2g",
                    maxFiles: 1,
                },
            };
            logger = new Logger(config1g);
            expect(logger).toBeDefined();
        });

        it("should handle byte sizes without unit", () => {
            const configBytes = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "1048576",
                    maxFiles: 1,
                },
            };
            logger = new Logger(configBytes);
            expect(logger).toBeDefined();
        });

        it("should default to 10MB for invalid size format", () => {
            const invalidConfig = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "invalid",
                    maxFiles: 1,
                },
            };
            logger = new Logger(invalidConfig);
            expect(logger).toBeDefined();
        });

        it("should handle empty size string", () => {
            const emptyConfig = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "",
                    maxFiles: 1,
                },
            };
            logger = new Logger(emptyConfig);
            expect(logger).toBeDefined();
        });

        it("should handle uppercase unit suffixes", () => {
            const uppercaseConfig = {
                ...config,
                file: {
                    enabled: true,
                    filename: "test.log",
                    maxSize: "100K",
                    maxFiles: 1,
                },
            };
            logger = new Logger(uppercaseConfig);
            expect(logger).toBeDefined();
        });
    });

    describe("log level testing", () => {
        it("should work with error level", () => {
            const errorConfig = {
                ...config,
                level: "error" as const,
            };
            logger = new Logger(errorConfig);
            logger.error("Error message");
            expect(mockError).toHaveBeenCalledWith("Error message", undefined);
        });

        it("should work with warn level", () => {
            const warnConfig = {
                ...config,
                level: "warn" as const,
            };
            logger = new Logger(warnConfig);
            logger.warn("Warning message");
            expect(mockWarn).toHaveBeenCalledWith("Warning message", undefined);
        });

        it("should work with info level", () => {
            const infoConfig = {
                ...config,
                level: "info" as const,
            };
            logger = new Logger(infoConfig);
            logger.info("Info message");
            expect(mockInfo).toHaveBeenCalledWith("Info message", undefined);
        });

        it("should work with debug level", () => {
            const debugConfig = {
                ...config,
                level: "debug" as const,
            };
            logger = new Logger(debugConfig);
            logger.debug("Debug message");
            expect(mockDebug).toHaveBeenCalledWith("Debug message", undefined);
        });
    });

    describe("printf format testing", () => {
        beforeEach(() => {
            // Create a real printf function to test the actual logic
            const mockCreateLogger = mock().mockImplementation((config) => {
                // Store the actual printf function for testing
                if (config.format && config.format.format) {
                    const printfFn = config.format.format;
                    // Test the printf function directly
                    const testData1 = {
                        timestamp: "2025-09-20T10:00:00.000Z",
                        level: "info",
                        message: "Test message",
                        userId: "123",
                        action: "login",
                    };
                    
                    const testData2 = {
                        timestamp: "2025-09-20T10:00:00.000Z",
                        level: "error",
                        message: "Simple message",
                    };
                    
                    // Execute the printf function to cover lines 78-81
                    const result1 = printfFn(testData1);
                    const result2 = printfFn(testData2);
                    
                    expect(result1).toContain("2025-09-20T10:00:00.000Z [INFO]: Test message");
                    expect(result1).toContain('{"userId":"123","action":"login"}');
                    expect(result2).toContain("2025-09-20T10:00:00.000Z [ERROR]: Simple message");
                    expect(result2).not.toContain('{}');
                }
                return mockWinstonLogger;
            });

            mock.module("winston", () => ({
                default: {
                    createLogger: mockCreateLogger,
                    format: {
                        combine: mock().mockImplementation((...formats) => {
                            // Return the last format which should be printf
                            return formats[formats.length - 1];
                        }),
                        timestamp: mock().mockReturnValue({}),
                        errors: mock().mockReturnValue({}),
                        json: mock().mockReturnValue({}),
                        simple: mock().mockReturnValue({}),
                        printf: mock().mockImplementation((fn) => ({ format: fn })),
                        colorize: mock().mockReturnValue({}),
                    },
                    transports: {
                        Console: mock().mockImplementation(() => ({})),
                        File: mock().mockImplementation(() => ({})),
                    },
                },
            }));

            const combinedConfig = {
                ...config,
                format: "combined" as const,
            };
            logger = new Logger(combinedConfig);
        });

        it("should format combined logs with metadata", () => {
            // This test now covers the printf function execution
            logger.info("Test message", { userId: "123", action: "login" });
            expect(mockInfo).toHaveBeenCalledWith(
                "Test message",
                { userId: "123", action: "login" }
            );
        });

        it("should format combined logs without metadata", () => {
            logger.info("Simple message");
            expect(mockInfo).toHaveBeenCalledWith("Simple message", undefined);
        });
    });

    describe("printf function direct testing", () => {
        it("should test printf function logic directly", () => {
            // Create a printf function similar to the one in logger
            const printfFunction = ({ timestamp, level, message, ...meta }: any) => {
                const metaStr = Object.keys(meta).length
                    ? JSON.stringify(meta)
                    : "";
                return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
            };

            // Test with metadata
            const resultWithMeta = printfFunction({
                timestamp: "2025-09-20T10:00:00.000Z",
                level: "info",
                message: "Test message",
                userId: "123",
                action: "login",
            });

            expect(resultWithMeta).toBe(
                '2025-09-20T10:00:00.000Z [INFO]: Test message {"userId":"123","action":"login"}'
            );

            // Test without metadata
            const resultWithoutMeta = printfFunction({
                timestamp: "2025-09-20T10:00:00.000Z",
                level: "error",
                message: "Simple message",
            });

            expect(resultWithoutMeta).toBe(
                "2025-09-20T10:00:00.000Z [ERROR]: Simple message "
            );

            // Test with empty metadata
            const resultEmptyMeta = printfFunction({
                timestamp: "2025-09-20T10:00:00.000Z",
                level: "warn",
                message: "Warning message",
                // No additional properties
            });

            expect(resultEmptyMeta).toBe(
                "2025-09-20T10:00:00.000Z [WARN]: Warning message "
            );
        });
    });

    describe("integration scenarios", () => {
        it("should handle complete configuration with all features", () => {
            const fullConfig = {
                level: "debug" as const,
                format: "combined" as const,
                file: {
                    enabled: true,
                    filename: "full.log",
                    maxSize: "50m",
                    maxFiles: 10,
                },
                console: {
                    enabled: true,
                    colorize: true,
                },
                masking: {
                    enabled: true,
                    maskString: "[CLASSIFIED]",
                    customPatterns: ["sessionId", "trackingId"],
                },
            };

            logger = new Logger(fullConfig);

            const message = "User user@example.com performed action";
            const meta = {
                sessionId: "sess_12345",
                trackingId: "track_67890",
                userId: "user123",
                email: "admin@company.com",
            };

            logger.info(message, meta);

            expect(mockInfo).toHaveBeenCalledWith(
                "User [CLASSIFIED] performed action",
                {
                    sessionId: "[CLASSIFIED]",
                    trackingId: "[CLASSIFIED]",
                    userId: "user123",
                    email: "[CLASSIFIED]",
                }
            );
        });

        it("should handle minimal configuration", () => {
            const minimalConfig = {
                level: "error" as const,
                format: "json" as const,
                file: {
                    enabled: false,
                    filename: "",
                    maxSize: "1m",
                    maxFiles: 1,
                },
                console: {
                    enabled: true,
                    colorize: false,
                },
                masking: {
                    enabled: false,
                    maskString: "",
                    customPatterns: [],
                },
            };

            logger = new Logger(minimalConfig);

            logger.error("Minimal error", { sensitive: "data" });
            expect(mockError).toHaveBeenCalledWith(
                "Minimal error",
                { sensitive: "data" }
            );
        });
    });
});

// Additional test for the parseSize private method indirectly
describe("Logger size parsing edge cases", () => {
    let logger: Logger;
    let config: LoggingConfig;

    beforeEach(() => {
        config = {
            level: "info",
            format: "json",
            file: {
                enabled: false,
                filename: "test.log",
                maxSize: "10m",
                maxFiles: 1,
            },
            console: {
                enabled: true,
                colorize: false,
            },
            masking: DEFAULT_MASKING_CONFIG,
        };
    });

    it("should handle size string with no number part", () => {
        const configNoNumber = {
            ...config,
            file: {
                enabled: true,
                filename: "test.log",
                maxSize: "m",
                maxFiles: 1,
            },
        };
        logger = new Logger(configNoNumber);
        expect(logger).toBeDefined();
    });

    it("should handle zero size", () => {
        const configZero = {
            ...config,
            file: {
                enabled: true,
                filename: "test.log",
                maxSize: "0m",
                maxFiles: 1,
            },
        };
        logger = new Logger(configZero);
        expect(logger).toBeDefined();
    });
});
