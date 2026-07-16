import { Button } from "antd";
import type { FC } from "react";

interface EditGroupModalFooterProps {
	isBusy: boolean;
	isSaving: boolean;
	onCancel: () => void;
	onSubmit: () => void;
}

const EditGroupModalFooter: FC<EditGroupModalFooterProps> = ({
																															 isBusy,
																															 isSaving,
																															 onCancel,
																															 onSubmit,
																														 }) => (
	<>
		<Button
			disabled={ isBusy }
			onClick={ onCancel }
		>
			Cancel
		</Button>
		<Button
			type="primary"
			loading={ isSaving }
			onClick={ onSubmit }
		>
			Save
		</Button>
	</>
);

export default EditGroupModalFooter;
