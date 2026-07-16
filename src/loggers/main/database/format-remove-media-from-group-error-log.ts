export function formatRemoveMediaFromGroupErrorLog(
	groupId: number,
	mediaId: number,
	timestamp: number,
	error: Error,
): string {
	return `
Error removing media from group
Group ID: ${ groupId }
Media idAniList: ${ mediaId }
Timestamp: ${ new Date(timestamp).toISOString() }

Database Error:
${ error.message }
${ error.stack || "" }
`;
}
