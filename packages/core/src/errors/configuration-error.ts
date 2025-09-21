/**
 * ConfigurationError class to represent configuration-related errors.
 */
export class ConfigurationError extends Error {
	constructor(
		message: string,
		public readonly configKey?: string,
	) {
		super(message);
		this.name = "ConfigurationError";
	}
}
