import { isSupportedAnimatedMediaFormat } from "@nimlat/constants/supported-media-formats";
import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { Database } from "better-sqlite3";
import { resolveOrSeedCanonicalMediaIdByAniListId } from "../../canonical/canonical-id-resolution";
import { resolveMediaPrimaryName } from "./resolve-media-primary-name";

// Persist relation edges even when the related title's own scanner window has not
// run yet. Such rows are temporary FK placeholders inside catalog generation;
// the related title's complete AniList payload replaces them later in the same
// scan. Distributed AnimeDB assets must therefore contain no unresolved stubs.
export function _upsertMediaRelations(db: Database, media: AniListMedia): void {
	// noinspection SqlResolve
	const ensureRelatedMediaExists = db.prepare(`
      INSERT INTO anime_data.media (mediaId,
                                    idAniList,
                                    idMal,
                                    name,
                                    nameJapanese,
                                    nameRomanji,
                                    format,
                                    status,
                                    description,
                                    episodesCount,
                                    lastUpdatedAt,
                                    coverImageJson,
                                    isAdult,
                                    nextAiringEpisodeJson,
                                    isStub)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(mediaId) DO UPDATE SET idAniList             = excluded.idAniList,
                                         idMal                 = excluded.idMal,
                                         name                  = excluded.name,
                                         nameJapanese          = excluded.nameJapanese,
                                         nameRomanji           = excluded.nameRomanji,
                                         format                = excluded.format,
                                         status                = excluded.status,
                                         description           = excluded.description,
                                         episodesCount         = excluded.episodesCount,
                                         lastUpdatedAt         = excluded.lastUpdatedAt,
                                         coverImageJson        = excluded.coverImageJson,
                                         isAdult               = excluded.isAdult,
                                         nextAiringEpisodeJson = excluded.nextAiringEpisodeJson
      WHERE anime_data.media.isStub = 1
	`);
	// noinspection SqlResolve
	const insertMediaRelation      = db.prepare(`
      INSERT OR IGNORE INTO anime_data.mediaRelations (mediaId,
                                                       relatedMediaId,
                                                       relationType)
      VALUES (?, ?, ?)
	`);
	const sourceMediaId            = resolveOrSeedCanonicalMediaIdByAniListId(
		db,
		media.id,
	);

	for (const edge of media.relations?.edges || []) {
		if (!edge.node.id) {
			continue;
		}

		const relatedNode = edge.node;
		if (!isSupportedAnimatedMediaFormat(relatedNode.format)) {
			continue;
		}
		const relatedMediaId = resolveOrSeedCanonicalMediaIdByAniListId(
			db,
			relatedNode.id,
		);

		ensureRelatedMediaExists.run(
			relatedMediaId,
			relatedNode.id,
			relatedNode.idMal ?? null,
			resolveMediaPrimaryName(relatedNode.title),
			relatedNode.title?.native ?? null,
			relatedNode.title?.romaji ?? null,
			relatedNode.format ?? null,
			relatedNode.status ?? null,
			relatedNode.description ?? null,
			relatedNode.episodes ?? null,
			Date.now(),
			relatedNode.coverImage ? JSON.stringify(relatedNode.coverImage) : null,
			relatedNode.isAdult == null ? null : relatedNode.isAdult ? 1 : 0,
			relatedNode.nextAiringEpisode ? JSON.stringify(relatedNode.nextAiringEpisode) : null,
			1,
		);

		insertMediaRelation.run(
			sourceMediaId,
			relatedMediaId,
			edge.relationType,
		);
	}
}
