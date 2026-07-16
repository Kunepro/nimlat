import type {
	CharacterInspectionData,
	StaffInspectionData,
	VoiceActorInspectionData,
} from "@nimlat/types/ipc-payloads";
import { GroupExplorerFacade } from "../../facades";

// Read-side boundary for people detail routes. Route hooks own lifecycle and
// stale-response guards; this runner only delegates to preload/IPC.
export function getCharacterInspection(characterId: number): Promise<CharacterInspectionData | null> {
	return GroupExplorerFacade.getCharacterInspection(characterId);
}

export function getStaffInspection(staffId: number): Promise<StaffInspectionData | null> {
	return GroupExplorerFacade.getStaffInspection(staffId);
}

export function getVoiceActorInspection(voiceActorId: number): Promise<VoiceActorInspectionData | null> {
	return GroupExplorerFacade.getVoiceActorInspection(voiceActorId);
}
