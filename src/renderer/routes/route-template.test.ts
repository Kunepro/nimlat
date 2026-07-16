import {
	describe,
	expect,
	it,
} from "vitest";
import { interpolateRouteParams } from "./route-template";

describe(
	"interpolateRouteParams",
	() => {
		it(
			"fills TanStack route template params with encoded values",
			() => {
				expect(interpolateRouteParams(
					"/groups/$groupSource/$groupId/medias/$mediaId/details",
					{
						groupId:     "A/B",
						groupSource: "user",
						mediaId:     "10 20",
					},
				)).toBe("/groups/user/A%2FB/medias/10%2020/details");
			},
		);
	},
);
