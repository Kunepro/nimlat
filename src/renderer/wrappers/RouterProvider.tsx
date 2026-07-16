import { RouterProvider as TNSRouterProvider } from "@tanstack/react-router";
import {
	FC,
	ReactNode,
} from "react";
import { router } from "../router";

interface RouterWrapperProps {
	children?: ReactNode;
}

const RouterProvider: FC<RouterWrapperProps> = () => {
	return <TNSRouterProvider router={ router }/>;
};

export default RouterProvider;
