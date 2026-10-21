import fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as zlib from 'zlib'
import * as iconv from 'iconv-lite'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { syncTeXToPDF, syncTeXToTeX } from '../../../src/locate/synctex/worker'
import { assert } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let tempDir: string
    let pdfDir: string
    let pdfUri: vscode.Uri
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-synctex-'))
        pdfDir = path.join(tempDir, '中文项目')
        fs.mkdirSync(pdfDir)
        pdfUri = vscode.Uri.file(path.join(pdfDir, 'main.pdf'))
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
        fs.rmSync(tempDir, { recursive: true, force: true })
    })

    function writeSyncTeX(input: Buffer, compressed = true) {
        const content = Buffer.concat([
            Buffer.from('SyncTeX Version:1\nInput:1:'),
            input,
            Buffer.from('\nOutput:pdf\nMagnification:1000\nUnit:1\nX Offset:0\nY Offset:0\nContent:\n{1\n(1,3:6578176,13156352:6578176,657817,0\nh1,3:6578176,13156352:6578176\n)\n}1\nPostamble:\nCount:5\nPost scriptum:\n')
        ])
        fs.writeFileSync(
            path.join(pdfDir, compressed ? 'main.synctex.gz' : 'main.synctex'),
            compressed ? zlib.gzipSync(content) : content
        )
    }

    async function assertSync(texPath: string) {
        const reverse = await syncTeXToTeX(1, 125, 195, pdfUri)
        assert.ok(reverse)
        assert.ok(path.isAbsolute(reverse.input))
        assert.pathStrictEqual(reverse.input, texPath)
        assert.strictEqual(reverse.line, 3)
        assert.strictEqual(reverse.column, 0)
        const forward = await syncTeXToPDF(3, texPath, pdfUri)
        assert.ok(forward)
        assert.strictEqual(forward.page, 1)
        assert.strictEqual(forward.indicator, true)
        assert.ok(Math.abs(forward.x - 100) < 1e-8)
        assert.ok(Math.abs(forward.y - 200) < 1e-8)
    }

    for (const [description, input, encoding] of [
        ['a bare relative path', 'main.tex', 'utf8'],
        ['a dot-relative path', './main.tex', 'utf8'],
        ['a parent-relative path', '../main.tex', 'utf8'],
        ['a path containing spaces', './DT1. Suites et second degre.tex', 'utf8'],
        ['a UTF-8 filename in a Unicode PDF directory', './文档.tex', 'utf8'],
        ['a GBK filename in a Unicode PDF directory', './文档.tex', 'gbk']
    ]) {
        it(`should resolve ${description} against the PDF directory in both directions`, async () => {
            const texPath = path.resolve(pdfDir, input)
            fs.writeFileSync(texPath, 'source')
            writeSyncTeX(iconv.encode(input, encoding))

            await assertSync(texPath)
        })
    }

    it('should preserve an absolute Input path outside the PDF directory', async () => {
        const texPath = path.join(tempDir, '文档.tex')
        fs.writeFileSync(texPath, 'source')
        writeSyncTeX(Buffer.from(texPath))

        await assertSync(texPath)
    })

    it('should resolve relative paths in an uncompressed SyncTeX file', async () => {
        const texPath = path.join(pdfDir, 'main.tex')
        fs.writeFileSync(texPath, 'source')
        writeSyncTeX(Buffer.from('./main.tex'), false)

        await assertSync(texPath)
    })

    it('should prefer the PDF source over a matching path in the process CWD', async () => {
        const texPath = path.join(pdfDir, 'main.tex')
        fs.writeFileSync(texPath, 'source')
        writeSyncTeX(Buffer.from('./main.tex'))
        const existsSync = fs.existsSync
        // Simulate the CWD collision without changing the shared extension host CWD.
        sandbox.stub(fs, 'existsSync').callsFake(candidate => candidate === './main.tex' || existsSync(candidate))

        await assertSync(texPath)
    })

    it('should return no result when the resolved source does not exist', async () => {
        writeSyncTeX(Buffer.from('./missing.tex'))

        assert.strictEqual(await syncTeXToTeX(1, 125, 195, pdfUri), undefined)
        assert.strictEqual(await syncTeXToPDF(3, path.join(pdfDir, 'missing.tex'), pdfUri), undefined)
    })
})
