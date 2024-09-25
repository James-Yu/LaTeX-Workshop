import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { parser } from '../../src/parse/parser'
import { bibtexLogParser } from '../../src/parse/parser/bibtexlog'
import { biberLogParser } from '../../src/parse/parser/biberlog'
import { latexLogParser } from '../../src/parse/parser/latexlog'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'file', 'root', 'parser')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.parser->log', () => {
        let bibtexParserSpy: sinon.SinonSpy
        let biberParserSpy: sinon.SinonSpy
        let latexParserSpy: sinon.SinonSpy

        before(() => {
            bibtexParserSpy = sinon.spy(bibtexLogParser, 'parse')
            biberParserSpy = sinon.spy(biberLogParser, 'parse')
            latexParserSpy = sinon.spy(latexLogParser, 'parse')
        })

        after(() => {
            bibtexParserSpy.restore()
            biberParserSpy.restore()
            latexParserSpy.restore()
        })

        function resetSpies() {
            bibtexParserSpy.resetHistory()
            biberParserSpy.resetHistory()
            latexParserSpy.resetHistory()
        }

        it('should parse bibtex log', () => {
            const log = `This is BibTeX, Version 0.99d (MiKTeX 2.9)
The top-level auxiliary file: main.aux
The style file: plain.bst
Database file #1: main.bib
Warning--I didn't find a database entry for "test"
(There was 1 warning)
`

            resetSpies()
            parser.log(log, 'main.tex')

            assert.ok(bibtexParserSpy.calledOnce)
            assert.ok(biberParserSpy.notCalled)
            assert.ok(latexParserSpy.notCalled)
        })

        it('should parse biber log', () => {
            const log = `INFO - This is Biber 2.14
INFO - Logfile is 'test.blg'
INFO - Reading 'test.bcf'
INFO - Using all citekeys in bib section 0
INFO - Processing section 0
INFO - Globbing data source 'test.bib'
INFO - Globbed data source 'test.bib' to test.bib
INFO - Looking for bibtex format file 'test.bib' for section 0
INFO - LaTeX decoding ...
INFO - Found BibTeX data source 'test.bib'
`

            resetSpies()
            parser.log(log, 'main.tex')

            assert.ok(bibtexParserSpy.notCalled)
            assert.ok(biberParserSpy.calledOnce)
            assert.ok(latexParserSpy.notCalled)
        })

        it('should parse bibtex log in its alternative format', () => {
            const log = `Reason: Input/output error
The 8-bit codepage and sorting file: 88591lat.csf
The top-level auxiliary file: test.aux
I couldn't open style file noexist.bst
---line 2 of file test.aux
    : \\bibstyle{noexist
    :                  }
I'm skipping whatever remains of this command
I found no style file---while reading file test.aux
(There were 2 error messages)`

            resetSpies()
            parser.log(log, 'main.tex')

            assert.ok(bibtexParserSpy.calledOnce)
            assert.ok(biberParserSpy.notCalled)
            assert.ok(latexParserSpy.notCalled)
        })

        it('should trim and parse the last steps of latexmk log', () => {
            const log = `Rule 'pdflatex':
------------
Run number 1 of rule 'pdflatex'
------------
Latexmk: applying rule 'pdflatex'...
Output written on ./main.pdf (1 page, 10 bytes).
LATEXMK LOG
Rule 'bibtex main':
------------
Run number 1 of rule 'bibtex main'
------------
Latexmk: applying rule 'bibtex main'...
------------
Running 'bibtex  "main"'
------------
This is BibTeX, Version 0.99d (MiKTeX 2.9)
LATEXMK LOG
Rule 'pdflatex':
------------
Run number 2 of rule 'pdflatex'
------------
Latexmk: applying rule 'pdflatex'...
Output written on ./main.pdf (2 page, 20 bytes).
LATEXMK LOG
`

            resetSpies()
            parser.log(log, 'main.tex')

            assert.ok(bibtexParserSpy.calledOnce)
            assert.ok((bibtexParserSpy.firstCall.args[0] as string).includes('This is BibTeX'))

            assert.ok(latexParserSpy.calledOnce)
            assert.ok((latexParserSpy.firstCall.args[0] as string).includes('(2 page, 20 bytes)'))
        })

        it('should trim and parse the last steps of texify log', () => {
            const log = `running pdflatex
Output written on ./main.pdf (1 page, 10 bytes).
TEXIFY LOG
running miktex-bibtex
This is BibTeX, Version 0.99d (MiKTeX 2.9)
TEXIFY LOG
running pdflatex
Output written on ./main.pdf (2 page, 20 bytes).
TEXIFY LOG
`

            resetSpies()
            parser.log(log, 'main.tex')

            assert.ok(bibtexParserSpy.calledOnce)
            assert.ok((bibtexParserSpy.firstCall.args[0] as string).includes('This is BibTeX'))

            assert.ok(latexParserSpy.calledOnce)
            assert.ok((latexParserSpy.firstCall.args[0] as string).includes('(2 page, 20 bytes)'))
        })

        it('should parse latex log with fatal error', () => {
            const log = 'Fatal error occurred, no output PDF file produced!'

            resetSpies()
            parser.log(log, 'main.tex')

            assert.ok(bibtexParserSpy.notCalled)
            assert.ok(biberParserSpy.notCalled)
            assert.ok(latexParserSpy.calledOnce)
        })

        it('should return skipped `true` if latexmk is skipped', () => {
            const log = 'Latexmk: All targets (test) are up-to-date'

            resetSpies()
            assert.ok(parser.log(log, 'main.tex'))
        })

        it('should return skipped `false` if latexmk is skipped, but is after some steps', () => {
            const log = "Latexmk: applying rule 'pdflatex'...\nLatexmk: All targets (test) are up-to-date"

            resetSpies()
            assert.ok(!parser.log(log, 'main.tex'))
        })
    })

    describe.only('lw.parser->latex', () => {
        beforeEach(() => {
            set.config('message.badbox.show', 'both')
        })

        it('should parse general LaTeX errors', () => {
            const errorLogs = [
                'main.tex:12: Undefined control sequence',
                'document.cls:45: Package geometry Error: Invalid margin value',
                'main.tex:7: LaTeX Error: Missing $ inserted',
                'report.tex:102: File `input.tex\' not found',
                '! LaTeX Error: This is an error message',
                '! Package pdftex.def Error: File image.png not found',
                '! Undefined control sequence (in main.tex)',
                '! LaTeX Error: Too many }\'s',
                'main.tex:12: Package amsmath Error: Missing }',
                'document.cls:45: Class article Error: Missing mandatory argument',
                'report.tex:15: LaTeX Error: Overfull \\hbox',
                '! File `image.png\' not found',
                '! Missing $ inserted',
                '! Too many }\'s',
            ]

            for (const log of errorLogs) {
                const error = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(error.type, 'error', log)
            }
        })

        it('should finish parsing a LaTeX error on empty line', () => {
            const errors = latexLogParser.parse('main.tex:12: Undefined control sequence\n\ndocument.cls:45: Package geometry Error: Invalid margin value', get.path('main.tex'))

            assert.strictEqual(errors.length, 2)
        })

        it('should handle multi-line LaTeX errors with line number', () => {
            const log = `! Undefined control sequence.
l.4         \\draw
                [->-=0.5] (0,0) -- (3,-2);
            `

            const error = latexLogParser.parse(log, get.path('main.tex'))?.[0]
            assert.strictEqual(error.errorPosText, '        \\draw')
        })

        it('should handle multi-line LaTeX errors without line number', () => {
            const log = `! Undefined control sequence.
Test message`

            const error = latexLogParser.parse(log, get.path('main.tex'))?.[0]
            assert.strictEqual(error.text, 'Undefined control sequence.\nTest message')
        })

        const badboxLogs = [
            'Overfull \\hbox (some text) in paragraph at lines 10--20',
            'Overfull \\vbox (more text) in paragraph at lines 5--15',
            'Overfull \\hbox (some text) detected at line 12',
            'Overfull \\vbox (more text) detected at line 7',
            'Overfull \\hbox (some text) has occurred while \\output is active',
            'Overfull \\vbox (more text) has occurred while \\output is active [5]',
            'Underfull \\hbox (some text) in paragraph at lines 8--18',
            'Underfull \\vbox (more text) in paragraph at lines 3--13',
            'Underfull \\hbox (some text) detected at line 11',
            'Underfull \\vbox (more text) detected at line 6',
            'Underfull \\hbox (some text) has occurred while \\output is active',
            'Underfull \\vbox (more text) has occurred while \\output is active [8]'
        ]

        it('should parse over/underfull hbox/vbox warnings', () => {
            for (const log of badboxLogs) {
                const warning = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(warning.type, 'typesetting', log)
            }
        })

        it('should not parse bad box warnings if disabled', () => {
            set.config('message.badbox.show', 'none')

            for (const log of badboxLogs) {
                const warning = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(warning, undefined)
            }
        })

        it('should only parse overfull box warnings if set', () => {
            set.config('message.badbox.show', 'overfull')

            for (const log of badboxLogs.slice(0, badboxLogs.length / 2)) {
                const warning = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(warning.type, 'typesetting')
            }

            for (const log of badboxLogs.slice(badboxLogs.length / 2)) {
                const warning = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(warning, undefined)
            }
        })

        it('should only parse underfull box warnings if set', () => {
            set.config('message.badbox.show', 'underfull')

            for (const log of badboxLogs.slice(0, badboxLogs.length / 2)) {
                const warning = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(warning, undefined)
            }

            for (const log of badboxLogs.slice(badboxLogs.length / 2)) {
                const warning = latexLogParser.parse(log, get.path('main.tex'))?.[0]
                assert.strictEqual(warning.type, 'typesetting')
            }
        })

        it('should parse the line number of bad box if provided', () => {
            assert.strictEqual(latexLogParser.parse(badboxLogs[0], get.path('main.tex'))?.[0]?.line, 10)
            assert.strictEqual(latexLogParser.parse(badboxLogs[1], get.path('main.tex'))?.[0]?.line, 5)
            assert.strictEqual(latexLogParser.parse(badboxLogs[2], get.path('main.tex'))?.[0]?.line, 12)
            assert.strictEqual(latexLogParser.parse(badboxLogs[3], get.path('main.tex'))?.[0]?.line, 7)
            assert.strictEqual(latexLogParser.parse(badboxLogs[4], get.path('main.tex'))?.[0]?.line, 1)
            assert.strictEqual(latexLogParser.parse(badboxLogs[5], get.path('main.tex'))?.[0]?.line, 1)
            assert.strictEqual(latexLogParser.parse(badboxLogs[6], get.path('main.tex'))?.[0]?.line, 8)
            assert.strictEqual(latexLogParser.parse(badboxLogs[7], get.path('main.tex'))?.[0]?.line, 3)
            assert.strictEqual(latexLogParser.parse(badboxLogs[8], get.path('main.tex'))?.[0]?.line, 11)
            assert.strictEqual(latexLogParser.parse(badboxLogs[9], get.path('main.tex'))?.[0]?.line, 6)
            assert.strictEqual(latexLogParser.parse(badboxLogs[10], get.path('main.tex'))?.[0]?.line, 1)
            assert.strictEqual(latexLogParser.parse(badboxLogs[11], get.path('main.tex'))?.[0]?.line, 1)
        })

        it('should parse the page number of bad box if provided', () => {
            assert.strictEqual(latexLogParser.parse(badboxLogs[0], get.path('main.tex'))?.[0]?.text, 'Overfull \\hbox (some text)')
            assert.strictEqual(latexLogParser.parse(badboxLogs[5], get.path('main.tex'))?.[0]?.text, 'Overfull \\vbox (more text) in page 5')
            assert.strictEqual(latexLogParser.parse(badboxLogs[11], get.path('main.tex'))?.[0]?.text, 'Underfull \\vbox (more text) in page 8')
        })

        it('should go on parsing after the bad box warning even without line break', () => {
            const log = badboxLogs[5] + badboxLogs[1]
            const warnings = latexLogParser.parse(log, get.path('main.tex'))

            assert.strictEqual(warnings.length, 2)
        })

        it('should skip the first line after bad box warning', () => {
            const log = badboxLogs[0] + '\n' + badboxLogs[1]
            const warnings = latexLogParser.parse(log, get.path('main.tex'))

            assert.strictEqual(warnings.length, 1)
        })
    })

    describe('lw.parser->bibtex', () => {})

    describe('lw.parser->biber', () => {})
})
