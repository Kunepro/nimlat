// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { _upsertMediaCharacters } from "./_upsert-media-characters";
import { _upsertMediaGenres } from "./_upsert-media-genres";
import { _upsertMediaTags } from "./_upsert-media-tags";

describe(
	"media metadata upserts",
	() => {
		it(
			"writes media junction rows with the canonical internal media id",
			() => {
				const insertGenreRun      = vi.fn();
				const selectGenreGet      = vi.fn(() => ({ id: 44 }));
				const insertMediaGenreRun = vi.fn();
				const insertTagRun        = vi.fn();
				const insertMediaTagRun   = vi.fn();
				const insertCharacterRun  = vi.fn();
				const insertMediaCharacterRun = vi.fn();
				const deleteVoiceActorsRun = vi.fn();
				const insertVoiceActorRun  = vi.fn();
				const database            = {
					prepare: vi.fn((sql: string) => {
						if (sql.includes("INSERT OR IGNORE INTO anime_data.genres")) {
							return { run: insertGenreRun };
						}
						if (sql.includes("SELECT id FROM anime_data.genres")) {
							return { get: selectGenreGet };
						}
						if (sql.includes("INSERT OR IGNORE INTO anime_data.mediaGenres")) {
							return { run: insertMediaGenreRun };
						}
						if (sql.includes("INTO anime_data.tags")) {
							return { run: insertTagRun };
						}
						if (sql.includes("INSERT OR IGNORE INTO anime_data.mediaTags")) {
							return { run: insertMediaTagRun };
						}
						if (sql.includes("INTO anime_data.characters")) {
							return { run: insertCharacterRun };
						}
						if (sql.includes("DELETE FROM anime_data.mediaCharacterVoiceActors")) {
							return { run: deleteVoiceActorsRun };
						}
						if (sql.includes("INTO anime_data.mediaCharacterVoiceActors")) {
							return { run: insertVoiceActorRun };
						}
						if (sql.includes("INTO anime_data.mediaCharacters")) {
							return { run: insertMediaCharacterRun };
						}

						throw new Error(`Unexpected SQL in media metadata upsert test: ${ sql }`);
					}),
				};

				_upsertMediaGenres(
					database as never,
					987,
					{
						id:     123,
						genres: [ "Action" ],
					} as never,
				);
				_upsertMediaTags(
					database as never,
					987,
					{
						id:   123,
						tags: [
							{
								id:               55,
								name:             "Space",
								description:      "space",
								category:         "Setting",
								rank:             91,
								isGeneralSpoiler: false,
								isMediaSpoiler:   false,
							},
						],
					} as never,
				);
				_upsertMediaCharacters(
					database as never,
					987,
					{
						id:         123,
						characters: {
							edges: [
								{
									role: "MAIN",
									node: {
										id:    66,
										name:  {
											full:   "Spike Spiegel",
											native: "スパイク・スピーゲル",
										},
										image: { large: "https://example.com/spike.png" },
									},
									voiceActors: [
										{
											id:       77,
											name:     { full: "Koichi Yamadera" },
											language: "Japanese",
											image:    { large: "https://example.com/koichi.png" },
										},
									],
								},
							],
						},
					} as never,
				);

				expect(insertMediaGenreRun).toHaveBeenCalledWith(
					987,
					44,
				);
				expect(insertMediaTagRun).toHaveBeenCalledWith(
					987,
					55,
				);
				expect(insertMediaCharacterRun).toHaveBeenCalledWith(
					{
						mediaId:     987,
						characterId: 66,
						role:        "MAIN",
					},
				);
				expect(deleteVoiceActorsRun).toHaveBeenCalledWith(
					987,
					66,
				);
				expect(insertVoiceActorRun).toHaveBeenCalledWith(
					{
						mediaId:             987,
						characterId:         66,
						voiceActorId:        77,
						voiceActorName:      "Koichi Yamadera",
						voiceActorLanguage:  "Japanese",
						voiceActorImageJson: "{\"large\":\"https://example.com/koichi.png\"}",
						sortOrder:           0,
					},
				);
			},
		);
	},
);
