export const themeConfig = {
	// Typography
	fontFamily:       "\"Goldman\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
	fontFamilyMonospace: "\"JetBrains Mono\", \"Cascadia Mono\", Consolas, monospace",
	fontSizeBase:     14,
	fontSizeSm:       12,
	fontSizeMd:          14,
	fontSizeLg:       16,
	fontSizeXl:       20,
	fontWeightBase:   400,
	lineHeight:       1.5,

	// Radius
	borderRadius:   4,
	borderRadiusSm: 2,
	borderRadiusMd:   6,
	borderRadiusLg: 10,

	// Spacing (global + AntD tokens)
	paddingBase: 8,
	paddingXs:   4,
	paddingSm:   8,
	paddingLg:   16,
	paddingXl:   24,
	marginBase:  8,
	marginXs:    4,
	marginSm:    8,
	marginLg:    16,
	marginXl:    24,
	spaceXs:     4,
	spaceSm:     8,
	spaceMd:     12,
	spaceLg:     16,
	spaceXl:     20,
	spaceXxl:    24,

	// Shadows
	boxShadowBase:      "0 2px 10px rgba(0, 0, 0, 0.55)",
	boxShadowSecondary: "0 10px 30px rgba(0, 60, 120, 0.3)",
	boxShadowTertiary:  "0 18px 40px rgba(0, 60, 120, 0.35)",

	// Brand colors (neon blue with subtle purple accents)
	neonBlue:          "#00B2FF",
	neonBlueHover:     "#33C8FF",
	neonBlueActive:    "#0093E6",
	neonPurple:        "#5C3BFF",
	neonPurpleHover:   "#7A5BFF",
	neonPurpleActive:  "#6044F0",
	neonPurpleVisited: "#7A5BFF",
	glowColor:         "#00E1FF",
	shadowNeon:        "0 0 10px rgba(0, 225, 255, 0.45)",

	// Base surfaces/text
	backgroundColor:         "#0A0F1A",
	backgroundLayout:        "#070B13",
	backgroundElevated:      "#101A2B",
	backgroundSpotlight:     "#12263A",
	textColor:               "#BDEEFF",
	textColorSecondary:      "#9FDCFF",
	textColorTertiary:       "#7FB9D6",
	textColorQuaternary:     "#5C849A",
	textColorHeading:        "#D5F7FF",
	textColorDescrgrouption: "#9FDCFF",

	// Borders/fills/links
	borderColor:           "#1F3850",
	borderColorSecondary:  "#162636",
	fillSecondary:         "#0F1927",
	fillTertiary:          "#0C1421",
	fillQuaternary:        "#0A111B",
	splitColor:            "#1B2C3D",
	textColorLinks:        "#00B2FF",
	textColorLinksHover:   "#33C8FF",
	textColorLinksVisited: "#33C8FF",
	colorPrimary:     "#00B2FF",

	// Status colors (AntD semantic tokens)
	colorInfo:    "#00B2FF",
	colorSuccess: "#33D18A",
	colorWarning: "#F7B84B",
	colorError:   "#FF5C5C",

	// Badge colors (for potential JS use, e.g., dynamic status)
	badgeDownloadedBg:    "#0FF",
	badgeDownloadedColor: "#000",
	badgeOrganizedBg:     "#0FC",
	badgeOrganizedColor:  "#000",
	badgeRecognizedBg:    "#C6F",
	badgeRecognizedColor: "#000",
	badgeAudioBg:         "#F36",
	badgeAudioColor:      "#FFF",
	badgeIssueBg:         "#F36",
	badgeIssueColor:      "#FFF",
	glowTitleColor:       "#7BDCFF",

	// Table tokens
	tableBg:                "#0C131D",
	tableTextColor:         "#C0F0FF",
	tableHeaderBg:          "#0B1119",
	tableHeaderColor:       "#7BDCFF",
	tableHeaderBorder:      "#00C8FF",
	tableRowHoverBg:        "#122033",
	tableRowHoverShadow:    "0 0 10px 2px rgba(0, 200, 255, 0.35)",
	tableCellBorder:        "#1A2733",
	tableSelectedRowBg:     "#0F2A3D",
	tableSelectedRowShadow: "0 0 12px 2px rgba(0, 200, 255, 0.45)",
	tableRowEvenBg:         "#0F1621",
	tableRowOddBg:          "#111A27",

	// Tab labels need their own text backing because animated page backgrounds can pass behind AntD nav text.
	tabsLabelFontSize:         "16px",
	tabsLabelBg:               "linear-gradient(135deg, #050A12, #0C1C2A)",
	tabsLabelActiveBg:         "linear-gradient(135deg, #05304A, #261327 52%, #050A12)",
	tabsLabelBorder:           "rgba(0, 225, 255, 0.48)",
	tabsLabelActiveBorder:     "rgba(255, 54, 122, 0.82)",
	tabsLabelShadow:           "inset 0 -2px 0 rgba(0, 225, 255, 0.32), 0 0 14px rgba(0, 0, 0, 0.58)",
	tabsLabelActiveShadow:     "inset 0 -2px 0 rgba(255, 54, 122, 0.74), 0 0 18px rgba(0, 225, 255, 0.34), 0 0 24px rgba(255, 54, 122, 0.18)",
	tabsLabelTextShadow:       "0 0 8px rgba(0, 225, 255, 0.32), 0 1px 2px rgba(0, 0, 0, 0.9)",
	tabsLabelActiveTextShadow: "0 0 10px rgba(0, 225, 255, 0.62), 0 0 14px rgba(255, 54, 122, 0.36), 0 1px 2px rgba(0, 0, 0, 0.94)",

	// Episode overlays/indicators
	episodePartialBg:  "rgba(0, 178, 255, 0.25)",
	episodeCompleteBg: "rgba(0, 128, 0, 0.3)",
	episodeIssueBg:    "rgba(220, 20, 60, 0.7)",

	// Top bar
	topBarGradientStart: "rgba(0, 178, 255, 0.22)",
	topBarGradientEnd:   "rgba(0, 110, 198, 0.22)",
	topBarBorderColor:   "rgba(0, 213, 255, 0.45)",
	topBarGlow:          "0 0 20px rgba(0, 200, 255, 0.35)",
	topBarBlur:          "blur(14px)",

	// Modal/panels
	modalBg:           "rgba(8, 14, 24, 0.96)",
	modalBorder:       "1px solid rgba(0, 213, 255, 0.35)",
	modalShadow:       "0 24px 70px rgba(0, 0, 0, 0.6)",
	panelBorder:      "1px solid rgba(0, 213, 255, 0.24)",
	panelBg:          "rgba(8, 16, 28, 0.72)",
	panelDashedBorder: "1px dashed rgba(0, 213, 255, 0.35)",
	panelMutedBg:      "rgba(10, 18, 28, 0.6)",
	colorBgContainer: "rgba(8, 16, 28, 0.82)",
	listItemBg:        "rgba(0, 178, 255, 0.08)",
	listItemBorder:    "1px solid rgba(0, 178, 255, 0.2)",

	// AntD component tokens
	cardBg: "#101A28",

	// Component layout defaults; specific cards override this inline.
	trackingStatusWidth: 200,
};
