import * as assert from 'assert'
import { fzfScore, rankCitations, type RankableCitation } from '../../../src/completion/completer/utils/citationrank'

/**
 * Build a minimal rankable citation. `fields` is a plain object flattened into
 * the Map the ranker consumes, so tests read like specifications.
 */
function entry(key: string, fields: { [name: string]: string } = {}): RankableCitation {
    return { key, fields: new Map(Object.entries(fields)) }
}

const DEFAULT_FORMAT = ['author', 'title', 'journal', 'year']

describe('citationrank:', () => {
    describe('rankCitations->empty query', () => {
        it('should preserve the original order when the query is empty', () => {
            const a = entry('alpha2020', { title: 'Alpha' })
            const b = entry('beta2019', { title: 'Beta' })
            const c = entry('gamma2021', { title: 'Gamma' })
            const out = rankCitations([a, b, c], '', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['alpha2020', 'beta2019', 'gamma2021'])
        })

        it('should preserve the original order when the query is only whitespace', () => {
            const a = entry('alpha2020', { title: 'Alpha' })
            const b = entry('beta2019', { title: 'Beta' })
            const out = rankCitations([a, b], '   ', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['alpha2020', 'beta2019'])
        })
    })

    describe('rankCitations->subsequence matching', () => {
        it('should match a subsequence of a field and drop non-matches', () => {
            const hit = entry('a2020', { title: 'Quantum Simulation of Lattice Gauge Theories' })
            const miss = entry('b2019', { title: 'A Study of Marine Biology' })
            const out = rankCitations([miss, hit], 'qsim', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['a2020'])
        })

        it('should match the citation key itself', () => {
            const hit = entry('Vanderstraeten2019', { title: 'Tangent-space methods' })
            const miss = entry('Haegeman2013', { title: 'Something else' })
            const out = rankCitations([miss, hit], 'vander', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['Vanderstraeten2019'])
        })
    })

    describe('rankCitations->weighting', () => {
        it('should rank a citation-key hit above a paper that only mentions the key in its title', () => {
            const keyHit = entry('Peotta2015', { title: 'Unrelated Title' })
            const titleMention = entry('other1999', { title: 'A comment on Peotta2015 and flat bands' })
            const out = rankCitations([titleMention, keyHit], 'Peotta2015', { format: DEFAULT_FORMAT })
            assert.strictEqual(out[0].key, 'Peotta2015')
        })

        it('should follow the citation.format field order for weighting', () => {
            // Same term appears in author and in journal; the field listed first
            // in `format` should win.
            const authorFirst = entry('a1', { author: 'Bell', journal: 'Irrelevant' })
            const journalFirst = entry('b2', { author: 'Irrelevant', journal: 'Bell System Journal' })
            const authorWeighted = rankCitations([journalFirst, authorFirst], 'bell', { format: ['author', 'journal'] })
            assert.strictEqual(authorWeighted[0].key, 'a1')
            const journalWeighted = rankCitations([authorFirst, journalFirst], 'bell', { format: ['journal', 'author'] })
            assert.strictEqual(journalWeighted[0].key, 'b2')
        })
    })

    describe('rankCitations->AND semantics', () => {
        it('should require every space-separated term to match some field', () => {
            const both = entry('a1', { author: 'Smith', title: 'Quantum Error Correction' })
            const one = entry('b2', { author: 'Jones', title: 'Quantum Computing' })
            const out = rankCitations([both, one], 'smith quantum', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['a1'])
        })

        it('should match terms across different fields', () => {
            const item = entry('a1', { author: 'Smith', title: 'Quantum Error Correction', year: '2020' })
            const out = rankCitations([item], 'smith 2020', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['a1'])
        })
    })

    describe('rankCitations->fzf ranking quality', () => {
        it('should rank a boundary/consecutive key match above a scattered one', () => {
            // 'vander2019' hits Vanderstraeten2019 as a tight prefix + the year;
            // in the other key the same letters are only scattered.
            const tight = entry('Vanderstraeten2019', {})
            const scattered = entry('VeryAdvancedNumericalDerivations2019', {})
            const out = rankCitations([scattered, tight], 'vander2019', { format: DEFAULT_FORMAT })
            assert.strictEqual(out[0].key, 'Vanderstraeten2019')
        })

        it('should rank a title whose match starts at a word boundary above a mid-word match', () => {
            const boundary = entry('a1', { title: 'Gauge Theories' })
            const midword = entry('b2', { title: 'Propagauge Effects' })
            const out = rankCitations([midword, boundary], 'gauge', { format: ['title'] })
            assert.strictEqual(out[0].key, 'a1')
        })
    })

    describe('rankCitations->weak-match rejection', () => {
        it('should not match a term scattered as a loose subsequence across a long author list', () => {
            // "petiziol" appears contiguously in one author list and only as
            // scattered letters (p..e..t..i..z..i..o..l) across a long multi-author
            // list in the other. Only the contiguous one should match.
            const real = entry('Real2026', { author: 'Steinfadt, Luis C. and Petiziol, Francesco' })
            const scatter = entry('Scatter2026', {
                author: 'Perrin and Li and Blatz, Tizian and Zhi, Annie and Bohrdt, Annabelle and Greiner'
            })
            const out = rankCitations([scatter, real], 'petiziol 2026', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['Real2026'])
        })

        it('should still accept a genuine gapped key match (vander2019 -> Vanderstraeten2019)', () => {
            const target = entry('Vanderstraeten2019', { title: 'Tangent space' })
            const out = rankCitations([target], 'vander2019', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['Vanderstraeten2019'])
        })

        it('should still accept short initialisms (qsl -> Quantum Spin Liquid)', () => {
            const target = entry('a1', { title: 'Quantum Spin Liquid' })
            const out = rankCitations([target], 'qsl', { format: ['title'] })
            assert.deepStrictEqual(out.map(i => i.key), ['a1'])
        })

        it('should exclude a multi-term query where a term only scatters across long fields', () => {
            // "larsen 2024 protocol": the real hit has author Larsen + a "Protocol"
            // title; the decoy has 2024 in its key but only scatters "larsen" across
            // its surname list and "protocol" across its title, so it must be dropped.
            const real = entry('Larsen2024a', {
                author: 'Larsen, Peter and Nielsen, Anne and Eckardt and Petiziol',
                title: 'Experimental Protocol for Observing Quantum Scars'
            })
            const decoy = entry('Shit2024', {
                author: 'Shit, Trideb and Hui, Rishav and Liberto, Marco Di and Sen, Diptiman and Mukherjee, Sebabrata',
                title: 'Probing Two-body Bound States in the Continuum and Nonlinear Breathers Using Intensity Correlations'
            })
            const out = rankCitations([decoy, real], 'larsen 2024 protocol', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['Larsen2024a'])
        })
    })

    describe('rankCitations->smart case', () => {
        it('should match case-insensitively for an all-lowercase query', () => {
            const item = entry('Omran2015', { title: 'Pauli Blocking' })
            const out = rankCitations([item], 'omran2015', { format: DEFAULT_FORMAT })
            assert.deepStrictEqual(out.map(i => i.key), ['Omran2015'])
        })

        it('should match case-sensitively when the query has an uppercase letter', () => {
            const upper = entry('A1', { title: 'ABC methods' })
            const lower = entry('a2', { title: 'abc methods' })
            // Query 'ABC' must match the uppercase title, not the lowercase one.
            const out = rankCitations([lower, upper], 'ABC', { format: ['title'] })
            assert.deepStrictEqual(out.map(i => i.key), ['A1'])
        })
    })

    describe('rankCitations->long fields', () => {
        const LONG = 'we present a long discussion of superconductivity and related phenomena '.repeat(5)

        it('should match a whole word inside a long abstract via substring', () => {
            const item = entry('a1', { title: 'Unrelated', abstract: LONG })
            const out = rankCitations([item], 'superconductivity', { format: ['title', 'abstract'] })
            assert.deepStrictEqual(out.map(i => i.key), ['a1'])
        })

        it('should not subsequence-match scattered letters across a long abstract', () => {
            const item = entry('a1', { title: 'Plain Title', abstract: LONG })
            // 'xzqj' appears only as scattered letters; a subsequence matcher would
            // falsely match, a substring test must not.
            const out = rankCitations([item], 'xzqj', { format: ['title', 'abstract'] })
            assert.deepStrictEqual(out.map(i => i.key), [])
        })

        it('should rank a title hit above an abstract-only hit for the same term', () => {
            const titleHit = entry('a1', { title: 'Entanglement Entropy', abstract: 'unrelated ' + LONG })
            const abstractHit = entry('b2', { title: 'Unrelated', abstract: 'we discuss entanglement at length ' + LONG })
            const out = rankCitations([abstractHit, titleHit], 'entanglement', { format: ['title', 'abstract'] })
            assert.strictEqual(out[0].key, 'a1')
        })

        it('should respect smart-case for substring matches in a long abstract', () => {
            const upper = entry('a1', { title: 'x', abstract: 'a study of RNA folding ' + LONG })
            const lower = entry('a2', { title: 'x', abstract: 'a study of rna folding ' + LONG })
            // Uppercase in the query => case-sensitive, so only the uppercase abstract
            // matches (the long-field substring path must honor smart-case too).
            const out = rankCitations([lower, upper], 'RNA', { format: ['title', 'abstract'] })
            assert.deepStrictEqual(out.map(i => i.key), ['a1'])
        })
    })

    describe('rankCitations->limit', () => {
        it('should cap the number of results', () => {
            const items = ['aa', 'ab', 'ac', 'ad'].map(k => entry(k + '2020', { title: 'alpha' }))
            const out = rankCitations(items, 'alpha', { format: ['title'], limit: 2 })
            assert.strictEqual(out.length, 2)
        })
    })

    describe('fzfScore', () => {
        it('should return null when the pattern is not a subsequence', () => {
            assert.strictEqual(fzfScore('quantum', 'xyz'), null)
        })

        it('should score a consecutive match above a gapped match of the same letters', () => {
            const consecutive = fzfScore('abcxxxx', 'abc')
            const gapped = fzfScore('axbxcxx', 'abc')
            assert.ok(consecutive !== null && gapped !== null)
            assert.ok((consecutive as number) > (gapped as number))
        })

        it('should score a word-boundary match above a mid-word match', () => {
            const boundary = fzfScore('foo bar', 'bar')
            const midword = fzfScore('foobar', 'bar')
            assert.ok(boundary !== null && midword !== null)
            assert.ok((boundary as number) > (midword as number))
        })

        it('should reward a prefix match via the first-character bonus', () => {
            const prefix = fzfScore('gauge', 'gauge')
            const suffix = fzfScore('xgauge', 'gauge')
            assert.ok(prefix !== null && suffix !== null)
            assert.ok((prefix as number) > (suffix as number))
        })
    })
})
