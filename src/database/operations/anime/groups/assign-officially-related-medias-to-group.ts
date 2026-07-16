import { Database } from "better-sqlite3";
import { _assignMediasToGroup } from "./assign-medias-to-group";

export function _assignOfficiallyRelatedMediasToGroup(
	db: Database,
	groupId: number,
	idAniListsOfficiallyLinkedToIp: number[],
) {
	_assignMediasToGroup(
		db,
		groupId,
		idAniListsOfficiallyLinkedToIp,
		true,
	);
}
