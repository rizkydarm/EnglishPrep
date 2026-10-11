import { describe, expect, it } from 'vitest';
import {
	isAccepted,
	levenshtein,
	normalizeSentence,
	sentencesEqual,
	withinEditDistance
} from './normalize';

describe('normalizeSentence', () => {
	it('matches case/punctuation-insensitively', () => {
		expect(normalizeSentence('Although the report was long, it was clear.')).toBe(
			'although the report was long it was clear'
		);
	});
	it('ignores internal punctuation (hyphen vs space)', () => {
		expect(sentencesEqual('well-known', 'well known')).toBe(true);
		expect(sentencesEqual('long, it was clear', 'long it was clear')).toBe(true);
	});
	it('collapses whitespace and trims', () => {
		expect(normalizeSentence('  She   suggested\the  apply ')).toBe('she suggested he apply');
	});
	it('strips apostrophes', () => {
		expect(normalizeSentence("Don't stop!")).toBe('dont stop');
	});
});

describe('sentencesEqual', () => {
	it('is case/punct-insensitive', () => {
		expect(sentencesEqual('Hello World!', 'hello world')).toBe(true);
	});
	it('collapses whitespace', () => {
		expect(sentencesEqual('a  b   c', 'a b c')).toBe(true);
	});
	it('does NOT accept synonyms by equality', () => {
		expect(sentencesEqual('She is happy', 'She is glad')).toBe(false);
	});
});

describe('isAccepted', () => {
	it('hits an accepted-list entry after normalization', () => {
		expect(
			isAccepted('She suggested he apply for the scholarship!', [
				'She suggested that he apply for the scholarship.',
				'She suggested he apply for the scholarship.'
			])
		).toBe(true);
	});
	it('misses when no entry matches', () => {
		expect(isAccepted('She suggested him to apply.', ['She suggested he apply.'])).toBe(false);
	});
});

describe('levenshtein / withinEditDistance', () => {
	it('returns 0 for equal normalized strings', () => {
		expect(levenshtein('cat', 'cat')).toBe(0);
	});
	it('withinEditDistance true for distance <= 1', () => {
		expect(withinEditDistance('cat', 'cut', 1)).toBe(true);
		expect(withinEditDistance('cat', 'cats', 1)).toBe(true);
	});
	it('withinEditDistance false for distance >= 2', () => {
		expect(withinEditDistance('cat', 'dog', 1)).toBe(false);
		expect(withinEditDistance('kitten', 'sitting', 1)).toBe(false);
	});
});
