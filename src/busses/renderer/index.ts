import {
	createActionGroup,
	props,
} from "@nimlat/functions";

export const ActionsNetwork = createActionGroup({
	source: "[Network]",
	events: {
		"Connection Changed": props<{ isOnline: boolean }>(),
	},
});
