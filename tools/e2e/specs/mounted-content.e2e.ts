import {
	expect,
	test,
} from "@playwright/test";
import type { NimlatE2ETestContext } from "../e2e-test-context";
import {
	evaluateRenderer,
	openHarnessPage,
	runMainCommand,
	waitForRendererCondition,
} from "../playwright-electron-helpers";

export function registerMountedContentTests(context: NimlatE2ETestContext): void {
	test(
		"mounted episode status unsupported reasons",
		async () => {
			const electronApp = context.getElectronApp();
			const { ids }     = context.getSnapshot();
			const cases       = [
				{
					mediaId:   ids.missingMalMedia,
					search:    `?mediaId=${ ids.missingMalMedia }`,
					condition: "document.body.textContent?.includes('no episode mapping') ?? false",
				},
				{
					mediaId:   ids.missingJikanMedia,
					search:    `?mediaId=${ ids.missingJikanMedia }`,
					condition: "document.body.textContent?.includes('Episode intel unavailable') ?? false",
				},
				{
					mediaId:   ids.offlineEpisodeMedia,
					search:    `?mediaId=${ ids.offlineEpisodeMedia }&offline=1`,
					condition: "document.body.textContent?.includes('Episode updates are waiting for the network') ?? false",
				},
				{
					mediaId:   ids.transientFailureMedia,
					search:    `?mediaId=${ ids.transientFailureMedia }`,
					condition: "document.body.textContent?.includes('Episode updates failed') ?? false",
				},
			];
			for (const statusCase of cases) {
				const opened = await openHarnessPage(
					electronApp,
					"episode-status",
					{ search: statusCase.search },
				);
				try {
					await waitForRendererCondition(
						opened.page,
						statusCase.condition,
					);
					if (statusCase.mediaId === ids.transientFailureMedia) {
						await waitForRendererCondition(
							opened.page,
							"document.body.textContent?.includes('Temporary mocked Jikan failure') ?? false",
						);
					}
				} finally {
					await runMainCommand(
						electronApp,
						"destroyWindow",
						[ opened.windowId ],
					);
				}
			}

			const noThumbnailWindow = await openHarnessPage(
				electronApp,
				"episode-status",
				{ search: `?mediaId=${ ids.noThumbnailMedia }` },
			);
			try {
				await waitForRendererCondition(
					noThumbnailWindow.page,
					"(document.body.textContent?.length ?? 0) > 0",
				);
				const noThumbnailSnapshot = await evaluateRenderer<{
					text: string;
					issue: { status?: string; reason?: string } | null;
				}>(
					noThumbnailWindow.page,
					`Promise.resolve({
						text: document.body.textContent || '',
						issue: await window.electronAPI.groupExplorer.getMediaEpisodeUpdatesIssue(${ ids.noThumbnailMedia })
					})`,
				);
				expect(noThumbnailSnapshot.issue).toBeNull();
				expect(noThumbnailSnapshot.text).toContain("Refresh episodes");
			} finally {
				await runMainCommand(
					electronApp,
					"destroyWindow",
					[ noThumbnailWindow.windowId ],
				);
			}
		},
	);
}
