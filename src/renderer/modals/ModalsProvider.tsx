import { FC } from "react";
import EditEpisodeModal from "./edit-episode/EditEpisodeModal";
import EditGroupModal from "./edit-group/EditGroupModal";
import EditMediaModal from "./edit-media/EditMediaModal";
import PreferencesModal from "./preferences/PreferencesModal";

const ModalsProvider: FC = () => {
	return (
		<>
			<EditEpisodeModal/>
			<EditGroupModal/>
			<EditMediaModal/>
			<PreferencesModal/>
		</>
	);
};

export default ModalsProvider;
