import type { ZodError } from "zod";

/**
 * DataValidationError class to represent validation errors using Zod.
 */
export class DataValidationError extends Error {
	public readonly validationErrors?:
		| Array<{ path: string; message: string }>
		| undefined;
	public readonly originalMessage: string;

	constructor(message: string, validationError?: ZodError) {
		const zodError = validationError;
		const validationErrors = zodError?.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		}));
		super(`Validation failed: ${JSON.stringify(validationErrors)}`);
		this.originalMessage = message;
		this.name = "DataValidationError";
		this.validationErrors = validationErrors;
		this.cause = validationError;
	}
}
