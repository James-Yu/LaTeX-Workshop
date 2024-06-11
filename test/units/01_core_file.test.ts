import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock, set } from './utils'
import { lw } from '../../src/lw'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.file.createTmpDir', () => {
        it('should create temporary directories', () => {
            assert.ok(lw.file._test.createTmpDir())
        })

        it('should create different temporary directories', () => {
            assert.notStrictEqual(lw.file._test.createTmpDir(), lw.file._test.createTmpDir())
        })

        function forbiddenTemp(chars: string[ ]) {
            const tmp = process.env.TMP ?? process.env.TEMP ?? process.env.TMPDIR
            const tmpNames = ['TMP', 'TEMP', 'TMPDIR']
            chars.forEach(char => {
                tmpNames.forEach(envvar => process.env[envvar] = (process.env[envvar] === undefined ? undefined : ('\\Test ' + char)))
                try {
                    lw.file._test.createTmpDir()
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
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), lw.root.dir.path)
        })

        it('should get output directory without root or input latex', () => {
            assert.pathStrictEqual(lw.file.getOutDir(), './')
        })

        it('should get output directory with an input latex', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            assert.pathStrictEqual(lw.file.getOutDir(texPath), rootDir)
        })

        it('should get output directory with an input latex over the root', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(texPath), rootDir)
        })

        it('should get output directory with absolute `latex.outDir` and root', async () => {
            await set.config('latex.outDir', '/output')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), '/output')
        })

        it('should get output directory with relative `latex.outDir` and root', async () => {
            await set.config('latex.outDir', 'output')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), 'output')
        })

        it('should get output directory with relative `latex.outDir` with leading `./` and root', async () => {
            await set.config('latex.outDir', './output')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), 'output')
        })

        it('should get output directory with relative `latex.outDir`, root, and an input latex', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await set.config('latex.outDir', 'output')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(texPath), 'output')
        })

        it('should get output directory with placeholder in `latex.outDir` and root', async () => {
            await set.config('latex.outDir', '%DIR%')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), lw.root.dir.path)
        })

        it('should get output directory with placeholder in `latex.outDir`, root, and an input latex', async () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            await set.config('latex.outDir', '%DIR%')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(texPath), rootDir)
        })

        it('should get output directory from last compilation if `latex.outDir` is `%DIR%`', async () => {
            await set.config('latex.outDir', '%DIR%')
            set.root(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', '/output')
            assert.pathStrictEqual(lw.file.getOutDir(), '/output')
        })

        it('should ignore output directory from last compilation if `latex.outDir` is not `%DIR%`', async () => {
            await set.config('latex.outDir', '/output')
            set.root(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', '/trap')
            assert.pathStrictEqual(lw.file.getOutDir(), '/output')
        })

        it('should ignore output directory from last compilation if no `outdir` is recorded', async () => {
            await set.config('latex.outDir', '%DIR%')
            set.root(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '')
            assert.pathStrictEqual(lw.file.getOutDir(), lw.root.dir.path)
        })

        it('should handle empty `latex.outDir` correctly', async () => {
            await set.config('latex.outDir', '')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), './')
        })

        it('should handle absolute `latex.outDir` with trailing slashes correctly', async () => {
            await set.config('latex.outDir', '/output/')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), '/output')
        })

        it('should handle relative `latex.outDir` with trailing slashes correctly', async () => {
            await set.config('latex.outDir', 'output/')
            set.root(fixture, 'main.tex')
            assert.pathStrictEqual(lw.file.getOutDir(), 'output')
        })

        it('should normalize output directory paths correctly on Windows', () => {
            if (os.platform() === 'win32') {
                assert.pathStrictEqual(lw.file.getOutDir('c:\\path\\to\\file.tex'), 'c:/path/to')
            }
        })
    })

    describe('lw.file.getFlsPath', () => {
        it('should return the correct path when .fls exists in the output directory', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const flsPath = get.path(fixture, 'main.fls')

            assert.pathStrictEqual(await lw.file.getFlsPath(texPath), flsPath)
        })

        it('should return undefined when .fls does not exist in the output directory', async () => {
            const nonPath = get.path(fixture, 'nonexistent.tex')

            assert.pathStrictEqual(await lw.file.getFlsPath(nonPath), undefined)
        })

        it('should respect custom output directory when config is set', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const flsPath = get.path(fixture, 'output', 'main.fls')

            await set.config('latex.outDir', 'output')
            assert.pathStrictEqual(await lw.file.getFlsPath(texPath), flsPath)
        })

        it('should handle when `auxdir` is available in last compilation', async () => {
            const texPathAnother = get.path(fixture, 'another.tex')
            const flsPath = get.path(fixture, 'auxfiles', 'another.fls')

            set.root(fixture, 'another.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', undefined, 'auxfiles')
            assert.pathStrictEqual(await lw.file.getFlsPath(texPathAnother), flsPath)
        })

        it('should handle when `auxdir` is missing in last compilation', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const flsPath = get.path(fixture, 'main.fls')

            set.root(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', '/output')
            assert.pathStrictEqual(await lw.file.getFlsPath(texPath), flsPath)
        })

        it('should handle when `auxdir` is available in last compilation, but another .fls file in the output folder has higher priority', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const flsPath = get.path(fixture, 'main.fls')

            set.root(fixture, 'main.tex')
            lw.file.setTeXDirs(lw.root.file.path ?? '', undefined, 'auxfiles')
            assert.pathStrictEqual(await lw.file.getFlsPath(texPath), flsPath)
        })
    })

    describe('lw.file.getBibPath', () => {
        it('should correctly find BibTeX files', () => {
            set.root(fixture, 'main.tex')
            const result = lw.file.getBibPath('main.bib', lw.root.dir.path ?? '')
            assert.listStrictEqual(result, [
                path.resolve(lw.root.dir.path ?? '', 'main.bib')
            ])
        })

        it('should correctly find BibTeX files in basedir', () => {
            set.root(fixture, 'main.tex')
            const result = lw.file.getBibPath('sub.bib', path.resolve(lw.root.dir.path ?? '', 'subdir'))
            assert.listStrictEqual(result, [
                path.resolve(lw.root.dir.path ?? '', 'subdir', 'sub.bib')
            ])
        })

        it('should correctly find BibTeX files in `latex.bibDirs`', async () => {
            set.root(fixture, 'main.tex')
            await set.config('latex.bibDirs', [ path.resolve(lw.root.dir.path ?? '', 'subdir') ])
            const result = lw.file.getBibPath('sub.bib', lw.root.dir.path ?? '')
            assert.listStrictEqual(result, [
                path.resolve(lw.root.dir.path ?? '', 'subdir', 'sub.bib')
            ])
        })

        it('should return an empty array when no BibTeX file is found', async () => {
            set.root(fixture, 'main.tex')
            await set.config('latex.bibDirs', [ path.resolve(lw.root.dir.path ?? '', 'subdir') ])
            const result = lw.file.getBibPath('nonexistent.bib', path.resolve(lw.root.dir.path ?? '', 'output'))
            assert.listStrictEqual(result, [ ])
        })

        it('should correctly handle wildcard in BibTeX file name', () => {
            set.root(fixture, 'main.tex')
            const result = lw.file.getBibPath('*.bib', lw.root.dir.path ?? '')
            assert.listStrictEqual(result, [
                path.resolve(lw.root.dir.path ?? '', 'main.bib'),
                path.resolve(lw.root.dir.path ?? '', 'another.bib')
            ])
        })

        it('should handle case when kpsewhich is disabled and BibTeX file not found', async () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: get.path(fixture, 'nonexistent.bib'), output: [''], stderr: '', signal: 'SIGTERM' })
            await set.config('kpsewhich.bibtex.enabled', false)
            set.root(fixture, 'main.tex')
            const result = lw.file.getBibPath('nonexistent.bib', lw.root.dir.path ?? '')
            stub.restore()
            assert.listStrictEqual(result, [ ])
        })

        it('should handle case when kpsewhich is enabled and BibTeX file not found', async () => {
            const nonPath = get.path(fixture, 'nonexistent.bib')

            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: get.path(fixture, 'nonexistent.bib'), output: [''], stderr: '', signal: 'SIGTERM' })
            await set.config('kpsewhich.bibtex.enabled', true)
            set.root(fixture, 'main.tex')
            const result = lw.file.getBibPath('nonexistent.bib', lw.root.dir.path ?? '')
            stub.restore()
            assert.listStrictEqual(result, [ nonPath ])
        })

        it('should return an empty array when kpsewhich is enabled but file is not found', async () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: '', output: [''], stderr: '', signal: 'SIGTERM' })
            await set.config('kpsewhich.bibtex.enabled', true)
            set.root(fixture, 'main.tex')
            const result = lw.file.getBibPath('another-nonexistent.bib', lw.root.dir.path ?? '')
            stub.restore()
            assert.listStrictEqual(result, [ ])
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
            const texPath = get.path(fixture, 'main.tex')

            await set.config('latex.jobname', 'myJob')
            assert.strictEqual(lw.file.getJobname(texPath), 'myJob')
        })

        it('should return the name of the input texPath if jobname is empty', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await set.config('latex.jobname', '')
            const expectedJobname = path.parse(texPath).name
            assert.strictEqual(lw.file.getJobname(texPath), expectedJobname)
        })

        it('should return the name of the input texPath if configuration is not set', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await set.config('latex.jobname', undefined) // Ensuring the jobname is not set
            const expectedJobname = path.parse(texPath).name
            assert.strictEqual(lw.file.getJobname(texPath), expectedJobname)
        })
    })

    describe('lw.file.getPdfPath', () => {
        it('should return the correct PDF path when outDir is empty', async () => {
            await set.config('latex.outDir', '')
            set.root(fixture, 'main.tex')
            const texpath = lw.root.file.path ?? ''
            assert.pathStrictEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('.tex', '.pdf'))
        })

        it('should return the correct PDF path when outDir is specified', async () => {
            await set.config('latex.outDir', 'output')
            set.root(fixture, 'main.tex')
            const texpath = lw.root.file.path ?? ''
            assert.pathStrictEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('main.tex', 'output/main.pdf'))
        })

        it('should handle spaces in file paths correctly', () => {
            set.root(fixture, 'document with spaces.tex')
            const texpath = lw.root.file.path ?? ''
            assert.pathStrictEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('.tex', '.pdf'))
        })

        it('should handle special characters in file names correctly', () => {
            set.root(fixture, 'special_!@#$%^&*()-_=+[ ]{}\'`~,.<>?.tex')
            const texpath = lw.root.file.path ?? ''
            assert.pathStrictEqual(lw.file.getPdfPath(texpath), texpath.replaceAll('.tex', '.pdf'))
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
            set.root(fixture, 'main.tex')
            const content = await lw.file.read(lw.root.file.path ?? '')
            assert.strictEqual(content, '\\documentclass{article}\n\\begin{document}\nabc\n\\end{document}\n')
        })

        it('should return undefined when file does not exist and raise is false', async () => {
            set.root(fixture, 'main.tex')
            const content = await lw.file.read(lw.root.file.path?.replaceAll('main.tex', 'nonexistent.tex') ?? '', false)
            assert.strictEqual(content, undefined)
        })

        it('should throw error when file does not exist and raise is true', async () => {
            set.root(fixture, 'main.tex')
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
            set.root(fixture, 'main.tex')
            assert.ok(await lw.file.exists(lw.root.file.path ?? ''))
        })

        it('should return false for a non-existing file URI', async () => {
            set.root(fixture, 'main.tex')
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
            await set.config('kpsewhich.path', 'kpse')
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: '', output: [''], stderr: '', signal: 'SIGTERM' })
            lw.file.kpsewhich('article.cls')
            stub.restore()
            sinon.assert.calledWith(stub, 'kpse', ['article.cls'], sinon.match.any)
        })

        it('should handle isBib flag correctly', async () => {
            await set.config('kpsewhich.path', 'kpse')
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
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 0, stdout: get.path(fixture, 'article.cls'), output: [''], stderr: '', signal: 'SIGTERM' })
            const result1 = lw.file.kpsewhich('article.cls')
            const result2 = lw.file.kpsewhich('article.cls')
            stub.restore()
            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual(result1, result2)
        })

        it('should not cache on non-zero return', () => {
            const stub = sinon.stub(lw.external, 'sync').returns({ pid: 0, status: 1, stdout: get.path(fixture, 'article.cls'), output: [''], stderr: '', signal: 'SIGTERM' })
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
