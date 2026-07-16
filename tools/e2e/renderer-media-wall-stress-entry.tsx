import {
	StrictMode,
	useMemo,
	useState,
} from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "../../src/renderer/index.css";
import {
	PixiMediaWallHost,
	PixiMediaWallRenderer,
} from "../../src/renderer/media-wall";
import type {
	MediaWallDataSource,
	MediaWallItem,
	MediaWallLoadedRange,
	MediaWallRangeRequest,
} from "../../src/renderer/types/media-wall";
import ThemeProvider from "../../src/renderer/wrappers/ThemeProvider";
import "./renderer-media-wall-stress-entry.css";

const STRESS_TOTAL_ITEMS    = 20_000;
const STRESS_IMAGE_VARIANTS = Array.from(
	{ length: 128 },
	(_, index) => {
		const hue = (index * 37) % 360;
		return `data:image/svg+xml;charset=UTF-8,${ encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">
  <rect width="240" height="360" rx="12" fill="hsl(${ hue } 72% 28%)"/>
  <circle cx="120" cy="146" r="70" fill="hsl(${ (hue + 55) % 360 } 86% 52%)" fill-opacity="0.68"/>
  <text x="120" y="310" text-anchor="middle" fill="white" font-family="Segoe UI, sans-serif" font-size="34">${ index }</text>
</svg>
`) }`;
	},
);

interface StressMediaWallItem {
	id: string;
	title: string;
	subtitle: string;
	progressPercent: number;
	thumbnailUrl: string;
}

interface StressHarnessState {
	rangeRequests: Array<{
		offset: number;
		limit: number;
		search: string;
	}>;
	rangeLoadedCount: number;
}

declare global {
	interface Window {
		__mediaWallStress?: StressHarnessState;
	}
}

function createStressItem(index: number): StressMediaWallItem {
	return {
		id:              `stress:${ index }`,
		title:           `Stress Media ${ index.toString().padStart(
			5,
			"0",
		) }`,
		subtitle:        index % 3 === 0 ? "TV" : index % 3 === 1 ? "MOVIE" : "OVA",
		progressPercent: index % 101,
		thumbnailUrl:    STRESS_IMAGE_VARIANTS[ index % STRESS_IMAGE_VARIANTS.length ] ?? "",
	};
}

function mapStressItem(item: StressMediaWallItem): MediaWallItem {
	return {
		id:              item.id,
		title:           item.title,
		subtitle:        item.subtitle,
		thumbnailUrl:    item.thumbnailUrl,
		progressPercent: item.progressPercent,
		kind:            "library",
	};
}

function createStressDataSource(state: StressHarnessState): MediaWallDataSource<StressMediaWallItem> {
	return {
		loadRange: async (request: MediaWallRangeRequest): Promise<MediaWallLoadedRange<StressMediaWallItem>> => {
			state.rangeRequests.push({
				offset: request.offset,
				limit:  request.limit,
				search: request.search,
			});
			const offset                       = Math.max(
				0,
				Math.min(
					STRESS_TOTAL_ITEMS,
					Math.floor(request.offset),
				),
			);
			const limit                        = Math.max(
				0,
				Math.floor(request.limit),
			);
			const end                          = Math.min(
				STRESS_TOTAL_ITEMS,
				offset + limit,
			);
			const items: StressMediaWallItem[] = [];
			for (let index = offset; index < end; index += 1) {
				items.push(createStressItem(index));
			}

			return {
				offset,
				total: STRESS_TOTAL_ITEMS,
				items,
			};
		},
	};
}

function MediaWallStressHarness() {
	const state                     = useMemo<StressHarnessState>(
		() => ({
			rangeRequests:    [],
			rangeLoadedCount: 0,
		}),
		[],
	);
	const [ , setRangeLoadedCount ] = useState(0);
	const dataSource                = useMemo(
		() => createStressDataSource(state),
		[ state ],
	);
	const renderer                  = useMemo(
		() => new PixiMediaWallRenderer<StressMediaWallItem>({
			mapItem:              mapStressItem,
			maxThumbnailTextures: 96,
		}),
		[],
	);
	window.__mediaWallStress        = state;

	return (
		<div className="stressShell">
			<PixiMediaWallHost
				ariaLabel="20k media wall stress harness"
				className="stressWall"
				dataKey="stress-20k"
				dataSource={ dataSource }
				search=""
				testId="media-wall-stress"
				maximumRequestItems={ 220 }
				renderer={ renderer }
				diagnosticsMode="on"
				onRangeLoaded={ () => {
					state.rangeLoadedCount += 1;
					setRangeLoadedCount(state.rangeLoadedCount);
				} }
				getItemAriaLabel={ (item) => item.title }
			/>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Missing #root element for media-wall stress E2E renderer.");
}

createRoot(rootElement).render(
	<StrictMode>
		<ThemeProvider>
			<MediaWallStressHarness/>
		</ThemeProvider>
	</StrictMode>,
);
