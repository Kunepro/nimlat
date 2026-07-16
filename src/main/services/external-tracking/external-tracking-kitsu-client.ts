import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type {
	ExternalTrackingImportedMedia,
	ExternalTrackingProvider,
	ExternalTrackingPushItem,
} from "@nimlat/types/external-tracking";
import {
	defaultIfEmpty,
	lastValueFrom,
	Observable,
} from "rxjs";
import {
	asArray,
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getExternalTrackingHttpStatus,
	parseIsoDate,
} from "./external-tracking-client-utils";
import { ensureKitsuAccessToken } from "./external-tracking-kitsu-auth";
import type {
	ExternalTrackingProviderClient,
	ExternalTrackingPushProgressEvent,
} from "./external-tracking-providers";

const KITSU_API_ORIGIN                = "https://kitsu.io";
const KITSU_API_BASE                  = `${ KITSU_API_ORIGIN }/api/edge`;
const KITSU_LIBRARY_LOOKUP_BATCH_SIZE = 100;
const KITSU_MAPPING_LOOKUP_BATCH_SIZE = 20;

interface KitsuImportReferences {
	animeById: Map<string, Record<string, unknown>>;
	mappingById: Map<string, Record<string, unknown>>;
}

function readResourceId(value: unknown): string | null {
	return asString(asRecord(value).id);
}

function readKitsuUserName(value: unknown): string | null {
	return asString(asRecord(asRecord(value).attributes).name);
}

function hasSameKitsuUserName(value: unknown, expectedName: string): boolean {
	const name = readKitsuUserName(value);
	return name?.localeCompare(
		expectedName,
		undefined,
		{ sensitivity: "accent" },
	) === 0;
}

function readRelationshipData(resource: Record<string, unknown>, relationship: string): unknown {
	return asRecord(asRecord(resource.relationships)[ relationship ]).data;
}

function collectImportReferences(included: unknown[]): KitsuImportReferences {
	const animeById   = new Map<string, Record<string, unknown>>();
	const mappingById = new Map<string, Record<string, unknown>>();
	for (const value of included) {
		const resource = asRecord(value);
		const id       = asString(resource.id);
		if (!id) continue;
		if (resource.type === "anime") animeById.set(
			id,
			resource,
		);
		if (resource.type === "mappings") mappingById.set(
			id,
			resource,
		);
	}
	return {
		animeById,
		mappingById,
	};
}

function findExternalId(
	anime: Record<string, unknown>,
	mappingById: Map<string, Record<string, unknown>>,
	externalSite: string,
): string | null {
	for (const mappingReference of asArray(readRelationshipData(
		anime,
		"mappings",
	))) {
		const mappingId = readResourceId(mappingReference);
		const mapping   = mappingId ? mappingById.get(mappingId) : null;
		if (!mapping) continue;
		const attributes = asRecord(mapping.attributes);
		if (attributes.externalSite === externalSite) {
			return asString(attributes.externalId);
		}
	}
	return null;
}

function readKitsuImportedMedia(
	value: unknown,
	references: KitsuImportReferences,
): ExternalTrackingImportedMedia | null {
	const entry        = asRecord(value);
	const kitsuAnimeId = readResourceId(readRelationshipData(
		entry,
		"anime",
	));
	const anime        = kitsuAnimeId ? references.animeById.get(kitsuAnimeId) : null;
	const attributes   = asRecord(entry.attributes);
	const animeAttrs   = asRecord(anime?.attributes);
	const status       = asString(attributes.status);
	const malId        = anime ? Number(findExternalId(
		anime,
		references.mappingById,
		"myanimelist/anime",
	)) : Number.NaN;
	const aniListId    = anime ? Number(findExternalId(
		anime,
		references.mappingById,
		"anilist/anime",
	)) : Number.NaN;
	if (!kitsuAnimeId) return null;
	const episodesCount = asNumber(animeAttrs.episodeCount);
	const isWatched     = status === "completed";

	return {
		providerMediaId: kitsuAnimeId,
		idKitsu:         kitsuAnimeId,
		idMal:           Number.isFinite(malId) ? malId : null,
		idAniList:       Number.isFinite(aniListId) ? aniListId : null,
		isWatched,
		// Kitsu library entries expose aggregate progress only. Import partial
		// progress as no episode evidence unless the whole title is completed.
		watchedEpisodeCount: isWatched ? episodesCount ?? asNumber(attributes.progress) ?? 0 : 0,
		episodesCount,
		watchedAt:           parseIsoDate(attributes.finishedAt) ?? parseIsoDate(attributes.progressedAt),
		rawStatus:           status,
	};
}

