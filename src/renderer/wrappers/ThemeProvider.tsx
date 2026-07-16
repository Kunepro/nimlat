import {
	App as AntdApp,
	ConfigProvider,
	theme as antdTheme,
} from "antd";
import {
	FC,
	ReactNode,
} from "react";
import { themeConfig } from "./theme-config";

interface ThemeProviderProps {
	children: ReactNode;
}

const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
	const antdThemeConfig = {
		algorithm:  antdTheme.darkAlgorithm,
		token:      {
			// Seed/Map tokens (global impact)
			colorPrimary:            themeConfig.neonBlue,
			colorPrimaryHover:       themeConfig.neonBlueHover,
			colorPrimaryActive:      themeConfig.neonBlueActive,
			colorBgBase:             themeConfig.backgroundColor,
			colorBgLayout:           themeConfig.backgroundLayout,
			colorBgContainer:        themeConfig.cardBg,
			colorBgElevated:         themeConfig.backgroundElevated,
			colorBgSpotlight:        themeConfig.backgroundSpotlight,
			colorTextBase:           themeConfig.textColor,
			colorTextSecondary:      themeConfig.textColorSecondary,
			colorTextTertiary:       themeConfig.textColorTertiary,
			colorTextQuaternary:     themeConfig.textColorQuaternary,
			colorTextHeading:        themeConfig.textColorHeading,
			colorTextDescrgrouption: themeConfig.textColorDescrgrouption,
			colorBorder:             themeConfig.borderColor,
			colorBorderSecondary:    themeConfig.borderColorSecondary,
			colorSplit:              themeConfig.splitColor,
			colorFillSecondary:      themeConfig.fillSecondary,
			colorFillTertiary:       themeConfig.fillTertiary,
			colorFillQuaternary:     themeConfig.fillQuaternary,
			colorLink:               themeConfig.neonBlue,
			colorLinkHover:          themeConfig.neonBlueHover,
			colorLinkActive:         themeConfig.neonBlueActive,
			colorInfo:               themeConfig.colorInfo,
			colorSuccess:            themeConfig.colorSuccess,
			colorWarning:            themeConfig.colorWarning,
			colorError:              themeConfig.colorError,
			fontFamily:              themeConfig.fontFamily,
			fontSize:                themeConfig.fontSizeBase,
			fontSizeSM:              themeConfig.fontSizeSm,
			fontSizeLG:              themeConfig.fontSizeLg,
			fontSizeXL:              themeConfig.fontSizeXl,
			lineHeight:              themeConfig.lineHeight,
			borderRadius:            themeConfig.borderRadius,
			borderRadiusSM:          themeConfig.borderRadiusSm,
			borderRadiusLG:          themeConfig.borderRadiusLg,
			padding:                 themeConfig.paddingBase,
			paddingXS:               themeConfig.paddingXs,
			paddingSM:               themeConfig.paddingSm,
			paddingLG:               themeConfig.paddingLg,
			paddingXL:               themeConfig.paddingXl,
			margin:                  themeConfig.marginBase,
			marginXS:                themeConfig.marginXs,
			marginSM:                themeConfig.marginSm,
			marginLG:                themeConfig.marginLg,
			marginXL:                themeConfig.marginXl,
			boxShadowBase:           themeConfig.boxShadowBase,
			boxShadow:               themeConfig.boxShadowBase,
			boxShadowSecondary:      themeConfig.boxShadowSecondary,
			boxShadowTertiary:       themeConfig.boxShadowTertiary,
			motion:                  false,
		},
		components: {
			// Component-specific tokens (overrides globals)
			Card:   {
				colorBgContainer: themeConfig.cardBg,
				borderRadiusLG:   themeConfig.borderRadiusLg,
				boxShadow:        themeConfig.boxShadowSecondary,
			},
			Button: {
				colorPrimary:       themeConfig.neonBlue,
				colorPrimaryHover:  themeConfig.neonBlueHover,
				colorPrimaryActive: themeConfig.neonBlueActive,
				borderRadius:       themeConfig.borderRadius,
			},
			Table:  {
				colorBgContainer:     themeConfig.tableBg,
				colorText:            themeConfig.tableTextColor,
				colorBorderSecondary: themeConfig.tableCellBorder,
				headerBg:             themeConfig.tableHeaderBg,
				headerColor:          themeConfig.tableHeaderColor,
				headerSplitColor:     themeConfig.tableHeaderBorder,
				rowHoverBg:           themeConfig.tableRowHoverBg,
				rowSelectedBg:        themeConfig.tableSelectedRowBg,
				rowSelectedHoverBg:   themeConfig.tableSelectedRowBg,
			},
			Modal:  {
				colorBgElevated: themeConfig.backgroundElevated,
				boxShadow:       themeConfig.modalShadow,
				borderRadiusLG:  themeConfig.borderRadiusLg,
			},
			Grid:   {
				gutter: 8,
			},
		},
	};

	return (
		<ConfigProvider theme={ antdThemeConfig }>
			<AntdApp className="nimlatAntApp">
				{ children }
			</AntdApp>
		</ConfigProvider>
	);
};

export default ThemeProvider;
