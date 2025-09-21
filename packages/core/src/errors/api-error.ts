/**
 * APIError class to represent errors from API calls.
 */
export class APIError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly service?: string,
		originalError?: Error,
	) {
		super(message);
		this.name = "APIError";
		this.cause = originalError;
	}
}
