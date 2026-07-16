import { KEY_USER_DB_PREFERRED_TITLE_LANGUAGE } from "@nimlat/constants/main/database-user-keys";

function configuredTitleLanguageSql(): string {
	return `COALESCE(
		(SELECT settingValue FROM config WHERE settingKey = '${ KEY_USER_DB_PREFERRED_TITLE_LANGUAGE }'),
		'english'
	)`;
}

function nonBlankTextSql(expression: string): string {
	return `NULLIF(TRIM(${ expression }), '')`;
}

export function preferredMediaTitleSql(mediaAlias: string, fallbackSql: string): string {
	const english = nonBlankTextSql(`${ mediaAlias }.name`);
	const romaji  = nonBlankTextSql(`${ mediaAlias }.nameRomanji`);
	const native  = nonBlankTextSql(`${ mediaAlias }.nameJapanese`);

	return `CASE ${ configuredTitleLanguageSql() }
		WHEN 'romaji' THEN COALESCE(${ romaji }, ${ english }, ${ native }, ${ fallbackSql })
		WHEN 'native' THEN COALESCE(${ native }, ${ english }, ${ romaji }, ${ fallbackSql })
		ELSE COALESCE(${ english }, ${ romaji }, ${ native }, ${ fallbackSql })
	END`;
}

export function preferredEpisodeTitleSql(episodeAlias: string, fallbackSql: string): string {
	const english = nonBlankTextSql(`${ episodeAlias }.name`);
	const romaji  = nonBlankTextSql(`${ episodeAlias }.nameRomanji`);
	const native  = nonBlankTextSql(`${ episodeAlias }.nameJapanese`);

	return `CASE ${ configuredTitleLanguageSql() }
		WHEN 'romaji' THEN COALESCE(${ romaji }, ${ english }, ${ native }, ${ fallbackSql })
		WHEN 'native' THEN COALESCE(${ native }, ${ english }, ${ romaji }, ${ fallbackSql })
		ELSE COALESCE(${ english }, ${ romaji }, ${ native }, ${ fallbackSql })
	END`;
}
