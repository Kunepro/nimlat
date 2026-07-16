export class NonRetriableAnimeDbPopulateError extends Error {
	public constructor(
		message: string,
		public readonly originalError: Error,
		public readonly logContext?: Record<string, unknown>,
	) {
		super(message);
		this.name = "NonRetriableAnimeDbPopulateError";
	}
}