function getTrustedKitsuNextUrl(value: unknown): string | null {
	const next = asString(value);
	if (!next) return null;
	const url = new URL(
		next,
		KITSU_API_BASE,
	);
	// Pagination URLs are remote input. Restrict them to Kitsu's JSON:API path
	// so an unexpected response cannot turn an authenticated request into SSRF.
	if (url.origin !== KITSU_API_ORIGIN || !url.pathname.startsWith("/api/edge/")) {
		throw new Error("Kitsu returned an untrusted pagination URL.");
	}
	return url.toString();
}

function readAnimeRelationshipId(mapping: Record<string, unknown>): string | null {
	const item = asRecord(readRelationshipData(
		mapping,
		"item",
	));
	return item.type === "anime" ? asString(item.id) : null;
}

export class KitsuTrackingClient implements ExternalTrackingProviderClient {
	provider: ExternalTrackingProvider = "kitsu";

	async testConnection(account: ExternalTrackingAccountSecretRow): Promise<void> {
		await this.getCurrentUserId(account);
	}

	async importWatched(account: ExternalTrackingAccountSecretRow): Promise<ExternalTrackingImportedMedia[]> {
		const userId = await this.getCurrentUserId(account);
		return this.importLibrary(
			url => this.request(
				account,
				url,
			),
			userId,
		);
	}

	async importPublicProfile(username: string): Promise<ExternalTrackingImportedMedia[]> {
		const normalizedUsername = username.trim();
		if (!normalizedUsername) throw new Error("Kitsu username is required.");
		const userId = await this.resolvePublicUserId(normalizedUsername);
		if (!userId) throw new Error(`Kitsu public profile "${ normalizedUsername }" was not found.`);

		return this.importLibrary(
			url => this.requestPublic(url),
			userId,
		);
	}

	async pushWatchedBatch(
		account: ExternalTrackingAccountSecretRow,
		items: ExternalTrackingPushItem[],
	): Promise<void> {
		await lastValueFrom(this.streamWatchedBatchPush(
			account,
			items,
		).pipe(defaultIfEmpty(null)));
	}

	streamWatchedBatchPush(
		account: ExternalTrackingAccountSecretRow,
		items: ExternalTrackingPushItem[],
	): Observable<ExternalTrackingPushProgressEvent> {
		return new Observable((subscriber) => {
			void (async () => {
				if (items.length === 0) return;
				const userId = await this.getCurrentUserId(account);
				await this.resolveKitsuAnimeIds(
					account,
					items,
				);
				const animeIds          = items.map(item => item.idKitsu as string);
				const existingEntryById = await this.getExistingLibraryEntries(
					account,
					userId,
					animeIds,
				);

				for (const [ index, item ] of items.entries()) {
					const animeId    = item.idKitsu as string;
					const entryId    = existingEntryById.get(animeId);
					const attributes = {
						// Kitsu cannot address watched episode identities. Explicit export is
						// binary so a sparse local state is never converted into a prefix.
						status:   item.isWatched ? "completed" : "planned",
						progress: item.isWatched
												? Math.max(
								0,
								Math.trunc(item.episodesCount ?? item.watchedEpisodeCount),
							)
												: 0,
					};
					await this.request(
						account,
						entryId ? `${ KITSU_API_BASE }/library-entries/${ entryId }` : `${ KITSU_API_BASE }/library-entries`,
						{
							method:  entryId ? "PATCH" : "POST",
							headers: { "Content-Type": "application/vnd.api+json" },
							body:    JSON.stringify({
								data: {
									type: "libraryEntries",
									...(entryId ? { id: entryId } : {}),
									attributes,
									...(!entryId ? {
										relationships: {
											user:  {
												data: {
													type: "users",
													id:   userId,
												},
											},
											anime: {
												data: {
													type: "anime",
													id:   animeId,
												},
											},
										},
									} : {}),
								},
							}),
						},
					);
					subscriber.next({
						completedItems: index + 1,
						totalItems:     items.length,
					});
				}
			})().then(
				() => subscriber.complete(),
				(error: unknown) => subscriber.error(error),
			);
		});
	}

