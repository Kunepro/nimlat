import notification from "antd/es/notification";
import type { ReactNode } from "react";
import { useCallback } from "react";
import GroupMediaRemoveUndoButton from "../components/GroupMediaRemoveUndoButton";
import styles from "../GroupMediaExplorer.module.css";

const UNDO_NOTIFICATION_DURATION_SECONDS = 5;
const UNDO_NOTIFICATION_KEY              = "group-media-remove-undo";

interface GroupMediaMutationNotificationsController {
	notificationContextHolder: ReactNode;
	notifyGroupMutationError: (errorMessage: string) => void;
	showSingleRemoveUndo: (onUndo: () => void) => void;
}

export function useGroupMediaMutationNotifications(): GroupMediaMutationNotificationsController {
	const [ notificationApi, notificationContextHolder ] = notification.useNotification({
		placement: "bottomLeft",
	});

	const notifyGroupMutationError = useCallback(
		(errorMessage: string) => {
			notificationApi.error({
				message:     "Group update failed",
				description: errorMessage,
				duration:    5,
			});
		},
		[ notificationApi ],
	);

	const showSingleRemoveUndo = useCallback(
		(onUndo: () => void) => {
			notificationApi.destroy(UNDO_NOTIFICATION_KEY);
			notificationApi.open({
				key:       UNDO_NOTIFICATION_KEY,
				message:   (
										 <GroupMediaRemoveUndoButton
											 durationSeconds={ UNDO_NOTIFICATION_DURATION_SECONDS }
						           onUndo={ () => {
												 notificationApi.destroy(UNDO_NOTIFICATION_KEY);
												 onUndo();
											 } }
										 />
									 ),
				duration:  UNDO_NOTIFICATION_DURATION_SECONDS,
				className: styles.undoToast,
				closeIcon: <span className={ styles.undoToastHiddenClose }/>,
			});
		},
		[ notificationApi ],
	);

	return {
		notificationContextHolder,
		notifyGroupMutationError,
		showSingleRemoveUndo,
	};
}
