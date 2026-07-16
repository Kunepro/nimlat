export function formatMediaInsertErrorLog(
	media: { id?: number | null; idMal?: number | null },
	timestamp: number,
	dbError: Error,
	dbErrorLoggingError: Error,
): string {
	return `
Error inserting media with idAniList: ${ media.id || "unknown" }
Media idMal: ${ media.idMal || "unknown" }
Timestamp: ${ new Date(timestamp).toISOString() }

Database Error:
${ dbError.message }
${ dbError.stack || "" }

Logging Error:
${ dbErrorLoggingError.message }
${ dbErrorLoggingError.stack || "" }

Media Payload:
${ JSON.stringify(
		media,
		null,
		2,
	) }
`;
}


