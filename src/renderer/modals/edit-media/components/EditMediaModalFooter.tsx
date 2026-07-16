import { Button } from "antd";
import type { FC } from "react";

interface EditMediaModalFooterProps {
	isBusy: boolean;
	isResetting: boolean;
	isSaving: boolean;
	onCancel: () => void;
	onReset: () => void;
	onSubmit: () => void;
}

const EditMediaModalFooter: FC<EditMediaModalFooterProps> = ({
																															 isBusy,
																															 isResetting,
																															 isSaving,
																															 onCancel,
																															 onReset,
																															 onSubmit,
																														 }) => (
	<>
		<Button
			danger
			disabled={ isBusy }
			loading={ isResetting }
			onClick={ onReset }
		>
			Reset to Source
		</Button>
		<Button
			disabled={ isBusy }
			onClick={ onCancel }
		>
			Cancel
		</Button>
		<Button
			type="primary"
			loading={ isSaving }
			disabled={ isResetting }
			onClick={ onSubmit }
		>
			Save
		</Button>
	</>
);

export default EditMediaModalFooter;
