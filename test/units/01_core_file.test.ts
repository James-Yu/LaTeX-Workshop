import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { getPath, pathEqual, resetConfig, resetRoot, setConfig, setRoot, stubObject } from './utils'
import { lw } from '../../src/lw'
import { _test } from '../../src/core/file'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const rootDir = getPath(fixture)
    const texPath = getPath(fixture, 'main.tex')
    const flsPath = getPath(fixture, 'main.fls')

    before(() => {
        stubObject(lw, 'file')
        resetRoot()
    })

    afterEach(async () => {
        resetRoot()
        await resetConfig()
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.file.createTmpDir', () => {
        it('should create temporary directories', () => {
            assert.ok(_test?.createTmpDir())
        })

        it('should create different temporary directories', () => {
            assert.notEqual(_test?.createTmpDir(), _test?.createTmpDir())
        })

        function forbiddenTemp(chars: string[ ]) {
            const tmp = process.env.TMP ?? process.env.TEMP ?? process.env.TMPDIR
            const tmpNames = ['TMP', 'TEMP', 'TMPDIR']
            chars.forEach(char => {
                tmpNames.forEach(envvar => process.env[envvar] = (process.env[envvar] === undefined ? undefined : ('\\Test ' + char)))
                try {
                    _test?.createTmpDir()
                    assert.fail('Expected an error to be thrown')
                } catch {
                    assert.ok(true)
                } finally {
                    tmpNames.forEach(envvar => { if (process.env[envvar] !== undefined) { process.env[envvar] = tmp } })
                }
            })
        }

        it('should alert temporary directory name with quotes', () => {
            forbiddenTemp(['\'', '"'])
        })

        it('should alert temporary directory name with forbidden characters', () => {
            forbiddenTemp(['/'])
        })
    })

    describe('lw.file.getOutDir', () => {
        it('should get output directory from root', () => {
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), lw.root.dir.path)
        })

        it('should get output directory without root or input latex', () => {
            pathEqual(lw.file.getOutDir(), './')
        })

        it('should get output directory with an input latex', () => {
            pathEqual(lw.file.getOutDir(texPath), rootDir)
        })

        it('should get output directory with an input latex over the root', () => {
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(texPath), rootDir)
        })

        it('should get output directory with absolute `latex.outDir` and root', async () => {
            await setConfig('latex.outDir', '/output')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), '/output')
        })

        it('should get output directory with relative `latex.outDir` and root', async () => {
            await setConfig('latex.outDir', 'output')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), 'output')
        })

        it('should get output directory with relative `latex.outDir` with leading `./` and root', async () => {
            await setConfig('latex.outDir', './output')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), 'output')
        })

        it('should get output directory with relative `latex.outDir`, root, and an input latex', async () => {
            await setConfig('latex.outDir', 'output')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(texPath), 'output')
        })

        it('should get output directory with placeholder in `latex.outDir` and root', async () => {
            await setConfig('latex.outDir', '%DIR%')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), lw.root.dir.path)
        })

        it('should get output directory with placeholder in `latex.outDir`, root, and an input latex', async () => {
            await setConfig('latex.outDir', '%DIR%')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(texPath), rootDir)
        })

        it('should get output directory from last compilation if `latex.outDir` is `%DIR%`', async () => {
            await setConfig('latex.outDir', '%DIR%')
            setRoot(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', '/output')
            pathEqual(lw.file.getOutDir(), '/output')
        })

        it('should ignore output directory from last compilation if `latex.outDir` is not `%DIR%`', async () => {
            await setConfig('latex.outDir', '/output')
            setRoot(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', '/trap')
            pathEqual(lw.file.getOutDir(), '/output')
        })

        it('should ignore output directory from last compilation if no `outdir` is recorded', async () => {
            await setConfig('latex.outDir', '%DIR%')
            setRoot(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '')
            pathEqual(lw.file.getOutDir(), lw.root.dir.path)
        })

        it('should handle empty `latex.outDir` correctly', async () => {
            await setConfig('latex.outDir', '')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), './')
        })

        it('should handle absolute `latex.outDir` with trailing slashes correctly', async () => {
            await setConfig('latex.outDir', '/output/')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), '/output')
        })

        it('should handle relative `latex.outDir` with trailing slashes correctly', async () => {
            await setConfig('latex.outDir', 'output/')
            setRoot(fixture, 'main.tex')
            pathEqual(lw.file.getOutDir(), 'output')
        })

        it('should normalize output directory paths correctly on Windows', () => {
            if (os.platform() === 'win32') {
                pathEqual(lw.file.getOutDir('c:\\path\\to\\file.tex'), 'c:/path/to')
            }
        })
    })

    describe('lw.file.getFlsPath', () => {
        it('should return the correct path when .fls exists in the output directory', async () => {
            pathEqual(await lw.file.getFlsPath(texPath), flsPath)
        })

        it('should return undefined when .fls does not exist in the output directory', async () => {
            pathEqual(await lw.file.getFlsPath(getPath(fixture, 'nonexistent.tex')), undefined)
        })

        it('should respect custom output directory when config is set', async () => {
            await setConfig('latex.outDir', 'output')
            pathEqual(await lw.file.getFlsPath(texPath), getPath(fixture, 'output', 'main.fls'))
        })

        it('should handle when `auxdir` is available in last compilation', async () => {
            setRoot(fixture, 'another.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', undefined, 'auxfiles')
            pathEqual(await lw.file.getFlsPath(getPath(fixture, 'another.tex')), getPath(fixture, 'auxfiles', 'another.fls'))
        })

        it('should handle when `auxdir` is missing in last compilation', async () => {
            setRoot(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', '/output')
            pathEqual(await lw.file.getFlsPath(texPath), flsPath)
        })

        it('should handle when `auxdir` is available in last compilation, but another .fls file in the output folder has higher priority', async () => {
            setRoot(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', undefined, 'auxfiles')
            pathEqual(await lw.file.getFlsPath(texPath), flsPath)
        })
    })

    describe('lw.file.getBibPath', () => {
        it('should correctly find BibTeX files', () => {
            setRoot(fixture, 'main.tex')
            const result = lw.file.getBibPath('main.bib', lw.root.dir.path ?? '')
            assert.strictEqual(result.length, 1)
            pathEqual(result[0], path.resolve(lw.root.dir.path ?? '', 'main.bib'))
        })

        it('should correctly find BibTeX files in basedir', () => {
            setRoot(fixture, 'main.tex')
            const result = lw.file.getBibPath('sub.bib', path.resolve(lw.root.dir.path ?? '', 'subdir'))
            assert.strictEqual(result.length, 1)
            pathEqual(result[0], path.resolve(lw.root.dir.path ?? '', 'subdir', 'sub.bib'))
        })

        it('should correctly find BibTeX files in `latex.bibDirs`', async () => {
            setRoot(fixture, 'main.tex')
            await setConfig('latex.bibDirs', [ path.resolve(lw.root.dir.path ?? '', 'subdir') ])
            const result = lw.file.getBibPath('sub.bib', lw.root.dir.path ?? '')
            assert.strictEqual(result.length, 1)
            pathEqual(result[0], path.resolve(lw.root.dir.path ?? '', 'subdir', 'sub.bib'))
        })

        it('should return an empty array when no BibTeX file is found', async () => {
            setRoot(fixture, 'main.tex')
            await setConfig('latex.bibDirs', [ path.resolve(lw.root.dir.path ?? '', 'subdir') ])
            const result = lw.file.getBibPath('nonexistent.bib', path.resolve(lw.root.dir.path ?? '', 'output'))
            assert.strictEqual(result.length, 0)
        })

        it('should correctly handle wildcard in BibTeX file name', () => {
            setRoot(fixture, 'main.tex')
            const result = lw.file.getBibPath('*.bib', lw.root.dir.path ?? '')
            assert.strictEqual(result.length, 2)
            pathEqual(result[0], path.resolve(lw.root.dir.path ?? '', 'main.bib'))
            pathEqual(result[1], path.resolve(lw.root.dir.path ?? '', 'another.bib'))
        })

        it('should handle case when kpsewhich is disabled and BibTeX file not found', async () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: getPath(fixture, 'nonexistent.bib'), output: [''], stderr: '', signal: 'SIGTERM' })
            await setConfig('kpsewhich.bibtex.enabled', false)
            setRoot(fixture, 'main.tex')
            const result = lw.file.getBibPath('nonexistent.bib', lw.root.dir.path ?? '')
            stub.restore()
            assert.strictEqual(result.length, 0)
        })

        it('should handle case when kpsewhich is enabled and BibTeX file not found', async () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: getPath(fixture, 'nonexistent.bib'), output: [''], stderr: '', signal: 'SIGTERM' })
            await setConfig('kpsewhich.bibtex.enabled', true)
            setRoot(fixture, 'main.tex')
            const result = lw.file.getBibPath('nonexistent.bib', lw.root.dir.path ?? '')
            stub.restore()
            assert.strictEqual(result.length, 1)
            pathEqual(result[0], getPath(fixture, 'nonexistent.bib'))
        })

        it('should return an empty array when kpsewhich is enabled but file is not found', async () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: '', output: [''], stderr: '', signal: 'SIGTERM' })
            await setConfig('kpsewhich.bibtex.enabled', true)
            setRoot(fixture, 'main.tex')
            const result = lw.file.getBibPath('another-nonexistent.bib', lw.root.dir.path ?? '')
            stub.restore()
            assert.strictEqual(result.length, 0)
        })
    })

    describe('lw.file.getLangId', () => {
        it('should return "latex" for .tex files', () => {
            assert.strictEqual(lw.file.getLangId('example.tex'), 'latex')
        })

        it('should return "pweave" for Pweave extensions', () => {
            assert.strictEqual(lw.file.getLangId('example.pnw'), 'pweave')
            assert.strictEqual(lw.file.getLangId('example.ptexw'), 'pweave')
        })

        it('should return "jlweave" for JLweave extensions', () => {
            assert.strictEqual(lw.file.getLangId('example.jnw'), 'jlweave')
            assert.strictEqual(lw.file.getLangId('example.jtexw'), 'jlweave')
        })

        it('should return "rsweave" for RSweave extensions', () => {
            assert.strictEqual(lw.file.getLangId('example.rnw'), 'rsweave')
            assert.strictEqual(lw.file.getLangId('example.Rnw'), 'rsweave')
            assert.strictEqual(lw.file.getLangId('example.rtex'), 'rsweave')
            assert.strictEqual(lw.file.getLangId('example.Rtex'), 'rsweave')
            assert.strictEqual(lw.file.getLangId('example.snw'), 'rsweave')
            assert.strictEqual(lw.file.getLangId('example.Snw'), 'rsweave')
        })

        it('should return "doctex" for .dtx files', () => {
            assert.strictEqual(lw.file.getLangId('example.dtx'), 'doctex')
        })

        it('should return undefined for unknown file extensions', () => {
            assert.strictEqual(lw.file.getLangId('example.unknown'), undefined)
        })

        it('should handle mixed case file extensions correctly', () => {
            assert.strictEqual(lw.file.getLangId('example.TeX'), 'latex')
        })

        it('should handle paths with folders correctly', () => {
            assert.strictEqual(lw.file.getLangId('folder/example.tex'), 'latex')
        })
    })

    describe('lw.file.getJobname', () => {
        it('should return the jobname if present in configuration', async () => {
            await setConfig('latex.jobname', 'myJob')
            assert.strictEqual(lw.file.getJobname(texPath), 'myJob')
        })

        it('should return the name of the input texPath if jobname is empty', async () => {
            await setConfig('latex.jobname', '')
            const expectedJobname = path.parse(texPath).name
            assert.strictEqual(lw.file.getJobname(texPath), expectedJobname)
        })

        it('should return the name of the input texPath if configuration is not set', async () => {
            await setConfig('latex.jobname', undefined) // Ensuring the jobname is not set
            const expectedJobname = path.parse(texPath).name
            assert.strictEqual(lw.file.getJobname(texPath), expectedJobname)
        })
    })

    describe('lw.file.getPdfPath', () => {
        it('should return the correct PDF path when outDir is empty', async () => {
            await setConfig('latex.outDir', '')
            setRoot(fixture, 'main.tex')
            const texpath = lw.root.file.path ?? ''
            pathEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('.tex', '.pdf'))
        })

        it('should return the correct PDF path when outDir is specified', async () => {
            await setConfig('latex.outDir', 'output')
            setRoot(fixture, 'main.tex')
            const texpath = lw.root.file.path ?? ''
            pathEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('main.tex', 'output/main.pdf'))
        })

        it('should handle spaces in file paths correctly', () => {
            setRoot(fixture, 'document with spaces.tex')
            const texpath = lw.root.file.path ?? ''
            pathEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('.tex', '.pdf'))
        })

        it('should handle special characters in file names correctly', () => {
            setRoot(fixture, 'special_!@#$%^&*()-_=+[ ]{}\'`~,.<>?.tex')
            const texpath = lw.root.file.path ?? ''
            pathEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('.tex', '.pdf'))
        })
    })

    describe('lw.file.hasTeXExt', () => {
        it('should return true for supported TeX extensions', () => {
            assert.ok(lw.file.hasTeXExt('.tex'))
            assert.ok(lw.file.hasTeXExt('.rnw'))
            assert.ok(lw.file.hasTeXExt('.jnw'))
            assert.ok(lw.file.hasTeXExt('.pnw'))
        })

        it('should return false for unsupported extensions', () => {
            assert.ok(!lw.file.hasTeXExt('.cls'))
            assert.ok(!lw.file.hasTeXExt('.sty'))
            assert.ok(!lw.file.hasTeXExt('.txt'))
        })
    })

    describe('lw.file.hasBinaryExt', () => {
        it('should return true for non-TeX source extensions', () => {
            assert.ok(lw.file.hasBinaryExt('.pdf'))
            assert.ok(lw.file.hasBinaryExt('.png'))
            assert.ok(lw.file.hasBinaryExt('.txt'))
        })

        it('should return false for TeX source extensions', () => {
            assert.ok(!lw.file.hasBinaryExt('.tex'))
            assert.ok(!lw.file.hasBinaryExt('.cls'))
            assert.ok(!lw.file.hasBinaryExt('.rnw'))
            assert.ok(!lw.file.hasBinaryExt('.jnw'))
            assert.ok(!lw.file.hasBinaryExt('.pnw'))
        })
    })

    describe('lw.file.hasTeXLangId', () => {
        it('should return true for supported TeX languages', () => {
            assert.ok(lw.file.hasTeXLangId('tex'))
            assert.ok(lw.file.hasTeXLangId('latex'))
            assert.ok(lw.file.hasTeXLangId('latex-expl3'))
            assert.ok(lw.file.hasTeXLangId('doctex'))
            assert.ok(lw.file.hasTeXLangId('pweave'))
            assert.ok(lw.file.hasTeXLangId('jlweave'))
            assert.ok(lw.file.hasTeXLangId('rsweave'))
        })

        it('should return false for unsupported languages', () => {
            assert.ok(!lw.file.hasTeXLangId('markdown'))
            assert.ok(!lw.file.hasTeXLangId('python'))
            assert.ok(!lw.file.hasTeXLangId('html'))
        })
    })

    describe('lw.file.hasBibLangId', () => {
        it('should return true for BibTeX language', () => {
            assert.ok(lw.file.hasBibLangId('bibtex'))
        })

        it('should return false for non-BibTeX languages', () => {
            assert.ok(!lw.file.hasBibLangId('latex'))
            assert.ok(!lw.file.hasBibLangId('tex'))
            assert.ok(!lw.file.hasBibLangId('markdown'))
        })
    })

    describe('lw.file.hasDtxLangId', () => {
        it('should return true for Doctex language', () => {
            assert.ok(lw.file.hasDtxLangId('doctex'))
        })

        it('should return false for non-Doctex languages', () => {
            assert.ok(!lw.file.hasDtxLangId('latex'))
            assert.ok(!lw.file.hasDtxLangId('tex'))
            assert.ok(!lw.file.hasDtxLangId('markdown'))
        })
    })

    describe('lw.file.read', () => {
        it('should read the content of an existing file', async () => {
            setRoot(fixture, 'main.tex')
            const content = await lw.file.read(lw.root.file.path ?? '')
            assert.strictEqual(content, '\\documentclass{article}\n\\begin{document}\nabc\n\\end{document}\n')
        })

        it('should return undefined when file does not exist and raise is false', async () => {
            setRoot(fixture, 'main.tex')
            const content = await lw.file.read(lw.root.file.path?.replaceAll('main.tex', 'nonexistent.tex') ?? '', false)
            assert.strictEqual(content, undefined)
        })

        it('should throw error when file does not exist and raise is true', async () => {
            setRoot(fixture, 'main.tex')
            try {
                await lw.file.read(lw.root.file.path?.replaceAll('main.tex', 'nonexistent.tex') ?? '', true)
                assert.fail('Expected an error to be thrown')
            } catch (error: any) {
                assert.strictEqual(error.code, 'FileNotFound')
            }
        })
    })

    describe('lw.file.exists', () => {
        it('should return true for an existing file URI', async () => {
            setRoot(fixture, 'main.tex')
            assert.ok(await lw.file.exists(lw.root.file.path ?? ''))
        })

        it('should return false for a non-existing file URI', async () => {
            setRoot(fixture, 'main.tex')
            assert.ok(!await lw.file.exists(lw.root.file.path?.replaceAll('main.tex', 'nonexistent.tex') ?? ''))
        })

        it('should handle non-file URIs', async () => {
            const oldStat = lw.external.stat
            lw.external.stat = () => { return Promise.resolve({type: 0, ctime: 0, mtime: 0, size: 0}) }
            const result = await lw.file.exists(vscode.Uri.parse('https://code.visualstudio.com/'))
            lw.external.stat = oldStat
            assert.ok(result)
        })

        it('should handle non-existing non-file URIs', async () => {
            assert.ok(!await lw.file.exists(vscode.Uri.parse('untitled:/Untitled-1')))
        })
    })

    describe('kpsewhich', () => {
        it('should call kpsewhich with correct arguments', async () => {
            await setConfig('kpsewhich.path', 'kpse')
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: '', output: [''], stderr: '', signal: 'SIGTERM' })
            lw.file.kpsewhich('article.cls')
            stub.restore()
            sinon.assert.calledWith(stub, 'kpse', ['article.cls'], sinon.match.any)
        })

        it('should handle isBib flag correctly', async () => {
            await setConfig('kpsewhich.path', 'kpse')
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: '', output: [''], stderr: '', signal: 'SIGTERM' })
            lw.file.kpsewhich('reference.bib', true)
            stub.restore()
            sinon.assert.calledWith(stub, 'kpse', ['-format=.bib', 'reference.bib'], sinon.match.any)
        })

        it('should return undefined if kpsewhich returns non-zero status', () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 1, stdout: '', output: [''], stderr: '', signal: 'SIGTERM' })
            const result = lw.file.kpsewhich('article.cls')
            stub.restore()
            assert.strictEqual(result, undefined)
        })

        it('should cache resolved path and hit', () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: getPath(fixture, 'article.cls'), output: [''], stderr: '', signal: 'SIGTERM' })
            const result1 = lw.file.kpsewhich('article.cls')
            const result2 = lw.file.kpsewhich('article.cls')
            stub.restore()
            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual(result1, result2)
        })

        it('should not cache on non-zero return', () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 1, stdout: getPath(fixture, 'article.cls'), output: [''], stderr: '', signal: 'SIGTERM' })
            lw.file.kpsewhich('another-article.cls')
            lw.file.kpsewhich('another-article.cls')
            stub.restore()
            assert.strictEqual(stub.callCount, 2)
        })

        it('should handle kpsewhich call failure gracefully', () => {
            const stub = sinon.stub(lw.external, 'sync').throws(new Error('kpsewhich failed'))
            const result = lw.file.kpsewhich('yet-another-article.cls')
            stub.restore()
            assert.strictEqual(result, undefined)
        })
    })
})
