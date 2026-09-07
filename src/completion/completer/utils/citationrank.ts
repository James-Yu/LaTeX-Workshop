/**
 * Pure fuzzy ranking for `\cite{}` completion. No `vscode` imports, so this is
 * the tested seam: it ranks bibliography entries against the text typed inside
 * a citation macro, best match first.
 *
 * The matcher is a self-contained port of fzf's scoring model (junegunn/fzf,
 * `src/algo/algo.go`): the exact `calculateScore` bonus model — gap penalties,
 * word-boundary / camelCase bonuses, consecutive-run bonus, a first-character
 * multiplier, and smart-case — paired with fzf's V1 span selection (forward
 * scan for the match end, backward scan for the shortest span). No runtime
 * dependency and no module-level cache, so nothing accumulates across
 * keystrokes.
 */

/** The minimal shape the ranker needs. `CitationItem` satisfies it structurally. */
export interface RankableCitation {
    key: string,
    fields: Map<string, string>
}

export interface RankOptions {
    /** `intellisense.citation.format` fields, lowercased, in display order. */
    format: string[],
    /** Max results to return. Unlimited when omitted. */
    limit?: number
}

// --- fzf scoring constants (values from junegunn/fzf src/algo/algo.go) ---------
const SCORE_MATCH = 16
const SCORE_GAP_START = -3
const SCORE_GAP_EXTENSION = -1
const BONUS_BOUNDARY = SCORE_MATCH / 2 // 8
const BONUS_NON_WORD = SCORE_MATCH / 2 // 8
const BONUS_CAMEL_123 = BONUS_BOUNDARY + SCORE_GAP_EXTENSION // 7
const BONUS_CONSECUTIVE = -(SCORE_GAP_START + SCORE_GAP_EXTENSION) // 4
const BONUS_FIRST_CHAR_MULTIPLIER = 2
const BONUS_BOUNDARY_WHITE = BONUS_BOUNDARY + 2 // 10
const BONUS_BOUNDARY_DELIMITER = BONUS_BOUNDARY + 1 // 9

const enum CharClass { NonWord, Delimiter, White, Lower, Upper, Letter, Number }

const DELIMITER_CHARS = '/,:;|'

function charClassOf(ch: string): CharClass {
    if (ch >= 'a' && ch <= 'z') { return CharClass.Lower }
    if (ch >= 'A' && ch <= 'Z') { return CharClass.Upper }
    if (ch >= '0' && ch <= '9') { return CharClass.Number }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f') { return CharClass.White }
    if (DELIMITER_CHARS.includes(ch)) { return CharClass.Delimiter }
    // Treat any other letter (e.g. accented) as a plain letter, everything else
    // (punctuation, symbols) as a non-word character.
    if (ch.toLowerCase() !== ch.toUpperCase()) { return CharClass.Letter }
    return CharClass.NonWord
}

// fzf's bonusFor: how much a match at a class transition is worth.
function bonusFor(prev: CharClass, cur: CharClass): number {
    if (cur > CharClass.NonWord) {
        switch (prev) {
            case CharClass.NonWord: return BONUS_BOUNDARY
            case CharClass.Delimiter: return BONUS_BOUNDARY_DELIMITER
            case CharClass.White: return BONUS_BOUNDARY_WHITE
            default: break
        }
    }
    if ((prev === CharClass.Lower && cur === CharClass.Upper) ||
        (prev !== CharClass.Number && cur === CharClass.Number)) {
        return BONUS_CAMEL_123
    }
    switch (cur) {
        case CharClass.NonWord:
        case CharClass.Delimiter: return BONUS_NON_WORD
        case CharClass.White: return BONUS_BOUNDARY_WHITE
        default: return 0
    }
}

// Boundary bonus at text position `idx` (transition from the previous char's
// class; the char before the start of the string is treated as whitespace).
function bonusAt(text: string, idx: number): number {
    const prev = idx === 0 ? CharClass.White : charClassOf(text[idx - 1])
    return bonusFor(prev, charClassOf(text[idx]))
}