	private async resolvePublicUserId(identifier: string): Promise<string | null> {
		if (/^\d+$/u.test(identifier)) {
			try {
				const payload  = asRecord(await this.requestPublic(
					`${ KITSU_API_BASE }/users/${ encodeURIComponent(identifier) }`,
				));
				const directId = readResourceId(payload.data);
				if (directId) return directId;
			} catch (error) {
				if (getExternalTrackingHttpStatus(error) !== 404) throw error;
			}
		}

		const slugUrl = new URL(`${ KITSU_API_BASE }/users`);
		slugUrl.searchParams.set(
			"filter[slug]",
			identifier,
		);
		slugUrl.searchParams.set(
			"page[limit]",
			"1",
		);
		const slugPayload = asRecord(await this.requestPublic(slugUrl.toString()));
		const slugId      = readResourceId(asArray(slugPayload.data)[ 0 ]);
		if (slugId) return slugId;

		// Recently created Kitsu accounts can have a null slug even though their
		// public profile and library already exist, so fall back to the exact name.
		const nameUrl = new URL(`${ KITSU_API_BASE }/users`);
		nameUrl.searchParams.set(
			"filter[name]",
			identifier,
		);
		nameUrl.searchParams.set(
			"page[limit]",
			"20",
		);
		const namePayload = asRecord(await this.requestPublic(nameUrl.toString()));
		const exactUser   = asArray(namePayload.data).find(value => hasSameKitsuUserName(
			value,
			identifier,
		));
		return readResourceId(exactUser);
	}

	private async importLibrary(
		requestPage: (url: string) => Promise<unknown>,
		userId: string,
	): Promise<ExternalTrackingImportedMedia[]> {
		const firstPage = new URL(`${ KITSU_API_BASE }/library-entries`);
		firstPage.searchParams.set(
			"filter[userId]",
			userId,
		);
		firstPage.searchParams.set(
			"filter[kind]",
			"anime",
		);
		firstPage.searchParams.set(
			"include",
			"anime.mappings",
		);
		firstPage.searchParams.set(
			"page[limit]",
			"500",
		);
		const items: ExternalTrackingImportedMedia[] = [];
		let nextUrl: string | null                   = firstPage.toString();

		while (nextUrl) {
			const payload    = asRecord(await requestPage(nextUrl));
			const references = collectImportReferences(asArray(payload.included));
			items.push(...asArray(payload.data)
				.map(entry => readKitsuImportedMedia(
					entry,
					references,
				))
				.filter((item): item is ExternalTrackingImportedMedia => item !== null));
			nextUrl = getTrustedKitsuNextUrl(asRecord(payload.links).next);
		}

		return items;
	}

	private async request(account: ExternalTrackingAccountSecretRow, url: string, init: RequestInit = {}): Promise<unknown> {
		const execute = async (forceRefresh: boolean): Promise<unknown> => {
			const token   = await ensureKitsuAccessToken(
				account,
				forceRefresh,
			);
			const headers = new Headers(init.headers);
			headers.set(
				"Accept",
				"application/vnd.api+json",
			);
			headers.set(
				"Authorization",
				`Bearer ${ token }`,
			);
			return fetchJson(
				url,
				{
					...init,
					headers,
				},
			);
		};

		try {
			return await execute(false);
		} catch (error) {
			if (getExternalTrackingHttpStatus(error) !== 401) throw error;
			return execute(true);
		}
	}

	private async requestPublic(url: string): Promise<unknown> {
		return fetchJson(
			url,
			{ headers: { Accept: "application/vnd.api+json" } },
		);
	}

	private async getCurrentUserId(account: ExternalTrackingAccountSecretRow): Promise<string> {
		const payload = asRecord(await this.request(
			account,
			`${ KITSU_API_BASE }/users?filter[self]=true&page[limit]=1`,
		));
		const id      = readResourceId(asArray(payload.data)[ 0 ]);
		if (!id) throw new Error("Kitsu did not return the current user id.");
		return id;
	}

