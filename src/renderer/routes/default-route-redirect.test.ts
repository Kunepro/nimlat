import {
	describe,
	expect,
	it,
} from "vitest";
import { resolveDefaultRouteRedirectHref } from "./default-route-redirect";

describe(
	"resolveDefaultRouteRedirectHref",
	() => {
		it(
			"fills route template params for default child redirects",
			() => {
				expect(resolveDefaultRouteRedirectHref(
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