/**
 * fzf's `calculateScore` over the already-located match span `[sidx, eidx)`.
 * `pattern` is assumed to be in the same case as `text` (smart-case is applied
 * by the caller). Returns the fzf score for that span.
 */
function calculateScore(text: string, pattern: string, sidx: number, eidx: number): number {
    let pidx = 0
    let score = 0
    let inGap = false
    let consecutive = 0
    let firstBonus = 0
    for (let idx = sidx; idx < eidx; idx++) {
        if (text[idx] === pattern[pidx]) {
            score += SCORE_MATCH
            let bonus = bonusAt(text, idx)
            if (consecutive === 0) {
                firstBonus = bonus
            } else {
                // A boundary within a consecutive run restarts the run's bonus.
                if (bonus >= BONUS_BOUNDARY && bonus > firstBonus) {
                    firstBonus = bonus
                }
                bonus = Math.max(bonus, firstBonus, BONUS_CONSECUTIVE)
            }
            score += (pidx === 0 ? bonus * BONUS_FIRST_CHAR_MULTIPLIER : bonus)
            inGap = false
            consecutive++
            pidx++
            if (pidx === pattern.length) {
                break
            }
        } else {
            score += inGap ? SCORE_GAP_EXTENSION : SCORE_GAP_START
            inGap = true
            consecutive = 0
            firstBonus = 0
        }
    }
    return score
}

/**
 * fzf FuzzyMatchV1: locate `pattern` as a subsequence of `text` and score it.
 * Returns the score, or `null` when `pattern` is not a subsequence. `text` and
 * `pattern` are already smart-cased by the caller.
 */
export function fzfScore(text: string, pattern: string): number | null {
    if (pattern.length === 0) {
        return 0
    }
    const N = text.length
    const M = pattern.length
    // Forward pass: earliest end of a full subsequence match.
    let pidx = 0
    let sidx = -1
    let eidx = -1
    for (let idx = 0; idx < N; idx++) {
        if (text[idx] === pattern[pidx]) {
            if (sidx < 0) { sidx = idx }
            pidx++
            if (pidx === M) { eidx = idx + 1; break }
        }
    }
    if (eidx < 0) {
        return null
    }
    // Backward pass: tighten the start to the shortest span ending at eidx.
    pidx = M - 1
    for (let idx = eidx - 1; idx >= sidx; idx--) {
        if (text[idx] === pattern[pidx]) {
            pidx--
            if (pidx < 0) { sidx = idx; break }
        }
    }
    return calculateScore(text, pattern, sidx, eidx)
}

// --- field model ---------------------------------------------------------------

// Long free-text fields are matched with a cheap case-insensitive substring test
// instead of the subsequence matcher: scattered-letter subsequence hits across a
// long abstract are noise, and the substring test allocates nothing.
const LONG_FIELD_NAMES = new Set(['abstract', 'abstractnote', 'annotation', 'note'])
const LONG_FIELD_CHARS = 200
// A contiguous substring hit in a long field is a real but modest signal.
const SUBSTRING_SCORE = SCORE_MATCH

// The citation key is always searched and always weighted highest, so a typed
// key beats an incidental match elsewhere.
const KEY_WEIGHT = 1.0
const FORMAT_TOP_WEIGHT = 0.9
const FORMAT_WEIGHT_STEP = 0.08
const FORMAT_MIN_WEIGHT = 0.5

// A subsequence match counts only if it scores at least this fraction of a
// perfect (contiguous, boundary-aligned) match of the same term. This rejects a
// term smeared as scattered letters across a long field — e.g. "larsen" spread
// across the surnames of an unrelated multi-author entry (~0.77) or "protocol"
// scattered through an unrelated title (~0.66) — while keeping genuine gapped
// matches: initialisms such as "qsl" -> "Quantum Spin Liquid" (~0.83) and
// "mbl" -> "Many-Body Localization" (~0.84), gapped keys such as "vander2019" ->
// "Vanderstraeten2019" (~0.92), and any contiguous hit (1.0). The 0.80 cut sits
// in the gap measured between those two clusters.
const WEAK_MATCH_RATIO = 0.8

