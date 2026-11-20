import * as path from 'path'
import { findColumn, getRowAndColumn, reducePdfText, reduceSourceLine } from '../../../src/locate/synctex/column'
import { assert } from '../utils'

/**
 * Backward SyncTeX only resolves a line, so the column is found from the text
 * of the clicked PDF span around the caret. The spans below are the pdf.js
 * text items of the PDF compiled with `xelatex -synctex=1` from `lines`.
 */
describe(path.basename(__filename).split('.')[0] + ':', () => {
    // A paragraph written on one long source line, with LaTeX markup that is
    // rendered differently in the PDF: quotes, `\%`, `'`, citations, `\emph`.
    const paragraph = 'Öğretmenlik; alan bilgisi, ``pedagojik beceri\'\' ve sınıf yönetimi arasında denge kurmayı gerektiren karmaşık bir meslektir \\citep{iliasova2025}. OECD\'nin TALIS 2024 sonuçlarına göre öğretmenlerin ders süresinin ortalama \\%13\'ünü sınıf düzenine ayırdığı, Türkiye\'de ise bu oranın \\%20\'yi aştığı görülmektedir \\citep[s.~45]{oecd2025}; bu nedenle öğretmen adaylarının karmaşık sınıf durumlarında \\emph{pedagojik} kararlar verebilmesi için uygulama temelli yaklaşımlara ihtiyaç duyulmaktadır \\citep{weber2018,karakas2021}.'
    const lines = [
        '\\section{Yöntem}',
        '',
        'Bu çalışmada yakınsayan paralel karma yöntem deseni kullanılmıştır.',
        'Araştırmanın verileri iki aşamada toplanmıştır.',
        '',
        paragraph,
        '',
        'Mikro-öğretim, gerçek sınıfın karmaşıklığını azaltarak adaylara güvenli bir deneme ortamı sunar.'
    ]
    const doc = { lineCount: lines.length, lineAt: (line: number) => ({ text: lines[line] }) }
    const paragraphRow = 5

    const spans = {
        first: 'Öğretmenlik; alan bilgisi, “pedagojik beceri” ve sınıf yönetimi arasında',
        second: 'denge kurmayı gerektiren karmaşık bir meslektir (Iliasova vd., 2025). OECD’nin',
        third: 'TALIS 2024 sonuçlarına göre öğretmenlerin ders süresinin ortalama %13’ünü',
        fifth: 'dir (OECD, 2025, s. 45); bu nedenle öğretmen adaylarının karmaşık sınıf',
        emphasized: 'pedagojik'
    }

    /** Split `span` right after the `offset`-th character of `word`, as a click inside the word does. */
    function click(span: string, word: string, offset: number, occurrence = 0): [string, string] {
        let index = -1
        for (let n = 0; n <= occurrence; n++) {
            index = span.indexOf(word, index + 1)
        }
        assert.ok(index >= 0, `${word} not in ${span}`)
        return [span.slice(0, index + offset), span.slice(index + offset)]
    }

    /** The column `offset` characters into the `occurrence`-th `word` of `line`. */
    function columnOf(line: string, word: string, offset: number, occurrence = 0): number {
        let index = -1
        for (let n = 0; n <= occurrence; n++) {
            index = line.indexOf(word, index + 1)
        }
        assert.ok(index >= 0, `${word} not in ${line}`)
        return index + offset
    }

    it('should reduce PDF text to lower-case letters and digits', () => {
        assert.strictEqual(reducePdfText('“Pedagojik” %13’ünü, ﬁkir İzmir'), 'pedagojik13ünüfikirizmir')
    })

    it('should map every reduced source character to its source column', () => {
        const line = 'a \\emph{bç} \\%13 \\citep[s.~4]{key} d % comment'
        const reduced = reduceSourceLine(line)
        assert.strictEqual(reduced.text, 'abç13\u0000d')
        assert.deepStrictEqual(reduced.start, [0, 8, 9, 14, 15, 17, 35])
        assert.strictEqual(line.slice(reduced.start[5], reduced.end[5]), '\\citep[s.~4]{key}')
    })

    it('should find a word inside a long line with citations, quotes and \\%', () => {
        for (let offset = 1; offset < 'pedagojik'.length; offset++) {
            const [before, after] = click(spans.first, 'pedagojik', offset)
            assert.deepStrictEqual(getRowAndColumn(doc, paragraphRow, before, after), [paragraphRow, columnOf(paragraph, 'pedagojik', offset)], `offset ${offset}`)
        }
    })

    it('should find the occurrence of a repeated word that matches the context', () => {
        // `karmaşık` appears twice in the paragraph; the click is on the second one.
        const [before, after] = click(spans.fifth, 'karmaşık', 3)
        assert.deepStrictEqual(getRowAndColumn(doc, paragraphRow, before, after), [paragraphRow, columnOf(paragraph, 'karmaşık', 3, 1)])
    })

    it('should not jump to a similar word on a neighbouring line', () => {
        // Line 3 has `karma yöntem`; the paragraph has `karmaşık`.
        const [before, after] = click(spans.second, 'karmaşık', 5)
        assert.deepStrictEqual(getRowAndColumn(doc, paragraphRow, before, after), [paragraphRow, columnOf(paragraph, 'karmaşık', 5)])
    })

    it('should find words at the start of a span when the context crosses LaTeX markup', () => {
        for (const [span, word, offset] of [
            [spans.first, 'Öğretmenlik', 1],
            [spans.first, 'Öğretmenlik', 3],
            [spans.second, 'denge', 2],
            [spans.second, 'OECD', 2],
            [spans.third, 'TALIS', 1],
            [spans.third, 'ortalama', 4]
        ] as const) {
            const [before, after] = click(span, word, offset)
            assert.deepStrictEqual(getRowAndColumn(doc, paragraphRow, before, after), [paragraphRow, columnOf(paragraph, word, offset)], `${word} at ${offset}`)
        }
    })

    it('should use the context of neighbouring spans for a span with a single word', () => {
        // `\emph{pedagojik}` is a separate pdf.js span. The viewer adds the text of
        // the neighbouring spans, which tells the two `pedagojik` apart.
        const [before, after] = click(spans.emphasized, 'pedagojik', 4)
        const result = getRowAndColumn(doc, paragraphRow, 'öğretmen adaylarının karmaşık sınıf durumlarında ' + before, after + ' kararlar verebilmesi için uygulama temelli yakla-')
        assert.deepStrictEqual(result, [paragraphRow, columnOf(paragraph, 'pedagojik', 4, 1)])
    })

    it('should match across a hyphenated PDF line break', () => {
        const [before, after] = click('Bu çalışmada yakınsayan paralel karma yöntem deseni kullanılmıştır. Araş-', 'Araş', 4)
        assert.deepStrictEqual(getRowAndColumn(doc, 2, before, after + 'tırmanın verileri iki aşamada toplanmıştır.'), [3, 4])
    })

    it('should prefer a neighbouring line only when it matches better', () => {
        // SyncTeX may report a line off by one.
        const [before, after] = click('Mikro-öğretim, gerçek sınıfın karmaşıklığını azaltarak adaylara güvenli', 'gerçek', 2)
        assert.deepStrictEqual(getRowAndColumn(doc, 6, before, after), [7, columnOf(lines[7], 'gerçek', 2)])
    })

    it('should keep Turkish dotted capital I from shifting columns', () => {
        const line = 'İİİ İzmir’de \\citep{x} ilkokul'
        const [before, after] = click('İİİ İzmir’de (X, 2020) ilkokul', 'ilkokul', 2)
        assert.strictEqual(findColumn(line, before, after)?.column, columnOf(line, 'ilkokul', 2))
    })

    it('should return column 0 when the clicked text is not in the source', () => {
        assert.deepStrictEqual(getRowAndColumn(doc, paragraphRow, 'Quux zzz', 'wqx qwz'), [paragraphRow, 0])
        assert.deepStrictEqual(getRowAndColumn(doc, paragraphRow, '', ''), [paragraphRow, 0])
    })
})
