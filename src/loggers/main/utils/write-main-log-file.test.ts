// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const writeFileSync = vi.fn();

vi.mock(
	"fs",
	() => ({
		writeFileSync,
	}),
);

describe(
	"writeMainLogFile",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"writes info logs to file and mirrors them to console.info",
			async () => {
				const infoSpy              = vi.spyOn(
					console,
					"info",
				).mockImplementation(() => undefined);
				const { writeMainLogFile } = await import("./write-main-log-file");

				writeMainLogFile(
					"log body",
					"C:/logs/main-info.log",
					"info",
					{ queue: "search" },
				);

				expect(writeFileSync).toHaveBeenCalledWith(
					"C:/logs/main-info.log",
					"log body",
				);
				expect(infoSpy).toHaveBeenCalledWith(
					"log body",
					{ queue: "search" },
				);
				infoSpy.mockRestore();
			},
		);

		it(
			"writes warning logs to file and mirrors them to console.warn",
			async () => {
				const warnSpy              = vi.spyOn(
					console,
					"warn",
				).mockImplementation(() => undefined);
				const { writeMainLogFile } = await import("./write-main-log-file");

				writeMainLogFile(
					"log body",
					"C:/logs/main-warning.log",
					"warning",
				);

				expect(writeFileSync).toHaveBeenCalledWith(
					"C:/logs/main-warning.log",
					"log body",
				);
				expect(warnSpy).toHaveBeenCalledWith("log body");
				warnSpy.mockRestore();
			},
		);
	},
);
