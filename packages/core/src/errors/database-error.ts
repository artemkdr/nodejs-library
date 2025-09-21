/**
 * DatabaseError class to represent database-related errors.
 */
export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly source?: string,
		public readonly operation?: string,
		originalError?: Error,
	) {
		super(message);
		this.name = "DatabaseError";
		this.cause = originalError;
	}
}
