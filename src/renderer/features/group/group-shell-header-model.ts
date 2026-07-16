export function resolveGroupShellHeaderTitle({
																							 groupId,
																							 groupName,
																							 initialGroupName,
																						 }: {
	groupId: string;
	groupName: string | undefined;
	initialGroupName: string | undefined;
}): string {
	return groupName || initialGroupName || `Group ${ groupId }`;
}
