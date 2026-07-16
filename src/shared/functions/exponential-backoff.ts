export interface ExponentialBackoffOptions {
	baseSeconds: number;
	maxSeconds: number;
	attempt: number;
}

export function exponentialBackoffSeconds(options: ExponentialBackoffOptions): number {
	const safeAttempt = Math.max(
		0,
		options.attempt,
	);
	const multgrouplier = Math.pow(
		2,
		safeAttempt,
	);
	const delay         = options.baseSeconds * multgrouplier;
	return Math.min(
		delay,
		options.maxSeconds,
	);
}
