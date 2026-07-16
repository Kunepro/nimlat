import type { StaffInspectionData } from "@nimlat/types/ipc-payloads";
import { useRouteInspectionFeed } from "../../people/hooks/useRouteInspectionFeed";
import { getStaffInspection } from "../../people/people-inspection-runner";

export function useStaffInspection(): {
	staffId: number;
	staff: StaffInspectionData | null;
	isLoading: boolean;
	errorMessage: string | null;
} {
	const feed = useRouteInspectionFeed<StaffInspectionData>({
		fallbackErrorMessage: "Failed to load staff member.",
		loadInspection:       getStaffInspection,
		paramName:            "staffId",
	});

	return {
		staffId:      feed.id,
		staff:        feed.inspection,
		isLoading:    feed.isLoading,
		errorMessage: feed.errorMessage,
	};
}
