import * as vscode from 'vscode'
import * as path from 'path'
import Sinon, * as sinon from 'sinon'
import { assert, get, log, mock, set, sleep } from '../utils'
import { lw } from '../../../src/lw'
import { build, initialize } from '../../../src/compile/recipe'
import { queue } from '../../../src/compile/queue'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let getAuxDirStub: sinon.SinonStub
    let getIncludedTeXStub: sinon.SinonStub
    let mkdirStub: sinon.SinonStub

    before(() => {
        mock.init(lw)
        getAuxDirStub = sinon.stub(lw.file, 'getAuxDir').returns('.')
        getIncludedTeXStub = lw.cache.getIncludedTeX as sinon.SinonStub
        mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)
    })

    beforeEach(() => {
        initialize()
        getIncludedTeXStub.returns([])
        set.config('latex.recipe.default', 'first')
    })

    afterEach(() => {
        queue.clear()
        getAuxDirStub.resetHistory()
        getIncludedTeXStub.resetHistory()
        mkdirStub.resetHistory()
        lw.root.subfiles.path = undefined
        lw.compile.compiledPDFPath = ''
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->recipe', () => {
        it('should set the LATEXWORKSHOP_DOCKER_LATEX environment variable based on the configuration', async () => {
            const expectedImageName = 'your-docker-image'

            await set.codeConfig('docker.image.latex', expectedImageName)
            await sleep(150)

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_LATEX'], expectedImageName)
        })

        it('should set the LATEXWORKSHOP_DOCKER_PATH environment variable based on the configuration', async () => {
            const expectedDockerPath = '/usr/local/bin/docker'

            await set.codeConfig('docker.path', expectedDockerPath)
            await sleep(150)

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_PATH'], expectedDockerPath)
        })
    })

    describe('lw.compile->recipe.build', () => {
        it('should call `saveAll` before building', async () => {
            const stub = sinon.stub(vscode.workspace, 'saveAll') as sinon.SinonStub
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})
            stub.restore()

            assert.ok(stub.calledOnce)
        })

        it('should call `createAuxSubFolders` with correct args', async () => {
            const rootFile = set.root('main.tex')
            const subPath = get.path('sub', 'main.tex')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])

            await build(rootFile, 'latex', async () => {})
            assert.hasLog(`auxDir: ${path.dirname(rootFile)} .`)
        })

        it('should call `createAuxSubFolders` with correct args with subfiles package', async () => {
            const rootFile = set.root('main.tex')
            const subPath = get.path('sub', 'main.tex')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])

            await build(subPath, 'latex', async () => {})
            assert.hasLog(`auxDir: ${path.dirname(rootFile)} .`)
        })

        it('should not call buildLoop if no tool is created', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.tools', [])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool'] }])

            const stub = sinon.stub()
            await build(rootFile, 'latex', stub)

            assert.strictEqual(stub.callCount, 0)
        })

        it('should set lw.compile.compiledPDFPath', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            assert.pathStrictEqual(lw.compile.compiledPDFPath, rootFile.replace('.tex', '.pdf'))
        })

        it('should use tool cwd instead of the default working folder', async () => {
            const rootFile = set.root('main.tex')
            const customCwd = get.path('custom-build-dir')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', cwd: customCwd }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.cwd, customCwd)
        })

        it('should keep separate cwd overrides for different tools in the same recipe', async () => {
            const rootFile = set.root('main.tex')
            const firstCwd = get.path('build-a')
            const secondCwd = get.path('build-b')
            set.config('latex.tools', [
                { name: 'Tool1', command: 'pdflatex', cwd: firstCwd },
                { name: 'Tool2', command: 'bibtex', cwd: secondCwd }
            ])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1', 'Tool2'] }])

            await build(rootFile, 'latex', async () => {})

            const firstStep = queue.getStep()
            const secondStep = queue.getStep()
            assert.ok(firstStep)
            assert.ok(secondStep)
            assert.pathStrictEqual(firstStep.cwd, firstCwd)
            assert.pathStrictEqual(secondStep.cwd, secondCwd)
        })

        it('should fall back to the default working folder when tool cwd is not set', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.build.fromFolder', 'build')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.cwd, get.path('build'))
        })

        const fileStat = { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 }

        it('should add -cd for a subfiles build when the main file resolves only from the subfile directory', async () => {
            const rootFile = set.root('main.tex')
            lw.root.subfiles.path = get.path('section', 'main.tex')
            const readStub = sinon.stub(lw.file, 'read').resolves('\\documentclass[../main.tex]{subfiles}\n')
            const existsStub = sinon.stub(lw.file, 'exists').callsFake((target: string | vscode.Uri) => {
                return Promise.resolve(target === get.path('main.tex') ? fileStat : false)
            })

            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['-pdf'] }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            readStub.restore()
            existsStub.restore()
            const step = queue.getStep()
            assert.ok(step)
            assert.listStrictEqual(step.args, ['-pdf', '-cd'])
        })

        it('should not add -cd when no subfiles root is used', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['-pdf'] }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.listStrictEqual(step.args, ['-pdf'])
        })

        it('should not add -cd when the main file already resolves from the working folder', async () => {
            const rootFile = set.root('main.tex')
            lw.root.subfiles.path = get.path('section', 'main.tex')
            const readStub = sinon.stub(lw.file, 'read').resolves('\\documentclass[../main.tex]{subfiles}\n')
            const existsStub = sinon.stub(lw.file, 'exists').callsFake((target: string | vscode.Uri) => {
                return Promise.resolve(target === get.path('main.tex') ? fileStat : false)
            })
            set.config('latex.build.fromFolder', 'section')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['-pdf'] }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            readStub.restore()
            existsStub.restore()
            const step = queue.getStep()
            assert.ok(step)
            assert.listStrictEqual(step.args, ['-pdf'])
        })

        it('should not add -cd when latexmk already defines a cwd override', async () => {
            const rootFile = set.root('main.tex')
            lw.root.subfiles.path = get.path('section', 'main.tex')
            const readStub = sinon.stub(lw.file, 'read').resolves('\\documentclass[../main.tex]{subfiles}\n')
            const existsStub = sinon.stub(lw.file, 'exists').resolves(false)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', cwd: 'build', args: ['-pdf'] }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            readStub.restore()
            existsStub.restore()
            const step = queue.getStep()
            assert.ok(step)
            assert.listStrictEqual(step.args, ['-pdf'])
        })

        it('should not add -cd when latexmk already includes the switch in its args', async () => {
            const rootFile = set.root('main.tex')
            lw.root.subfiles.path = get.path('section', 'main.tex')
            const readStub = sinon.stub(lw.file, 'read').resolves('\\documentclass[../main.tex]{subfiles}\n')
            const existsStub = sinon.stub(lw.file, 'exists').resolves(false)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['-pdf', '-cd'] }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            readStub.restore()
            existsStub.restore()
            const step = queue.getStep()
            assert.ok(step)
            assert.listStrictEqual(step.args, ['-pdf', '-cd'])
        })

        it('should not add -cd for non-latexmk tools even in a subfiles build', async () => {
            const rootFile = set.root('main.tex')
            lw.root.subfiles.path = get.path('section', 'main.tex')
            const readStub = sinon.stub(lw.file, 'read').resolves('\\documentclass[../main.tex]{subfiles}\n')
            const existsStub = sinon.stub(lw.file, 'exists').callsFake((target: string | vscode.Uri) => {
                return Promise.resolve(target === get.path('main.tex') ? fileStat : false)
            })

            set.config('latex.tools', [{ name: 'pdflatex', command: 'pdflatex', args: ['-interaction=nonstopmode'] }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['pdflatex'] }])

            await build(rootFile, 'latex', async () => {})

            readStub.restore()
            existsStub.restore()
            const step = queue.getStep()
            assert.ok(step)
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])
        })
    })

    describe('lw.compile->recipe.createBuildTools', () => {
        let readStub: sinon.SinonStub

        beforeEach(() => {
            readStub = sinon.stub(lw.file, 'read')
        })

        afterEach(() => {
            readStub.restore()
        })

        it('should do nothing but log an error if no recipe is found', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.recipes', [])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Invalid toolchain.')
        })

        it('should create build tools based on magic comments when enabled', async () => {
            const rootFile = set.root('magic.tex')
            readStub.resolves('% !TEX program = pdflatex\n')
            set.config('latex.build.enableMagicComments', true)
            set.config('latex.recipes', [])
            set.config('latex.build.enableMagicComments', true)
            set.config('latex.magic.args', ['--shell-escape'])

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])
        })

        it('should do nothing but log an error with magic comments but disabled', async () => {
            const rootFile = set.root('magic.tex')
            set.config('latex.recipes', [])
            set.config('latex.build.enableMagicComments', false)

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Invalid toolchain.')
        })

        it('should skip undefined tools in the recipe and log an error', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.tools', [{ name: 'existingTool', command: 'pdflatex' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool', 'existingTool'] }])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Skipping undefined tool nonexistentTool in recipe Recipe1.')
            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'existingTool')
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, [])
        })

        it('should do nothing but log an error if no tools are prepared', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.tools', [])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool'] }])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Invalid toolchain.')
        })
    })

    describe('lw.compile->recipe.createAuxSubFolders', () => {
        beforeEach(() => {
            getIncludedTeXStub.returns([ set.root('main.tex') ])
        })

        afterEach(() => {
            getAuxDirStub.returns('.')
        })

        it('should resolve the aux directory relative to the root directory if not absolute', async () => {
            const rootFile = set.root('main.tex')
            const relativeAuxDir = 'aux'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeAuxDir)
            getAuxDirStub.returns(relativeAuxDir)

            await build(rootFile, 'latex', async () => {})

            assert.hasLog(`auxDir: ${expectedOutDir} .`)
        })

        it('should use the absolute aux directory as is', async () => {
            const rootFile = set.root('main.tex')
            const absoluteOutDir = '/absolute/output'
            getAuxDirStub.returns(absoluteOutDir)

            await build(rootFile, 'latex', async () => {})

            assert.hasLog(`auxDir: ${absoluteOutDir} .`)
        })

        it('should create the aux directory if it does not exist', async () => {
            const rootFile = set.root('main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)
            const stub = sinon.stub(lw.file, 'exists').resolves(false)
            getAuxDirStub.returns(relativeOutDir)

            await build(rootFile, 'latex', async () => {})
            stub.restore()

            assert.strictEqual(mkdirStub.callCount, 1)
            assert.pathStrictEqual(mkdirStub.getCall(0).args[0] as string, expectedOutDir)
            assert.deepStrictEqual(mkdirStub.getCall(0).args[1], { recursive: true })
        })

        it('should not create the aux directory if it already exists', async () => {
            const rootFile = set.root('main.tex')
            const relativeOutDir = 'output'
            const stub = sinon.stub(lw.file, 'exists').resolves({ type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 })
            getAuxDirStub.returns(relativeOutDir)

            await build(rootFile, 'latex', async () => {})
            mkdirStub.resetHistory()

            await build(rootFile, 'latex', async () => {})
            stub.restore()

            assert.ok(!mkdirStub.called)
        })
    })

    describe('lw.compile->recipe.findMagicComments', () => {
        let readStub: sinon.SinonStub

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            queue.clear()
        })

        beforeEach(() => {
            set.config('latex.build.enableMagicComments', true)
        })

        afterEach(() => {
            readStub.reset()
            queue.clear()
        })

        after(() => {
            readStub.restore()
        })

        it('should do nothing if there are no magic comments', async () => {
            readStub.resolves('Some regular content\nwith no magic comments')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()

            assert.ok(step)
            assert.notStrictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.notStrictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
        })

        it('should detect only TeX magic comment', async () => {
            readStub.resolves('% !TEX program = pdflatex\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'pdflatex')
        })

        it('should detect TeX magic comment with options', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !TEX options = --shell-escape\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])
        })

        it('should detect BIB magic comment', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !BIB program = bibtex\n')

            await build('dummy.tex', 'latex', async () => {})

            queue.getStep() // pdflatex
            const step = queue.getStep() // bibtex

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'bibtex')
        })

        it('should detect BIB magic comment with options', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !BIB program = bibtex\n% !BIB options = --min-crossrefs=100\n')

            await build('dummy.tex', 'latex', async () => {})

            queue.getStep() // pdflatex
            const step = queue.getStep() // bibtex

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'bibtex')
            assert.listStrictEqual(step.args, ['--min-crossrefs=100'])
        })

        it('should detect only LW recipe comment', async () => {
            set.config('latex.tools', [{ name: 'Tool1', command: 'pdflatex' }, { name: 'Tool2', command: 'xelatex' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1'] }, { name: 'Recipe2', tools: ['Tool2'] }])

            readStub.resolves('% !LW recipe = Recipe2\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool2')
            assert.strictEqual(step.command, 'xelatex')
        })

            it('should ignore LW recipe comment when calling a given recipe', async () => {
            set.config('latex.tools', [{ name: 'Tool1', command: 'pdflatex' }, { name: 'Tool2', command: 'xelatex' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1'] }, { name: 'Recipe2', tools: ['Tool2'] }])

            readStub.resolves('% !LW recipe = Recipe2\n')

            await build('dummy.tex', 'latex', async () => {}, 'Recipe1')

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool1')
            assert.strictEqual(step.command, 'pdflatex')
        })

        it('should detect all magic comments', async () => {
            readStub.resolves(
                '% !TEX program = xelatex\n' +
                    '% !TEX options = -interaction=nonstopmode\n' +
                    '% !BIB program = biber\n' +
                    '% !BIB options = --debug'
            )

            await build('dummy.tex', 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'biber')
            assert.listStrictEqual(step.args, ['--debug'])
        })

        it('should ignore non-magic comments', async () => {
            readStub.resolves('This is a regular line\n% !TEX program = texprogram')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.notStrictEqual(step.command, 'texprogram')
        })

        it('should stop reading after encountering non-comment lines', async () => {
            readStub.resolves(
                '% !TEX program = pdflatex\n' +
                    'This is not a comment and should stop further reading\n' +
                    '% !BIB program = bibtex'
            )

            await build('dummy.tex', 'latex', async () => {})

            queue.getStep() // pdflatex
            const step = queue.getStep() // bibtex

            assert.strictEqual(step, undefined)
        })
    })

    describe('lw.compile->recipe.createBuildMagic', () => {
        let readStub: sinon.SinonStub

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            queue.clear()
        })

        beforeEach(() => {
            set.config('latex.build.enableMagicComments', true)
            set.config('latex.magic.args', ['--shell-escape'])
            set.config('latex.magic.bib.args', ['--min-crossrefs=1000'])
        })

        afterEach(() => {
            readStub.reset()
            queue.clear()
        })

        after(() => {
            readStub.restore()
        })

        it('should set magicTex.args and magicTex.name if magicTex.args is undefined and magicBib is undefined', async () => {
            readStub.resolves('% !TEX program = pdflatex\n\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])
        })

        it('should set magicTex.args, magicTex.name, magicBib.args, and magicBib.name when magicBib is provided and both args are undefined', async () => {
            readStub.resolves('% !TEX program = xelatex\n% !BIB program = biber\n')

            await build('dummy.tex', 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'biber')
            assert.listStrictEqual(step.args, ['--min-crossrefs=1000'])
        })

        it('should not overwrite magicTex.args if it is already defined, even when magicBib is provided and magicBib.args is undefined', async () => {
            readStub.resolves('% !TEX program = xelatex\n% !TEX options = -interaction=nonstopmode\n% !BIB program = biber\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])
        })

        it('should not overwrite magicTex.args and magicBib.args if both are already defined', async () => {
            readStub.resolves('% !TEX program = xelatex\n% !TEX options = -interaction=nonstopmode\n% !BIB program = biber\n% !BIB options = --debug\n')

            await build('dummy.tex', 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'biber')
            assert.listStrictEqual(step.args, ['--debug'])
        })
    })

    describe('lw.compile->recipe.findRecipe', () => {
        beforeEach(() => {
            set.config('latex.tools', [{ name: 'Tool1', command: 'pdflatex' }, { name: 'Tool2', command: 'xelatex' }, { name: 'Tool3', command: 'lualatex' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1'] }, { name: 'Recipe2', tools: ['Tool2'] }, { name: 'Recipe3', tools: ['Tool3'] }])
        })

        it('should do nothing but log an error if no recipes are defined', async () => {
            set.config('latex.recipes', [])

            await build('dummy.tex', 'latex', async () => {})

            assert.hasLog('No recipes defined.')
        })

        it('should use the default recipe name if recipeName is undefined', async () => {
            set.config('latex.recipe.default', 'Recipe2')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool2')
        })

        it('should do nothing log an error if the specified recipe is not found', async () => {
            await build('dummy.tex', 'latex', async () => {}, 'nonExistentRecipe')

            assert.hasLog('Failed to resolve build recipe')
        })

        it('should return the last used recipe if defaultRecipeName is `lastUsed`', async () => {
            set.config('latex.recipe.default', 'lastUsed')

            await build('dummy.tex', 'latex', async () => {}, 'Recipe2')
            queue.clear()
            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool2')
        })

        it('should use the updated new tools in the last used recipe if defaultRecipeName is `lastUsed`', async () => {
            set.config('latex.recipe.default', 'lastUsed')

            await build('dummy.tex', 'latex', async () => {}, 'Recipe2')
            queue.clear()

            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1'] }, { name: 'Recipe2', tools: ['Tool3'] }, { name: 'Recipe3', tools: ['Tool3'] }])
            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool3')
        })

        it('should reset prevRecipe if the language ID changes', async () => {
            set.config('latex.recipe.default', 'lastUsed')

            await build('dummy.tex', 'latex', async () => {}, 'Recipe2')
            queue.clear()
            await build('dummy.tex', 'latex-expl3', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.notStrictEqual(step.name, 'Tool2')
        })

        it('should return the first matching recipe based on langId if no recipe is found', async () => {
            set.config('latex.recipes', [
                { name: 'recipe1', tools: [] },
                { name: 'rsweave Recipe', tools: [] },
                { name: 'weave.jl Recipe', tools: [] },
                { name: 'pweave Recipe', tools: [] },
            ])

            log.start()
            await build('dummy.tex', 'rsweave', async () => {})
            log.stop()

            assert.hasLog('Preparing to run recipe: rsweave Recipe.')
            assert.notHasLog('Preparing to run recipe: weave.jl Recipe.')
            assert.notHasLog('Preparing to run recipe: pweave Recipe.')

            log.start()
            await build('dummy.tex', 'jlweave', async () => {})
            log.stop()

            assert.notHasLog('Preparing to run recipe: rsweave Recipe.')
            assert.hasLog('Preparing to run recipe: weave.jl Recipe.')
            assert.notHasLog('Preparing to run recipe: pweave Recipe.')

            log.start()
            await build('dummy.tex', 'pweave', async () => {})
            log.stop()

            assert.notHasLog('Preparing to run recipe: rsweave Recipe.')
            assert.notHasLog('Preparing to run recipe: weave.jl Recipe.')
            assert.hasLog('Preparing to run recipe: pweave Recipe.')
        })

        it('should do nothing but log an error if no matching recipe is found for the specific langId', async () => {
            await build('dummy.tex', 'rsweave', async () => {})

            assert.hasLog('Cannot find any recipe for langID `rsweave`.')
        })

        it('should use the first recipe if no other recipe matches', async () => {
            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool1')
        })
    })

    describe('lw.compile->recipe.populateTools', () => {
        let readStub: sinon.SinonStub
        let syncStub: sinon.SinonStub
        let platform: PropertyDescriptor | undefined
        let extRoot: string

        const setPlatform = (newPlatform: NodeJS.Platform) => {
            Object.defineProperty(process, 'platform', { value: newPlatform })
        }

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            syncStub = sinon.stub(lw.external, 'sync')
            platform = Object.getOwnPropertyDescriptor(process, 'platform')
            extRoot = lw.extensionRoot
        })

        beforeEach(() => {
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])
        })

        afterEach(() => {
            readStub.reset()
            syncStub.reset()
            if (platform !== undefined) {
                Object.defineProperty(process, 'platform', platform)
            }
            lw.extensionRoot = extRoot
            queue.clear()
        })

        after(() => {
            readStub.restore()
            syncStub.restore()
        })

        it('should modify command when Docker is enabled on Windows', async () => {
            set.config('docker.enabled', true)
            setPlatform('win32')
            lw.extensionRoot = '/path/to/extension'

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.command, path.resolve('/path/to/extension', './scripts/latexmk.bat'))
        })

        it('should modify command and chmod when Docker is enabled on non-Windows', async () => {
            set.config('docker.enabled', true)
            setPlatform('linux')
            lw.extensionRoot = '/path/to/extension'

            const stub = sinon.stub(lw.external, 'chmodSync')
            await build('dummy.tex', 'latex', async () => {})
            stub.restore()

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.command, path.resolve('/path/to/extension', './scripts/latexmk'))
            assert.strictEqual(stub.getCall(0).args?.[1], 0o755)
        })

        it('should not modify command when Docker is disabled', async () => {
            set.config('docker.enabled', false)

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.command, 'latexmk')
        })

        it('should replace argument placeholders', async () => {
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['%DOC%', '%DOC%', '%DIR%'], env: {} }])
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.args?.[0], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(step.args?.[1], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(step.args?.[2], get.path(''))
        })

        it('should replace cwd placeholders', async () => {
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', cwd: '%DIR%/build', env: {} }])
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.cwd, path.resolve(path.dirname(rootFile), 'build'))
        })

        it('should keep absolute cwd paths unchanged', async () => {
            const absoluteCwd = path.resolve(get.path('absolute-build'))
            set.config('latex.build.fromFolder', 'build-root')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', cwd: absoluteCwd, env: {} }])
            const rootFile = set.root('tex', 'main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.cwd, absoluteCwd)
        })

        it('should resolve relative cwd values from the default working folder', async () => {
            set.config('latex.build.fromFolder', 'build-root')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', cwd: 'nested', env: {} }])
            const rootFile = set.root('tex', 'main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.cwd, path.resolve(get.path('build-root'), 'nested'))
        })

        it('should resolve relative cwd placeholders from the default working folder', async () => {
            set.config('latex.build.fromFolder', 'test/units')
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', cwd: '%RELATIVE_CWD_DIR%', env: {} }])
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.cwd, path.dirname(rootFile))
        })

        it('should set TeX directories correctly with single hyphen arguments', async () => {
            set.config('latex.outDir', '%DIR%')
            set.config('latex.auxDir', '%OUTDIR%')
            set.config('latex.tools', [
                {
                    name: 'latexmk',
                    command: 'latexmk',
                    args: ['-out-directory=out', '-aux-directory=aux'],
                    env: {},
                },
            ])
            const rootFile = set.root('main.tex')

            getAuxDirStub.restore()
            try {
                await build(rootFile, 'latex', async () => {})

                assert.pathStrictEqual(lw.file.getOutDir(rootFile), 'out')
                assert.pathStrictEqual(lw.file.getAuxDir(rootFile), 'aux')
            } finally {
                getAuxDirStub = sinon.stub(lw.file, 'getAuxDir').returns('.')
            }
        })

        it('should set TeX directories correctly with double hyphen arguments', async () => {
            set.config('latex.outDir', '%DIR%')
            set.config('latex.auxDir', '%OUTDIR%')
            set.config('latex.tools', [
                {
                    name: 'latexmk',
                    command: 'latexmk',
                    args: ['--out-directory=out', '--aux-directory=aux'],
                    env: {},
                },
            ])
            const rootFile = set.root('main.tex')

            getAuxDirStub.restore()
            try {
                await build(rootFile, 'latex', async () => {})

                assert.pathStrictEqual(lw.file.getOutDir(rootFile), 'out')
                assert.pathStrictEqual(lw.file.getAuxDir(rootFile), 'aux')
            } finally {
                getAuxDirStub = sinon.stub(lw.file, 'getAuxDir').returns('.')
            }
        })

        it('should process environment variables correctly', async () => {
            set.config('latex.tools', [
                {
                    name: 'latexmk',
                    command: 'latexmk',
                    args: [],
                    env: { DOC: '%DOC%' },
                },
            ])
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.env?.['DOC'], rootFile.replace('.tex', ''))
        })

        it('should append max print line arguments when enabled', async () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            syncStub.returns({ stdout: 'pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)' })
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))

            set.config('latex.tools', [{ name: 'latexmk', command: 'pdflatex' }])
            initialize()
            await build(rootFile, 'latex', async () => {})

            step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))

            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['--lualatex'] }])
            initialize()
            await build(rootFile, 'latex', async () => {})

            step = queue.getStep()
            assert.ok(step)
            assert.ok(!step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
        })

        it('should quote TeX options containing spaces for shell mode on MiKTeX', async () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.build.enableMagicComments', true)
            syncStub.returns({ stdout: 'pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)' })
            readStub.resolves('% !TEX program = latexmk\n% !TEX options = -output-directory="C:/Users/Test User/out"\n')
            const rootFile = set.root('main.tex')
            initialize()

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.[0].includes('"-output-directory="C:/Users/Test User/out""'), JSON.stringify(step.args))
        })

        it('should add --max-print-line to TeX options in shell mode on MiKTeX', async () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.build.enableMagicComments', true)
            syncStub.returns({ stdout: 'pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)' })
            readStub.resolves('% !TEX program = latexmk\n% !TEX options = -synctex=1\n')
            const rootFile = set.root('main.tex')
            initialize()

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.args?.[0], `--max-print-line=${lw.constant.MAX_PRINT_LINE} -synctex=1`, JSON.stringify(step.args))
        })

        it('should keep TeX options unquoted when they do not contain spaces in shell mode on MiKTeX', async () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            set.config('latex.build.enableMagicComments', true)
            syncStub.returns({ stdout: 'pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)' })
            readStub.resolves('% !TEX program = latexmk\n% !TEX options = -synctex=1\n')
            const rootFile = set.root('main.tex')
            initialize()

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.[0].endsWith(' -synctex=1'), JSON.stringify(step.args))
        })
    })

    describe('lw.compile->recipe.isMikTeX', () => {
        let syncStub: Sinon.SinonStub

        before(() => {
            syncStub = sinon.stub(lw.external, 'sync')
        })

        beforeEach(() => {
            set.config('latex.option.maxPrintLine.enabled', true)
            set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
        })

        afterEach(() => {
            syncStub.reset()
        })

        after(() => {
            syncStub.restore()
        })

        it('should not consider MikTeX logic when pdflatex command fails', async () => {
            syncStub.throws(new Error('Command failed'))
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(!step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
            assert.hasLog('Cannot run `pdflatex` to determine if we are using MiKTeX.')
        })

        it('should not execute compile program again to determine MikTeX if already executed and cached', async () => {
            const rootFile = set.root('main.tex')
            syncStub.returns({ stdout: 'pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)' })

            await build(rootFile, 'latex', async () => {})
            queue.clear()
            syncStub.resetHistory()
            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
            assert.strictEqual(syncStub.callCount, 0)
        })
    })
})
