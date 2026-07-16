import type { FormInstance } from "antd";
import {
	Form,
	Input,
} from "antd";

export interface EditDetailsFormValues {
	name: string;
	description?: string;
}

interface EditDetailsMetadataFormProps<TValues extends EditDetailsFormValues> {
	form: FormInstance<TValues>;
	initialValues: TValues;
	requiredMessage?: string;
	showDescription?: boolean;
}

export default function EditDetailsMetadataForm<TValues extends EditDetailsFormValues>({
																																												 form,
																																												 initialValues,
																																												 requiredMessage,
																																												 showDescription = true,
																																											 }: EditDetailsMetadataFormProps<TValues>) {
	return (
		<Form
			form={ form }
			layout="vertical"
			initialValues={ initialValues }
		>
			<Form.Item
				label="Title"
				name="name"
				rules={ requiredMessage
					? [
						{
							required: true,
							message:  requiredMessage,
						},
					]
					: undefined }
			>
				<Input maxLength={ 200 }/>
			</Form.Item>
			{ showDescription ? (
				<Form.Item
					label="Description"
					name="description"
				>
					<Input.TextArea
						rows={ 6 }
						maxLength={ 2000 }
					/>
				</Form.Item>
			) : null }
		</Form>
	);
}
