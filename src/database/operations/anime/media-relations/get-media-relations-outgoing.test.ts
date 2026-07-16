// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const {
				getDatabaseMock,
				prepareMock,
				allMock,
			} = vi.hoisted(() => ({
	getDatabaseMock: vi.fn(),
	prepareMock:     vi.fn(),
	allMock:         vi.fn(),
}));

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

describe(
	"selectOutgoingMediaRelationsByMediaIds",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			allMock.mockReturnValue([]);
			prepareMock.mockReturnValue({ all: allMock });
			getDatabaseMock.mockReturnValue({ prepare: prepareMock });
		});

		it(
			"reads outgoing relations for a tracked-media batch with one statement",
			async () => {
				const { selectOutgoingMediaRelationsByMediaIds } = await import("./get-media-relations-outgoing");

				selectOutgoingMediaRelationsByMediaIds([
					10,
					20,
					10,
				]);

				expect(prepareMock).toHaveBeenCalledOnce();
				expect(prepareMock.mock.calls[ 0 ][ 0 ]).toContain("mediaRelations.mediaId IN (SELECT value FROM json_each(?))");
				expect(prepareMock.mock.calls[ 0 ][ 0 ]).toContain("relatedMedia.isStub = 0");
				expect(allMock).toHaveBeenCalledWith("[10,20]");
			},
		);

		it(
			"does not prepare SQLite work for an empty batch",
			async () => {
				const { selectOutgoingMediaRelationsByMediaIds } = await import("./get-media-relations-outgoing");

				expect(selectOutgoingMediaRelationsByMediaIds([])).toEqual([]);
				expect(prepareMock).not.toHaveBeenCalled();
			},
		);
	},
);
