export function typeSafeError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === "string") {
		return new Error(error);
	}

	if (typeof error === "object" && error !== null) {
		const message = (error as { message?: string }).message;
		if (typeof message === "string") {
			return new Error(message);
		}
	}

	return new Error("Unknown error");
}
