import type {
	CreateDownloadSearchProviderRequest,
	DownloadSearchProvider,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";
import { getDatabase } from "../../../utils/get-db";
import {
	type DownloadProviderRow,
	mapDownloadProvider,
	type MaxSortOrderRow,
} from "./user-download-search-rows";

function createDownloadSearchIdSlug(value: string): string {
	return value.toLowerCase().replace(
		/[^a-z0-9]+/g,
		"-",
	).replace(
		/^-|-$/g,
		"",
	);
}

export function updateDownloadSearchProviderEnabled(providerId: string, enabled: boolean): void {
	// noinspection SqlResolve
	getDatabase()
		.prepare("UPDATE userDownloadSearchProviders SET enabled = ?, updatedAt = ? WHERE id = ?")
		.run(
			enabled ? 1 : 0,
			Date.now(),
			providerId,
		);
}

export function createDownloadSearchProvider(request: CreateDownloadSearchProviderRequest): DownloadSearchProvider {
	const now          = Date.now();
	const db           = getDatabase();
	const label        = request.label.trim();
	const baseUrl      = request.baseUrl.trim();
	const maxSortOrder = db
		.prepare("SELECT MAX(sortOrder) AS maxSortOrder FROM userDownloadSearchProviders")
		.get() as MaxSortOrderRow;
	const provider     = {
		id:        `custom-provider-${ createDownloadSearchIdSlug(label) }-${ now }`,
		label,
		category:  request.category,
		baseUrl,
		isBuiltIn: false,
		enabled:   true,
		sortOrder: (maxSortOrder.maxSortOrder ?? -1) + 1,
	};
	// noinspection SqlResolve
	db
		.prepare(`
        INSERT INTO userDownloadSearchProviders (id, label, category, baseUrl, isBuiltIn, enabled, sortOrder, updatedAt)
        VALUES (?, ?, ?, ?, 0, 1, ?, ?)
			`)
		.run(
			provider.id,
			provider.label,
			provider.category,
			provider.baseUrl,
			provider.sortOrder,
			now,
		);
	return provider;
}

export function updateDownloadSearchProvider(request: UpdateDownloadSearchProviderRequest): DownloadSearchProvider {
	const db       = getDatabase();
	const now      = Date.now();
	const existing = db
		.prepare("SELECT id, label, category, baseUrl, isBuiltIn, enabled, sortOrder FROM userDownloadSearchProviders WHERE id = ?")
		.get(request.providerId) as DownloadProviderRow | undefined;
	if (!existing) {
		throw new Error(`Unknown download search provider '${ request.providerId }'.`);
	}
	const provider = {
		...mapDownloadProvider(existing),
		label:    request.label.trim(),
		category: request.category,
		baseUrl:  request.baseUrl.trim(),
	};
	// noinspection SqlResolve
	db.prepare(`
        UPDATE userDownloadSearchProviders
           SET label = ?,
               category = ?,
               baseUrl = ?,
               updatedAt = ?
         WHERE id = ?
	`)
		.run(
			provider.label,
			provider.category,
			provider.baseUrl,
			now,
			provider.id,
		);
	return provider;
}

export function deleteDownloadSearchProvider(providerId: string): void {
	getDatabase().transaction(() => {
		// noinspection SqlResolve
		getDatabase()
			.prepare("DELETE FROM userDownloadSearchProviders WHERE id = ?")
			.run(providerId);
		// Last-used provider pointers are cache-like UI hints; clear them when
		// their provider row is deleted so future reads never point to a ghost id.
		// noinspection SqlResolve
		getDatabase()
			.prepare("UPDATE userDownloadSearchMediaState SET lastUsedProviderId = NULL, updatedAt = ? WHERE lastUsedProviderId = ?")
			.run(
				Date.now(),
				providerId,
			);
	})();
}
