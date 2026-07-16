import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyAnimeDbPopulateBatchEvent,
	createAnimeDbPopulateBatchResult,
	shouldCommitAnimeDbPopulateBatch,
} from "./anime-db-populate-batch-result";

describe(
	"anime-db-populate-batch-result",
	() => {
		it(
			"starts as a committable batch result",
			() => {
				const result = createAnimeDbPopulateBatchResult();

				expect(result).toEqual({ stopped: false });
				expect(shouldCommitAnimeDbPopulateBatch(result)).toBe(true);
			},
		);

		it(
			"keeps media progress events committable",
			() => {
				const result = applyAnimeDbPopulateBatchEvent(
					createAnimeDbPopulateBatchResult(),
					{
						kind:                    "mediaPersisted",
						media:                   { id: 101 } as AniListMedia,
						persistedMediaId:        101,
						wasAlreadyCounted:       false,
						highestProcessedInBatch: 101,
					},
				);

				expect(result).toEqual({ stopped: false });
				expect(shouldCommitAnimeDbPopulateBatch(result)).toBe(true);
			},
		);

		it(
			"marks a stopped batch as non-committable",
			() => {
				const result = applyAnimeDbPopulateBatchEvent(
					createAnimeDbPopulateBatchResult(),
					{ kind: "stopped" },
				);

				expect(result).toEqual({ stopped: true });
				expect(shouldCommitAnimeDbPopulateBatch(result)).toBe(false);
			},
		);
	},
);