	private async resolveKitsuAnimeIds(
		account: ExternalTrackingAccountSecretRow,
		items: ExternalTrackingPushItem[],
	): Promise<void> {
		const unresolved = items.filter((item) => {
			const knownId = item.idKitsu ?? item.providerMediaId;
			if (!knownId) return true;
			item.idKitsu         = knownId;
			item.providerMediaId = knownId;
			return false;
		});
		await this.resolveMappings(
			account,
			unresolved,
			"myanimelist/anime",
			item => item.idMal?.toString() ?? null,
		);
		await this.resolveMappings(
			account,
			unresolved.filter(item => !item.idKitsu),
			"anilist/anime",
			item => item.idAniList?.toString() ?? null,
		);

		const unresolvedCount = items.filter(item => !item.idKitsu).length;
		if (unresolvedCount > 0) {
			throw new Error(`Kitsu could not resolve ${ unresolvedCount } anime identifier(s).`);
		}
	}

	private async resolveMappings(
		account: ExternalTrackingAccountSecretRow,
		items: ExternalTrackingPushItem[],
		externalSite: string,
		getExternalId: (item: ExternalTrackingPushItem) => string | null,
	): Promise<void> {
		const itemByExternalId = new Map<string, ExternalTrackingPushItem>();
		for (const item of items) {
			const externalId = getExternalId(item);
			if (externalId) itemByExternalId.set(
				externalId,
				item,
			);
		}
		if (itemByExternalId.size === 0) return;

		const externalIds = Array.from(itemByExternalId.keys());
		// MappingResource uses Kitsu's default paginator, whose hard maximum is 20.
		// Chunk both the filter and limit so every requested ID can be resolved.
		for (let offset = 0; offset < externalIds.length; offset += KITSU_MAPPING_LOOKUP_BATCH_SIZE) {
			const batch = externalIds.slice(
				offset,
				offset + KITSU_MAPPING_LOOKUP_BATCH_SIZE,
			);
			const url   = new URL(`${ KITSU_API_BASE }/mappings`);
			url.searchParams.set(
				"filter[externalSite]",
				externalSite,
			);
			url.searchParams.set(
				"filter[externalId]",
				batch.join(","),
			);
			// Relationship linkage is omitted by default, just like library entries.
			url.searchParams.set(
				"include",
				"item",
			);
			url.searchParams.set(
				"fields[anime]",
				"id",
			);
			url.searchParams.set(
				"page[limit]",
				batch.length.toString(),
			);
			const payload = asRecord(await this.request(
				account,
				url.toString(),
			));
			for (const value of asArray(payload.data)) {
				const mapping    = asRecord(value);
				const externalId = asString(asRecord(mapping.attributes).externalId);
				const animeId    = readAnimeRelationshipId(mapping);
				const item       = externalId ? itemByExternalId.get(externalId) : null;
				if (!item || !animeId) continue;
				// Resolution applies only to this explicit export request. It does not
				// persist provider work or mapping state as a hidden side effect.
				item.idKitsu         = animeId;
				item.providerMediaId = animeId;
			}
		}
	}

	private async getExistingLibraryEntries(
		account: ExternalTrackingAccountSecretRow,
		userId: string,
		animeIds: string[],
	): Promise<Map<string, string>> {
		const result = new Map<string, string>();
		// Bound filter URLs independently of the pending export size. Kitsu omits
		// relationship linkage unless anime is included, so request only its ID.
		for (let offset = 0; offset < animeIds.length; offset += KITSU_LIBRARY_LOOKUP_BATCH_SIZE) {
			const batch = animeIds.slice(
				offset,
				offset + KITSU_LIBRARY_LOOKUP_BATCH_SIZE,
			);
			const url   = new URL(`${ KITSU_API_BASE }/library-entries`);
			url.searchParams.set(
				"filter[userId]",
				userId,
			);
			url.searchParams.set(
				"filter[animeId]",
				batch.join(","),
			);
			url.searchParams.set(
				"include",
				"anime",
			);
			url.searchParams.set(
				"fields[anime]",
				"id",
			);
			url.searchParams.set(
				"page[limit]",
				batch.length.toString(),
			);
			const payload = asRecord(await this.request(
				account,
				url.toString(),
			));
			for (const value of asArray(payload.data)) {
				const entry   = asRecord(value);
				const entryId = asString(entry.id);
				const animeId = readResourceId(readRelationshipData(
					entry,
					"anime",
				));
				if (entryId && animeId) result.set(
					animeId,
					entryId,
				);
			}
		}
		return result;
	}
}
