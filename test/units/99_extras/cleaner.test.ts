import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { EventEmitter } from 'events'
import { glob } from 'glob'
import { assert, mock, set, log } from '../utils'
import { lw } from '../../../src/lw'
import { clean } from '../../../src/extras/cleaner'
import { build } from '../../../src/compile/build'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const cwd = process.cwd()
    const rootFile = path.join(cwd, 'main.tex')
    const outDir = path.join(cwd, 'out')
    const auxDir = path.join(cwd, 'aux')

    function statOf(type: vscode.FileType): vscode.FileStat {
        return { type, ctime: 0, mtime: 0, size: 0 }
    }

    function stubGlob(mapping: Record<string, string[]>) {
        const globStub = sinon.stub(glob, 'sync').callsFake((pattern: string | string[], options?: { cwd?: string | URL }) => {
            const globCwd = typeof options?.cwd === 'string' ? options.cwd : ''
            return mapping[`${globCwd}|${String(pattern)}`] ?? []
        })
        return globStub
    }

    function stubProcess(event: 'exit' | 'error', payload: number | Error, stderrText = '') {
        const proc = new EventEmitter()
        const stderr = new EventEmitter()
        ;(proc as unknown as { stderr: EventEmitter }).stderr = stderr

        process.nextTick(() => {
            if (stderrText) {
                stderr.emit('data', stderrText)
            }
            if (event === 'exit') {
                proc.emit('exit', payload as number)
            } else {
                proc.emit('error', payload as Error)
            }
        })

        return proc as unknown as ReturnType<typeof lw.external.spawn>
    }

    before(() => {
        mock.init(lw, 'file', 'cache', 'extra')
    })

    after(() => {
        sinon.restore()
    })

    beforeEach(() => {
        set.config('latex.clean.method', 'glob')
        set.config('latex.clean.fileTypes', ['*.aux', '*.fls'])
        set.config('latex.clean.subfolder.enabled', false)
        set.config('latex.clean.command', 'latexmk')
        set.config('latex.clean.args', ['-c', '%TEX%'])

        lw.root.file.path = undefined
    })

    describe('lw.extra.cleaner->clean', () => {
        let spawnStub: sinon.SinonStub | undefined
        let infoSpy: sinon.SinonSpy | undefined

        afterEach(() => {
            spawnStub?.restore()
            infoSpy?.restore()
            spawnStub = undefined
            infoSpy = undefined
        })

        it('should log and return when no root file can be determined', async () => {
            lw.root.file.path = undefined

            log.start()
            await clean()
            log.stop()

            assert.hasLog('Cannot determine the root file to be cleaned.')
        })

        it('should call `lw.root.find` when `lw.root.file.path` is already defined and `rootFile` arg is not provided', async () => {
            lw.root.file.path = rootFile
            const findStub = (lw.root.find as sinon.SinonStub).resolves()
            findStub.resetHistory()
            set.config('latex.clean.method', 'unknown-method')

            await clean()

            assert.strictEqual(findStub.callCount, 1)
        })

        it('should log unknown cleaning method', async () => {
            set.config('latex.clean.method', 'unknown-method')

            log.start()
            await clean(rootFile)
            log.stop()

            assert.hasLog('Unknown cleaning method unknown-method .')
        })
    })

    describe('lw.extra.cleaner->cleanGlob', () => {
        let outStub: sinon.SinonStub
        let auxStub: sinon.SinonStub
        let globStub: sinon.SinonStub | undefined
        let statStub: sinon.SinonStub
        let deleteStub: sinon.SinonStub
        let readDirStub: sinon.SinonStub

        beforeEach(() => {
            outStub = sinon.stub(lw.file, 'getOutDir').returns('out')
            auxStub = sinon.stub(lw.file, 'getAuxDir').returns('aux')
            statStub = sinon.stub(lw.external, 'stat').resolves(statOf(vscode.FileType.File))
            deleteStub = sinon.stub(lw.external, 'delete').resolves()
            readDirStub = sinon.stub(lw.external, 'readDir').resolves([])
        })

        afterEach(() => {
            outStub.restore()
            auxStub.restore()
            globStub?.restore()
            statStub.restore()
            readDirStub.restore()
            deleteStub.restore()
            globStub = undefined
        })

        it('should remove matched files in outDir and auxDir (glob clean)', async () => {
            globStub = stubGlob({
                [`${outDir}|*.aux`]: ['main.aux'],
                [`${outDir}|*.fls`]: ['main.fls'],
                [`${auxDir}|*.aux`]: ['main.aux'],
                [`${auxDir}|*.fls`]: []
            })

            await clean(rootFile)

            const deletedPaths = deleteStub.getCalls().map(call => (call.args[0] as vscode.Uri).fsPath).sort()
            assert.deepStrictEqual(deletedPaths, [
                path.join(auxDir, 'main.aux'),
                path.join(outDir, 'main.aux'),
                path.join(outDir, 'main.fls')
            ])
        })

        it('should honor latex.clean.fileTypes override', async () => {
            set.config('latex.clean.fileTypes', ['*.aux'])
            globStub = stubGlob({
                [`${outDir}|*.aux`]: ['main.aux', 'sub.aux'],
                [`${auxDir}|*.aux`]: []
            })

            await clean(rootFile)

            const deletedPaths = deleteStub.getCalls().map(call => (call.args[0] as vscode.Uri).fsPath).sort()
            assert.deepStrictEqual(deletedPaths, [path.join(outDir, 'main.aux'), path.join(outDir, 'sub.aux')])
        })

        it('should prefix globs with globstar when latex.clean.subfolder.enabled is true', async () => {
            set.config('latex.clean.subfolder.enabled', true)
            set.config('latex.clean.fileTypes', ['*.aux'])
            globStub = sinon.stub(glob, 'sync').returns([])

            await clean(rootFile)

            const patterns = globStub.getCalls().map(call => String(call.args[0]))
            assert.ok(patterns.every(pattern => typeof pattern === 'string' && pattern.startsWith('./**/')))
        })

        it('should not remove directories matched by non-folder globs', async () => {
            set.config('latex.clean.fileTypes', ['tmp'])
            globStub = stubGlob({
                [`${outDir}|tmp`]: ['tmp'],
                [`${auxDir}|tmp`]: []
            })
            statStub.resolves(statOf(vscode.FileType.Directory))

            await clean(rootFile)
            assert.strictEqual(deleteStub.callCount, 0)
        })

        it('should remove empty folders explicitly configured with trailing slash', async () => {
            set.config('latex.clean.fileTypes', [`tmp${path.sep}`])
            globStub = stubGlob({
                [`${outDir}|tmp${path.sep}`]: ['tmp'],
                [`${auxDir}|tmp${path.sep}`]: ['tmp']
            })
            statStub.resolves(statOf(vscode.FileType.Directory))
            readDirStub.resetBehavior()
            readDirStub
                .onFirstCall().resolves([])
                .onSecondCall().resolves([['keep.txt', vscode.FileType.File]])

            await clean(rootFile)

            const deletedPaths = deleteStub.getCalls().map(call => (call.args[0] as vscode.Uri).fsPath)
            assert.deepStrictEqual(deletedPaths, [path.join(outDir, 'tmp')])
        })

        it('should ignore folder glob patterns with globstar', async () => {
            set.config('latex.clean.fileTypes', [`**${path.sep}tmp${path.sep}`])
            globStub = sinon.stub(glob, 'sync').returns(['tmp'])
            statStub.resolves(statOf(vscode.FileType.Directory))

            await clean(rootFile)
            assert.strictEqual(deleteStub.callCount, 0)
        })

        it('should log error and continue when stat fails for a matched path', async () => {
            set.config('latex.clean.fileTypes', ['*.aux'])
            globStub = stubGlob({
                [`${outDir}|*.aux`]: ['broken.aux'],
                [`${auxDir}|*.aux`]: []
            })
            statStub.rejects(new Error('stat failed'))

            log.start()
            await clean(rootFile)
            log.stop()
            assert.strictEqual(deleteStub.callCount, 0)
            assert.hasLog(`Failed cleaning path ${path.join(outDir, 'broken.aux')} .`)
        })
    })

    describe('lw.extra.cleaner->cleanCommand', () => {
        let spawnStub: sinon.SinonStub

        beforeEach(() => {
            set.config('latex.clean.method', 'command')
            spawnStub = sinon.stub(lw.external, 'spawn')
        })

        afterEach(() => {
            spawnStub.restore()
        })

        it('should spawn command with %TEX% replaced and cwd set to root directory', async () => {
            set.config('latex.clean.command', 'latexmk')
            set.config('latex.clean.args', ['-c', '%TEX%'])
            spawnStub.callsFake((_command, _args, _opts) => stubProcess('exit', 0))

            await clean(rootFile)

            const [command, args, options] = spawnStub.firstCall.args as [string, string[], { cwd: string }]
            assert.strictEqual(command, 'latexmk')
            assert.deepStrictEqual(args, ['-c', rootFile])
            assert.pathStrictEqual(options.cwd, cwd)
        })

        it('should support auxdir argument placeholders used by latexmk clean with auxdir', async () => {
            set.config('latex.clean.command', 'latexmk')
            set.config('latex.clean.args', ['-c', '-auxdir=%OUTDIR%/aux_files', '%TEX%'])
            spawnStub.callsFake((_command, _args, _opts) => stubProcess('exit', 0))

            await clean(rootFile)

            const args = spawnStub.firstCall.args[1] as string[]
            assert.strictEqual(args[0], '-c')
            assert.strictEqual(args[2], rootFile)
            assert.ok(args[1].startsWith('-auxdir='))
            assert.ok(args[1].endsWith('/aux_files'))
        })

        it('should log command failure when spawned process exits non-zero', async () => {
            spawnStub.callsFake(() => stubProcess('exit', 1, 'clean failed'))

            log.start()
            await clean(rootFile)
            log.stop()

            assert.hasLog('The clean command failed.')
        })

        it('should log command spawn errors', async () => {
            set.config('latex.clean.command', 'non-existing-cleaner')
            spawnStub.callsFake(() => stubProcess('error', new Error('spawn failed'), 'boom'))

            log.start()
            await clean(rootFile)
            log.stop()

            assert.hasLog('Failed running cleaning command non-existing-cleaner .')
        })
    })

    describe('lw.cleaner->build invocation', () => {
        let activeStub: sinon.SinonStub
        let cleanStub: sinon.SinonStub

        beforeEach(() => {
            activeStub = mock.activeTextEditor(rootFile, '', { languageId: 'latex' })
            cleanStub = sinon.stub(lw.extra, 'clean').resolves()
            set.config('latex.tools', [
                { name: 'ok', command: 'bash', args: ['-c', 'exit 0;'] },
                { name: 'bad', command: 'bash', args: ['-c', 'exit 1;'] }
            ])
            set.config('latex.recipes', [{ name: 'recipe', tools: ['ok'] }])
            set.config('latex.autoBuild.cleanAndRetry.enabled', false)
            set.config('latex.autoClean.run', 'never')
        })

        afterEach(() => {
            activeStub.restore()
            cleanStub.restore()
        })

        it('should cover `autoClean.run=never` and failed build (no auto-clean)', async () => {
            set.config('latex.recipes', [{ name: 'recipe', tools: ['bad'] }])

            await build(true, rootFile, 'latex')

            assert.strictEqual(cleanStub.callCount, 0)
        })

        it('should cover `autoClean.run=never` and passed build (no auto-clean)', async () => {
            set.config('latex.recipes', [{ name: 'recipe', tools: ['ok'] }])

            await build(true, rootFile, 'latex')

            assert.strictEqual(cleanStub.callCount, 0)
        })

        it('should cover `autoClean.run=onFailed` (auto-clean on failure)', async () => {
            set.config('latex.autoClean.run', 'onFailed')
            set.config('latex.recipes', [{ name: 'recipe', tools: ['bad'] }])

            await build(true, rootFile, 'latex')

            assert.strictEqual(cleanStub.callCount, 1)
            assert.strictEqual(cleanStub.firstCall.args[0], rootFile)
        })

        it('should cover `autoClean.run=onBuilt` for failed and successful builds', async () => {
            set.config('latex.autoClean.run', 'onBuilt')

            set.config('latex.recipes', [{ name: 'recipe', tools: ['bad'] }])
            await build(true, rootFile, 'latex')

            set.config('latex.recipes', [{ name: 'recipe', tools: ['ok'] }])
            await build(true, rootFile, 'latex')

            assert.strictEqual(cleanStub.callCount, 2)
            assert.strictEqual(cleanStub.firstCall.args[0], rootFile)
            assert.strictEqual(cleanStub.secondCall.args[0], rootFile)
        })

        it('should cover clean-and-retry on failed build', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            set.config('latex.autoClean.run', 'never')
            set.config('latex.recipes', [{ name: 'recipe', tools: ['bad'] }])

            await build(true, rootFile, 'latex')

            assert.strictEqual(cleanStub.callCount, 1)
            assert.strictEqual(cleanStub.firstCall.args[0], rootFile)
        })
    })
})
