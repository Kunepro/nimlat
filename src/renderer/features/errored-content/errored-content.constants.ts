import type { ErroredContentQueue } from "@nimlat/types/ipc-payloads";
import type { QueueFilter } from "../../types/errored-content";

export const PAGE_LIMIT            = 50;
export const HYDRATION_RETRY_LIMIT = 3;

export const QUEUE_LABELS: Record<ErroredContentQueue, string> = {
	characters:                 "Characters",
	staff:                      "Staff",
	"jikan-episodes":           "Episode updates",
	"jikan-episode-thumbnails": "Episode thumbnails",
};

export const QUEUE_OPTIONS: Array<{ label: string; value: QueueFilter }> = [
	{
		label: "All queues",
		value: "all",
	},
	{
		label: QUEUE_LABELS.characters,
		value: "characters",
	},
	{
		label: QUEUE_LABELS.staff,
		value: "staff",
	},
	{
		label: QUEUE_LABELS[ "jikan-episodes" ],
		value: "jikan-episodes",
	},
	{
		label: QUEUE_LABELS[ "jikan-episode-thumbnails" ],
		value: "jikan-episode-thumbnails",
	},
];
