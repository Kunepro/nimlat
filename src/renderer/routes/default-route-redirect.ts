import { redirect } from "@tanstack/react-router";
import { interpolateRouteParams } from "./route-template";

interface DefaultRouteRedirectContext {
	params: Record<string, string>;
}

export function resolveDefaultRouteRedirectHref(
	fullUrlTemplate: string,
	params: Record<string, string>,
): string {
	return interpolateRouteParams(
		fullUrlTemplate,
		params,
	);
}

export function createDefaultRouteRedirect(fullUrlTemplate: string) {
	// Index child routes should only redirect to named ROUTES templates. Keeping the
	// redirect factory centralized prevents route modules from hardcoding concrete URLs.
	return ({ params }: DefaultRouteRedirectContext): never => {
		throw redirect({
			href:    resolveDefaultRouteRedirectHref(
				fullUrlTemplate,
				params,
			),
			replace: true,
		});
	};
}
