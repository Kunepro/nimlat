import { UserDbGroupingMutationFacade } from "./user-db-grouping-mutation.facade";
import { UserDbGroupingReadFacade } from "./user-db-grouping-read.facade";
import { UserDbGroupingStateFacade } from "./user-db-grouping-state.facade";

// Public grouping control panel kept as the stable facade surface for
// UserDbFacade.grouping consumers. Sub-panels keep the facade thin without
// forcing callers to know where each operation is implemented.
export const UserDbGroupingFacade = {
	...UserDbGroupingStateFacade,
	...UserDbGroupingMutationFacade,
	...UserDbGroupingReadFacade,
} as const;
