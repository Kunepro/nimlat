import { MediaDto } from "@nimlat/types/anime-db";
import {
	ReleaseDateResolverInput,
	ResolvedReleaseDate,
} from "@nimlat/types/release-watch";

type ReleaseDateMediaDto = Pick<
	MediaDto,
	| "nextAiringEpisodeJson"
	| "startDateYear"
	| "startDateMonth"
	| "startDateDay"
>;

function isPositiveFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value);
}

function isValidMonth(month: number): boolean {
	return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidUtcDate(year: number, month: number, day: number): boolean {
	if (!Number.isInteger(year) || !isValidMonth(month) || !Number.isInteger(day) || day < 1 || day > 31) {
		return false;
	}

	const date = new Date(Date.UTC(
		year,
		month - 1,
		day,
	));

	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === month - 1
		&& date.getUTCDate() === day;
}

function resolveStartDate(
	startDate: ReleaseDateResolverInput["startDate"],
): ResolvedReleaseDate | null {
	const year = startDate?.year;
	if (!isInteger(year)) {
		return null;
	}

	const month = startDate?.month;
	const day   = startDate?.day;

	if (isInteger(month) && isInteger(day) && isValidUtcDate(
		year,
		month,
		day,
	)) {
		return {
			resolvedReleaseAt:    Date.UTC(
				year,
				month - 1,
				day,
			),
			releaseDatePrecision: "date",
			releaseDateSource:    "media_start_date",
		};
	}

	if (isInteger(month) && isValidMonth(month)) {
		return {
			resolvedReleaseAt:    Date.UTC(
				year,
				month - 1,
				1,
			),
			releaseDatePrecision: "month",
			releaseDateSource:    "media_start_date",
		};
	}

	return {
		resolvedReleaseAt:    Date.UTC(
			year,
			0,
			1,
		),
		releaseDatePrecision: "year",
		releaseDateSource:    "media_start_date",
	};
}

function readNextAiringEpisodeFromJson(nextAiringEpisodeJson?: string | null): ReleaseDateResolverInput["nextAiringEpisode"] {
	if (!nextAiringEpisodeJson) {
		return null;
	}

	try {
		const parsed = JSON.parse(nextAiringEpisodeJson) as unknown;
		if (typeof parsed !== "object" || parsed === null || !("airingAt" in parsed)) {
			return null;
		}

		const airingAt = parsed.airingAt;
		return typeof airingAt === "number"
			? { airingAt }
			: null;
	} catch {
		return null;
	}
}

/**
 * Normalizes provider-backed Media timing facts into the stable release-watch read-model field set.
 * Renderer code must consume these resolved fields instead of ranking provider date semantics itself.
 */
export class ReleaseDateResolver {
	public static resolve(input: ReleaseDateResolverInput): ResolvedReleaseDate {
		if (isPositiveFiniteNumber(input.nextAiringEpisode?.airingAt)) {
			return {
				resolvedReleaseAt:    input.nextAiringEpisode.airingAt * 1000,
				releaseDatePrecision: "timestamp",
				releaseDateSource:    "next_airing_episode",
			};
		}

		const startDateResolution = resolveStartDate(input.startDate);
		if (startDateResolution) {
			return startDateResolution;
		}

		if (isPositiveFiniteNumber(input.providerReleaseAt)) {
			return {
				resolvedReleaseAt:    input.providerReleaseAt,
				releaseDatePrecision: "timestamp",
				releaseDateSource:    "provider_release_at",
			};
		}

		return {
			resolvedReleaseAt:    null,
			releaseDatePrecision: "unknown",
			releaseDateSource:    "none",
		};
	}

	public static resolveMediaDto(media: ReleaseDateMediaDto): ResolvedReleaseDate {
		return this.resolve({
			nextAiringEpisode: readNextAiringEpisodeFromJson(media.nextAiringEpisodeJson),
			startDate:         {
				year:  media.startDateYear,
				month: media.startDateMonth,
				day:   media.startDateDay,
			},
		});
	}

	public static getPastAndTimelineSortTimestamp(releaseDate: ResolvedReleaseDate): number {
		return releaseDate.resolvedReleaseAt ?? Number.NEGATIVE_INFINITY;
	}

	public static getUpcomingSortTimestamp(releaseDate: ResolvedReleaseDate): number | null {
		return releaseDate.resolvedReleaseAt;
	}
}
