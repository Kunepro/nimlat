import { createCombinedSearchKey } from "@nimlat/functions";
import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { MediaDto } from "@nimlat/types/anime-db";
import { Database } from "better-sqlite3";
import { resolveOrSeedCanonicalMediaIdByAniListId } from "../../canonical/canonical-id-resolution";
import { resolveMediaPrimaryName } from "./resolve-media-primary-name";

const COLUMNS = [
	"mediaId",
	"idAniList",
	"idMal",
	"name",
	"nameJapanese",
	"nameRomanji",
	"nameSearchKey",
	"type",
	"format",
	"status",
	"description",
	"startDateYear",
	"startDateMonth",
	"startDateDay",
	"endDateYear",
	"endDateMonth",
	"endDateDay",
	"season",
	"seasonYear",
	"episodesCount",
	"countryOfOrigin",
	"source",
	"trailerJson",
	"updatedAt",
	"lastUpdatedAt",
	"coverImageJson",
	"bannerImage",
	"customImageUrl",
	"averageScore",
	"meanScore",
	"popularity",
	"isAdult",
	"isStub",
	"nextAiringEpisodeJson",
	"nextAiringEpisode",
	"airingScheduleJson",
] as const;

// noinspection SqlResolve
const STMT_INSERT_OR_REPLACE = `
    INSERT OR
    REPLACE
    INTO anime_data.media (${ COLUMNS.join(", ") })
    VALUES (${ COLUMNS.map(c => `@${ c }`).join(", ") })
`;

// Insert or update one canonical media row and return the canonical Nimlat id.
// Callers need the resolved id because AniList ids are provider ids, not the
// long-term internal key for post-upsert work such as queueing and grouping.
export function _upsertMedia(db: Database, media: AniListMedia): number {
	const upsertMedia       = db.prepare<MediaDto, MediaDto>(STMT_INSERT_OR_REPLACE);
	const existingImageStmt = db.prepare<[ number ], Pick<MediaDto, "customImageUrl">>(`
      SELECT customImageUrl
      FROM anime_data.media
      WHERE mediaId = ?
	`);
	const mediaId           = resolveOrSeedCanonicalMediaIdByAniListId(
		db,
		media.id,
	);
	const existingImageRow  = existingImageStmt.get(mediaId);
	const primaryName = resolveMediaPrimaryName(media.title);

	upsertMedia.run({
		mediaId,
		idAniList:             media.id,
		idMal:                 media.idMal,
		name:          primaryName,
		nameJapanese:          media.title?.native,
		nameRomanji:           media.title?.romaji,
		nameSearchKey: createCombinedSearchKey([
			primaryName,
			media.title?.romaji,
			media.title?.native,
			`Media ${ mediaId }`,
		]),
		type:                  media.type,
		format:                media.format,
		status:                media.status,
		description:           media.description,
		startDateYear:         media.startDate?.year,
		startDateMonth:        media.startDate?.month,
		startDateDay:          media.startDate?.day,
		endDateYear:           media.endDate?.year,
		endDateMonth:          media.endDate?.month,
		endDateDay:            media.endDate?.day,
		season:                media.season,
		seasonYear:            media.seasonYear,
		episodesCount:         media.episodes,
		countryOfOrigin:       media.countryOfOrigin,
		source:                media.source,
		trailerJson:           JSON.stringify(media.trailer),
		updatedAt:             media.updatedAt,
		lastUpdatedAt:         Date.now(), // Current timestamp for when the data was last updated
		coverImageJson:        JSON.stringify(media.coverImage),
		bannerImage:           media.bannerImage,
		customImageUrl:        existingImageRow?.customImageUrl ?? null,
		averageScore:          media.averageScore,
		meanScore:             media.meanScore,
		popularity:            media.popularity,
		isAdult:               media.isAdult ? 1 : 0,
		isStub:                0,
		nextAiringEpisodeJson: JSON.stringify(media.nextAiringEpisode),
		nextAiringEpisode:     media.nextAiringEpisode?.airingAt || null, // Extract airingAt timestamp
		airingScheduleJson:    JSON.stringify(media.airingSchedule),
	});

	return mediaId;
}



