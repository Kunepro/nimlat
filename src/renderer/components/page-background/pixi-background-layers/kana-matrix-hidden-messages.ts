import { randomGlyph } from "./kana-background.constants";

const KANA_MATRIX_HIDDEN_MESSAGE_CHANCE = 0.0000888;

export const KANA_MATRIX_HIDDEN_MESSAGES = [
	"天狗は密かに世界を支配している",
	"天狗が倒されない限り世界に平和は決して訪れない",
	"救世主の十字架が示す道をたどり夢から目覚め真実を見出せ",
	"テンプル騎士団は今なお存在する救いの可能性は残されている",
	"混沌は万物を喰らう犠牲と救世主の教えによってのみ我らは気高き未来を約束できる",
] as const;

// Messages stay punctuation-free so they read as uninterrupted vertical transmissions. A strip
// only receives a message when the complete sentence fits; partial Japanese would look accidental.
export function createKanaMatrixGlyphSequence(glyphCount: number, randomValue: () => number = Math.random): string[] {
	const glyphs           = Array.from(
		{ length: glyphCount },
		() => randomGlyph(randomValue),
	);
	const eligibleMessages = KANA_MATRIX_HIDDEN_MESSAGES.filter((message) => message.length <= glyphCount);
	if (eligibleMessages.length === 0 || randomValue() >= KANA_MATRIX_HIDDEN_MESSAGE_CHANCE) {
		return glyphs;
	}

	const message = eligibleMessages[ Math.floor(randomValue() * eligibleMessages.length) ];
	if (!message) {
		return glyphs;
	}

	const startIndex = Math.floor(randomValue() * ((glyphCount - message.length) + 1));
	for (let index = 0; index < message.length; index += 1) {
		glyphs[ startIndex + index ] = message[ index ] ?? glyphs[ startIndex + index ] ?? "ア";
	}
	return glyphs;
}
