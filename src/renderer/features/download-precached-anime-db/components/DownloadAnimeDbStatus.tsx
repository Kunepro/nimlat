import { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import { Typography } from "antd";
import { FC } from "react";
import { getAnimeDbDownloadStatusLabel } from "../download-precached-anime-db-model";

interface DownloadAnimeDbStatusProps {
	status: AnimeDbDownloadProgressData["status"];
}

const DownloadAnimeDbStatus: FC<DownloadAnimeDbStatusProps> = ({ status }) => (
	<Typography.Text type="secondary">
		{ getAnimeDbDownloadStatusLabel(status) }
	</Typography.Text>
);

export default DownloadAnimeDbStatus;
