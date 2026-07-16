import { PlusOutlined } from "@ant-design/icons";
import Button from "antd/es/button";
import Form from "antd/es/form";
import type { FC } from "react";
import styles from "../IntegrationStateSection.module.css";
import IntegrationPlaybackIssueMomentRow from "./IntegrationPlaybackIssueMomentRow";

const IntegrationPlaybackIssueMomentsList: FC = () => (
	<Form.List name="playbackIssueMoments">
		{ (fields, {
			add,
			remove,
		}) => (
			<div className={ styles.momentsList }>
				{ fields.map((field) => (
					<IntegrationPlaybackIssueMomentRow
						key={ field.key }
						field={ field }
						remove={ remove }
					/>
				)) }
				<Button
					icon={ <PlusOutlined/> }
					onClick={ () => add() }
				>
					Add timestamp
				</Button>
			</div>
		) }
	</Form.List>
);

export default IntegrationPlaybackIssueMomentsList;
