/**
 * DataFetchError class to represent errors during data fetching operations.
 */
export class DataFetchError extends Error {
	constructor(
		message: string,
		public readonly source?: string,
		public readonly operation?: string,
		public readonly retryCount?: number,
		originalError?: Error,
	) {
		super(message);
		this.name = "DataFetchError";
		this.cause = originalError;
	}
}
