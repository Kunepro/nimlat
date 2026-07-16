import {
	type AnyRoute,
	createRoute,
} from "@tanstack/react-router";
import { ROUTES } from "../constants/route-config";
import CharacterDetailsExplorer from "../features/character/CharacterDetailsExplorer";
import StaffDetailsExplorer from "../features/staff/StaffDetailsExplorer";
import VoiceActorDetailsExplorer from "../features/voice-actor/VoiceActorDetailsExplorer";

export function createGroupsPeopleRoutes<TParentRoute extends AnyRoute>(parentRoute: TParentRoute) {
	const characterDetailsRoute = createRoute({
		getParentRoute: () => parentRoute,
		path:           ROUTES.GROUPS.CHARACTER.ROUTE_BASE,
		component:      CharacterDetailsExplorer,
	});

	const voiceActorDetailsRoute = createRoute({
		getParentRoute: () => parentRoute,
		path:           ROUTES.GROUPS.VOICE_ACTOR.ROUTE_BASE,
		component:      VoiceActorDetailsExplorer,
	});

	const staffDetailsRoute = createRoute({
		getParentRoute: () => parentRoute,
		path:           ROUTES.GROUPS.STAFF.ROUTE_BASE,
		component:      StaffDetailsExplorer,
	});

	return [
		characterDetailsRoute,
		voiceActorDetailsRoute,
		staffDetailsRoute,
	] as const;
}
