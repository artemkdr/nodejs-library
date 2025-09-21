/**
 * @fileoverview Utility for masking sensitive data in logs.
 * @author github/artemkdr
 */

/**
 * Configuration for sensitive data masking.
 */
export interface SensitiveDataMaskingConfig {
	/** Whether masking is enabled (default: true) */
	readonly enabled: boolean;
	/** String to use as mask replacement (default: '***MASKED***') */
	readonly maskString: string;
	/** Additional field patterns to mask (beyond default ones) */
	readonly customPatterns: string[];
}

/**
 * Default configuration for sensitive data masking.
 */
export const DEFAULT_MASKING_CONFIG: SensitiveDataMaskingConfig = {
	enabled: true,
	maskString: "***MASKED***",
	customPatterns: [],
};

/**
 * Utility class for masking sensitive data in log messages and metadata.
 */
export class SensitiveDataMasker {
	private readonly config: SensitiveDataMaskingConfig;
	private readonly sensitiveFieldPatterns: RegExp[];
	private readonly sensitiveValuePatterns: RegExp[];

	constructor(config: Partial<SensitiveDataMaskingConfig> = {}) {
		this.config = { ...DEFAULT_MASKING_CONFIG, ...config };

		// Common sensitive field name patterns (case insensitive)
		const defaultFieldPatterns = [
			/^(.*[_-]?)?(api[_-]?key|apikey)$/i,
			/^(.*[_-]?)?(password|passwd|pwd)$/i,
			/^(.*[_-]?)?(secret|private[_-]?key)$/i,
			/^(.*[_-]?)?(token|jwt|access[_-]?token|refresh[_-]?token)$/i,
			/^(.*[_-]?)?(authorization|auth)$/i,
			/^(.*[_-]?)?(username|db[_-]?user)$/i, // Remove plain "user" to avoid false positives
			/^(.*[_-]?)?(connection[_-]?string|conn[_-]?str)$/i,
			/^(.*[_-]?)?(database[_-]?url|db[_-]?url)$/i,
		];

		// Add custom patterns
		const customFieldPatterns = this.config.customPatterns.map(
			(pattern) => new RegExp(pattern, "i"),
		);

		this.sensitiveFieldPatterns = [
			...defaultFieldPatterns,
			...customFieldPatterns,
		];

		// Sensitive value patterns
		this.sensitiveValuePatterns = [
			// Email addresses
			/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
			// Credit card numbers (basic pattern)
			/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
			// Bearer tokens in strings
			/bearer\s+[a-zA-Z0-9._-]+/gi,
			// Basic auth tokens
			/basic\s+[a-zA-Z0-9+/=]+/gi,
		];
	}

	/**
	 * Mask sensitive data in a log message.
	 */
	public maskMessage(message: unknown): unknown {
		if (!this.config.enabled || typeof message !== "string") {
			return message;
		}

		let maskedMessage = message;
		for (const pattern of this.sensitiveValuePatterns) {
			maskedMessage = maskedMessage.replace(pattern, this.config.maskString);
		}

		return maskedMessage;
	}

	/**
	 * Mask sensitive data in metadata object.
	 */
	public maskMetadata(meta: unknown): unknown {
		if (!this.config.enabled || !meta || typeof meta !== "object") {
			return meta;
		}

		return this.maskObjectRecursively(meta) as Record<string, unknown>;
	}

	/**
	 * Recursively mask sensitive data in objects.
	 */
	private maskObjectRecursively(
		obj: unknown,
		visited = new WeakSet(),
	): unknown {
		if (obj === null || obj === undefined) {
			return obj;
		}

		// Handle circular references
		if (typeof obj === "object" && visited.has(obj as object)) {
			return "[Circular]";
		}

		if (Array.isArray(obj)) {
			visited.add(obj);
			const result = obj.map((item) =>
				this.maskObjectRecursively(item, visited),
			);
			visited.delete(obj);
			return result;
		}

		if (typeof obj === "object") {
			visited.add(obj);
			const result: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(obj)) {
				const shouldMaskField = this.sensitiveFieldPatterns.some((pattern) =>
					pattern.test(key),
				);

				if (shouldMaskField) {
					result[key] = this.config.maskString;
				} else if (typeof value === "string") {
					result[key] = this.maskMessage(value);
				} else {
					result[key] = this.maskObjectRecursively(value, visited);
				}
			}

			visited.delete(obj);
			return result;
		}

		if (typeof obj === "string") {
			return this.maskMessage(obj);
		}

		return obj;
	}
}
