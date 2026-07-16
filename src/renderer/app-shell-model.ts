export function isRestorableRoute(route: string): boolean {
	return route.startsWith("/groups")
		|| route.startsWith("/populate-anime-db")
		|| route.startsWith("/release-watch")
		|| route.startsWith("/errored-content");
}
