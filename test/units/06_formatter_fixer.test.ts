import * as path from 'path'
import { assert } from './utils'
import { MathFixer } from '../../src/extras/math-fixer'
import { QuoteFixer } from '../../src/extras/quote-fixer'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    describe('MathFixer', () => {
        const fixer = new MathFixer()

        it('should replace inline math $...$', () => {
            const text = 'Hello $x^2$ world'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '\\(')
            assert.strictEqual(edits[1].newText, '\\)')
        })

        it('should replace display math $$...$$', () => {
            const text = 'Hello $$x^2$$ world'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '\\[')
            assert.strictEqual(edits[1].newText, '\\]')
        })

        it('should ignore escaped dollar signs', () => {
            const text = 'Cost is \\$10'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should handle mixed inline and display math', () => {
            const text = 'Inline $a$ and display $$b$$'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 4)
            assert.strictEqual(edits[0].newText, '\\(')
            assert.strictEqual(edits[1].newText, '\\)')
            assert.strictEqual(edits[2].newText, '\\[')
            assert.strictEqual(edits[3].newText, '\\]')
        })

        it('should ignore math in verbatim environment', () => {
            const text = '\\begin{verbatim}\n$x$\n\\end{verbatim}'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore math in Verbatim environment (uppercase)', () => {
            const text = '\\begin{Verbatim}\n$x$\n\\end{Verbatim}'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore math in lstlisting environment', () => {
            const text = '\\begin{lstlisting}\n$x$\n\\end{lstlisting}'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore math in verb command', () => {
            const text = '\\verb|$x$|'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore math in comments', () => {
            const text = 'Normal $x$ % comment $y$'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '\\(')
            assert.strictEqual(edits[1].newText, '\\)')
        })

        it('should handle multi-line content', () => {
            const text = 'Line 1 $x$\nLine 2 $$y$$'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 4)
            assert.strictEqual(edits[0].newText, '\\(')
            assert.strictEqual(edits[1].newText, '\\)')
            assert.strictEqual(edits[2].newText, '\\[')
            assert.strictEqual(edits[3].newText, '\\]')
        })

        it('should handle multiple inline math on same line', () => {
            const text = 'Math $a$ then $b$ and $c$'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 6)
        })

        it('should correctly identify positions', () => {
            const text = 'Start $x$ end'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits[0].range.start.line, 0)
            assert.strictEqual(edits[0].range.start.character, 6)
            assert.strictEqual(edits[1].range.start.line, 0)
            assert.strictEqual(edits[1].range.start.character, 8)
        })

        it('should handle consecutive dollar signs as inline math', () => {
            // Two consecutive $ are treated as opening and closing inline math
            const text = 'Empty $$ delimiters'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '\\(')
            assert.strictEqual(edits[1].newText, '\\)')
        })

        it('should handle actual display math', () => {
            const text = 'Display $$x^2$$ math'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '\\[')
            assert.strictEqual(edits[1].newText, '\\]')
        })
    })

    describe('QuoteFixer', () => {
        const fixer = new QuoteFixer()

        it('should replace straight quotes "..."', () => {
            const text = 'Hello "world"'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '``')
            assert.strictEqual(edits[1].newText, "''")
        })

        it('should replace German quotes „...“', () => {
            const text = 'Hello „world“'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '``')
            assert.strictEqual(edits[1].newText, "''")
        })


        it('should ignore quotes in verbatim environment', () => {
            const text = '\\begin{verbatim}\n"quote"\n\\end{verbatim}'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore quotes in Verbatim environment (uppercase)', () => {
            const text = '\\begin{Verbatim}\n"quote"\n\\end{Verbatim}'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore quotes in lstlisting environment', () => {
            const text = '\\begin{lstlisting}\n"quote"\n\\end{lstlisting}'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore quotes in verb command', () => {
            const text = '\\verb|"quote"|'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 0)
        })

        it('should ignore quotes in comments', () => {
            const text = 'Normal "text" % comment "ignored"'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '``')
            assert.strictEqual(edits[1].newText, "''")
        })

        it('should handle multi-line content', () => {
            const text = 'Line 1 "quote"\nLine 2 „german“'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 4)
            assert.strictEqual(edits[0].newText, '``')
            assert.strictEqual(edits[1].newText, "''")
            assert.strictEqual(edits[2].newText, '``')
            assert.strictEqual(edits[3].newText, "''")
        })

        it('should handle multiple quotes on same line', () => {
            const text = 'First "quote" and second "quote"'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 4)
        })

        it('should handle empty quotes', () => {
            const text = 'Empty "" quotes'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 2)
            assert.strictEqual(edits[0].newText, '``')
            assert.strictEqual(edits[1].newText, "''")
        })

        it('should correctly identify positions', () => {
            const text = 'Start "text" end'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits[0].range.start.line, 0)
            assert.strictEqual(edits[0].range.start.character, 6)
            assert.strictEqual(edits[1].range.start.line, 0)
            assert.strictEqual(edits[1].range.start.character, 11)
        })

        it('should handle mixed quote types', () => {
            const text = 'Standard "quote" and German „quote“'
            const edits = fixer.getEdits(text)
            assert.strictEqual(edits.length, 4)
        })
    })
})
