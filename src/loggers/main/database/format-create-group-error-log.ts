import { GroupBlueprintDto } from "@nimlat/types/anime-db";

export function formatCreateGroupErrorLog(
	group: Omit<GroupBlueprintDto, "id">,
	timestamp: number,
	dbError: Error,
): string {
	return `
Error creating group with name: ${ group.name || "unknown" }
Timestamp: ${ new Date(timestamp).toISOString() }

Database Error:
${ dbError.message }
${ dbError.stack || "" }

Group Payload:
${ JSON.stringify(
		group,
		null,
		2,
	) }
`;
}


