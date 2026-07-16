import { LibraryDisplayScope } from "@nimlat/types/ipc-payloads";
import AddToGroupModal from "./AddToGroupModal";
import styles from "./GroupsExplorer.module.css";
import { useGroupsExplorerController } from "./hooks/useGroupsExplorerController";
import { useGroupsExplorerShellHeader } from "./hooks/useGroupsExplorerShellHeader";
import LibraryGridSection from "./LibraryGridSection";

interface GroupsExplorerProps {
	scope?: LibraryDisplayScope;
}

const GroupsExplorer = ({
													scope = "library",
												}: GroupsExplorerProps) => {
	const {
					addToGroupModal,
					gridSection,
					shellHeader,
				} = useGroupsExplorerController({ scope });

	useGroupsExplorerShellHeader(shellHeader);

	return (
		<section className={ styles.wrapper }>
			<LibraryGridSection { ...gridSection }/>
			<AddToGroupModal { ...addToGroupModal }/>
		</section>
	);
};

export default GroupsExplorer;
