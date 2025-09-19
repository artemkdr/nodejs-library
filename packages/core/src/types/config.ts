export interface ServerConfig {
    readonly port: number;
    readonly host: string;
    readonly apiKey: string;
    readonly cors: CorsConfig;
    readonly rateLimit: RateLimitConfig;
}

export interface CorsConfig {
    readonly origin: string | string[];
    readonly credentials: boolean;
    readonly methods: string[];
}

export interface RateLimitConfig {
    readonly windowMs: number;
    readonly maxRequests: number;
    readonly skipSuccessfulRequests: boolean;
}

export interface DatabaseConfig {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly user: string;
    readonly password: string;
    readonly ssl?: boolean;
    /** Pool configuration */
    readonly min?: number;
    readonly max?: number;
    readonly idleTimeoutMillis?: number;
}

export interface PoolConfig {
    readonly min?: number;
    readonly max?: number;
    readonly idleTimeoutMillis?: number;
}

// LLM Provider Configuration Types
export type LLMProviderType =
    | "openai"
    | "anthropic"
    | "voyageai"
    | "vertexai"
    | "cohere"
    | "groq"
    | "azure"
    | "fireworks"
    | "openrouter";

export interface LLMProviderConfig {
    readonly name: LLMProviderType;
    readonly apiKey: string;
    readonly baseUrl?: string;
    readonly timeout?: number;
    readonly rateLimitDelay?: number;
    readonly maxRetries?: number;
}

export interface LLMModelConfig {
    readonly name: string;
    readonly maxTokens?: number;
    readonly temperature?: number;
    readonly topP?: number;
    readonly dimensions?: number; // For embedding models
    readonly batchSize?: number; // For batch operations
    readonly headers?: { [key: string]: string }; // Optional headers to include in requests
    readonly thinkingBudget?: number; // For Vertex AI models
    readonly location?: string; // For Vertex AI models
}

/**
 * Configuration for a specific use case of an LLM.
 * Like a generic chat, a document summarizer or embedding, etc.
 */
export interface LLMUseCaseConfig {
    readonly provider: LLMProviderConfig;
    readonly model: LLMModelConfig;
    readonly headers?: { [key: string]: string }; // Optional headers to include in requests
    readonly fallbackProvider?: LLMProviderConfig; // Optional fallback provider
}

export interface CacheConfig {
    readonly redis: RedisConfig;
    readonly ttl: number;
}

export interface RedisConfig {
    readonly host: string;
    readonly port: number;
    readonly password?: string;
    readonly db: number;
    readonly maxRetriesPerRequest: number;
}

import { SensitiveDataMaskingConfig } from "../utils/sensitive-data-masker";

export interface LoggingConfig {
    readonly level: LogLevel;
    readonly format: LogFormat;
    readonly file: FileLogConfig;
    readonly console: ConsoleLogConfig;
    readonly masking: SensitiveDataMaskingConfig;
}

export interface FileLogConfig {
    readonly enabled: boolean;
    readonly filename: string;
    readonly maxSize: string;
    readonly maxFiles: number;
}

export interface ConsoleLogConfig {
    readonly enabled: boolean;
    readonly colorize: boolean;
}

export type LogLevel = "error" | "warn" | "info" | "debug";
export type LogFormat = "json" | "simple" | "combined";
