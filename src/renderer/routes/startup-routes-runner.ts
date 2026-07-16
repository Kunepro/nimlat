import type { AnimeDbStartupReadiness } from "@nimlat/types/ipc-payloads";
import {
	AnimeDbStartupFacade,
	UserConfigFacade,
} from "../facades";

// Startup routing depends on persisted config plus attached AnimeDB readiness.
// Keeping facade access here keeps route definitions declarative.
export function loadAnimeDbStartupReadiness(): Promise<AnimeDbStartupReadiness> {
	return AnimeDbStartupFacade.getReadiness();
}

export function loadLastRoute(): Promise<string | null> {
	return UserConfigFacade.getLastRoute();
}
