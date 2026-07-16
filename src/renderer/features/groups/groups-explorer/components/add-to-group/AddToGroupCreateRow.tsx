import { PlusOutlined } from "@ant-design/icons";
import {
	Button,
	Input,
} from "antd";
import type { FC } from "react";
import styles from "../../AddToGroupModal.module.css";

interface AddToGroupCreateRowProps {
	createName: string;
	isSubmitting: boolean;
	onCreate: () => void;
	onCreateNameChange: (name: string) => void;
}

const AddToGroupCreateRow: FC<AddToGroupCreateRowProps> = ({
																														 createName,
																														 isSubmitting,
																														 onCreate,
																														 onCreateNameChange,
																													 }) => {
	const trimmedCreateName = createName.trim();
	const canCreate         = trimmedCreateName.length > 0 && !isSubmitting;

	return (
		<div className={ styles.createRow }>
			<Input
				value={ createName }
				onChange={ (event) => onCreateNameChange(event.target.value) }
				placeholder="New group title"
				disabled={ isSubmitting }
				onPressEnter={ () => {
					if (canCreate) {
						onCreate();
					}
				} }
			/>
			<Button
				type="primary"
				icon={ <PlusOutlined/> }
				disabled={ !canCreate }
				loading={ isSubmitting }
				onClick={ onCreate }
			>
				Create
			</Button>
		</div>
	);
};

export default AddToGroupCreateRow;
