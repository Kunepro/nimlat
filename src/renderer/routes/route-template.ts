// Route modules use TanStack template paths from ROUTES. Interpolation stays
// centralized so default redirects do not reintroduce hardcoded path strings.
export function interpolateRouteParams(template: string, params: Record<string, string>): string {
	return Object.entries(params).reduce(
		(href, [ key, value ]) => href.replaceAll(
			`$${ key }`,
			encodeURIComponent(value),
		),
		template,
	);
}