interface SearchField {
    /** Lowercased field name, or '' for the citation key. */
    name: string,
    weight: number,
    isKey: boolean
}

// Build the weighted field list: key first (highest), then the format fields in
// their configured order with gently descending weight.
function buildFields(format: string[]): SearchField[] {
    const fields: SearchField[] = [{ name: '', weight: KEY_WEIGHT, isKey: true }]
    format.forEach((name, i) => {
        const weight = Math.max(FORMAT_MIN_WEIGHT, FORMAT_TOP_WEIGHT - FORMAT_WEIGHT_STEP * i)
        fields.push({ name: name.toLowerCase(), weight, isKey: false })
    })
    return fields
}

// Case-insensitive field lookup: bib field names are case-insensitive.
function fieldText(item: RankableCitation, field: SearchField): string {
    if (field.isKey) {
        return item.key
    }
    const direct = item.fields.get(field.name)
    if (direct !== undefined) {
        return direct
    }
    for (const [k, v] of item.fields) {
        if (k.toLowerCase() === field.name) {
            return v
        }
    }
    return ''
}

function isLongField(name: string, text: string): boolean {
    return LONG_FIELD_NAMES.has(name) || text.length > LONG_FIELD_CHARS
}

// Best weighted score of a single term across all fields, or null if no field
// matched (so the term fails the AND requirement).
function termScore(item: RankableCitation, term: string, fields: SearchField[]): number | null {
    // Smart-case: a term with any uppercase is matched case-sensitively.
    const caseSensitive = term !== term.toLowerCase()
    const needle = caseSensitive ? term : term.toLowerCase()
    // Minimum score for a subsequence hit to count: a fraction of a perfect
    // self-match of the same term (rejects scattered noise in a long field).
    const minScore = (fzfScore(needle, needle) ?? 0) * WEAK_MATCH_RATIO
    let best: number | null = null
    for (const field of fields) {
        const raw = fieldText(item, field)
        if (!raw) { continue }
        // Same smart-case handling for both matchers.
        const haystack = caseSensitive ? raw : raw.toLowerCase()
        let score: number | null
        if (isLongField(field.name, raw)) {
            score = haystack.includes(needle) ? SUBSTRING_SCORE : null
        } else {
            score = fzfScore(haystack, needle)
            if (score !== null && score < minScore) { score = null }
        }
        if (score === null) { continue }
        const weighted = score * field.weight
        if (best === null || weighted > best) { best = weighted }
    }
    return best
}

/**
 * Rank `items` against `query`, best match first. The query is split on spaces
 * into terms with AND semantics: every term must match some field, and an item's
 * score is the sum of its per-term best field scores. An empty (or
 * whitespace-only) query preserves the incoming order.
 */
export function rankCitations<T extends RankableCitation>(items: T[], query: string, opts: RankOptions): T[] {
    const terms = query.split(/\s+/).filter(Boolean)
    if (terms.length === 0) {
        return opts.limit === undefined ? items : items.slice(0, opts.limit)
    }
    const fields = buildFields(opts.format)
    const scored: { item: T, score: number, index: number }[] = []
    items.forEach((item, index) => {
        let total = 0
        let matchedAll = true
        for (const term of terms) {
            const s = termScore(item, term, fields)
            if (s === null) { matchedAll = false; break }
            total += s
        }
        if (matchedAll) { scored.push({ item, score: total, index }) }
    })
    // Sort by score desc, breaking ties by original order for stability.
    scored.sort((a, b) => b.score - a.score || a.index - b.index)
    const ranked = scored.map(s => s.item)
    return opts.limit === undefined ? ranked : ranked.slice(0, opts.limit)
}
