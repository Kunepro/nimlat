import { renderToStaticMarkup } from "react-dom/server";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import AnimeDbUpdateStatusCard from "./AnimeDbUpdateStatusCard";

vi.mock(
	"@ant-design/icons",
	() => ({
		DatabaseOutlined: () => null,
		DownloadOutlined: () => null,
		ReloadOutlined:   () => null,
	}),
);

describe(
	"AnimeDbUpdateStatusCard",
	() => {
		it(
			"offers remote check and scanner navigation while disabling a same-version download",
			() => {
				const markup = renderToStaticMarkup(
					<AnimeDbUpdateStatusCard
						animeDbReleaseStatusMessage="You already have the latest AnimeDB version."
						canDownloadAnimeDb={ false }
						installedAnimeDbVersion="anime-db-v2026.07.02"
						isAnimeDbReleaseStatusLoading={ false }
						latestAnimeDbVersion="anime-db-v2026.07.02"
						releaseErrorMessage={ null }
						onCheckAnimeDbReleaseStatus={ vi.fn() }
						onOpenAnimeDbDownload={ vi.fn() }
						onOpenAnimeDbScanner={ vi.fn() }
					/>,
				);

				expect(markup).toContain("Check AnimeDB updates");
				expect(markup).toContain("Open Catalog Scanner");
				expect(markup).not.toContain("Refresh catalog");
				expect(markup).toContain("ant-alert-success");
				expect(markup).toMatch(/<button[^>]*disabled[^>]*>.*Download AnimeDB/s);
			},
		);

		it(
			"uses an informational state when a newer AnimeDB release is available",
			() => {
				const markup = renderToStaticMarkup(
					<AnimeDbUpdateStatusCard
						animeDbReleaseStatusMessage="anime-db-v2026.07.03 is available."
						canDownloadAnimeDb
						installedAnimeDbVersion="anime-db-v2026.07.02"
						isAnimeDbReleaseStatusLoading={ false }
						latestAnimeDbVersion="anime-db-v2026.07.03"
						releaseErrorMessage={ null }
						onCheckAnimeDbReleaseStatus={ vi.fn() }
						onOpenAnimeDbDownload={ vi.fn() }
						onOpenAnimeDbScanner={ vi.fn() }
					/>,
				);

				expect(markup).toContain("ant-alert-info");
				expect(markup).not.toMatch(/<button[^>]*disabled[^>]*>.*Download AnimeDB/s);
			},
		);
	},
);
