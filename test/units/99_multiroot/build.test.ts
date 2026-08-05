import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { autoBuild } from '../../../src/compile/build'
import { build, initialize } from '../../../src/compile/recipe'
import * as recipe from '../../../src/compile/recipe'
import { Events } from '../../../src/core/event'
import { queue } from '../../../src/compile/queue'
import { assert, get, mock, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ': multiroot', () => {
    const projectA = get.workspace('project_A')!
    const projectB = get.workspace('project_B')!
    const root = path.resolve(projectA.uri.fsPath, 'build/main.tex')
    const tools = [
        { name: 'latexmk', command: 'latexmk' },
        { name: 'fake', command: 'fake' }
    ]
    const recipes = [
        { name: 'latexmk', tools: ['latexmk'] },
        { name: 'fake', tools: ['fake'] }
    ]

    before(() => {
        sinon.stub(vscode.workspace, 'saveAll').resolves(true)
        sinon.stub(lw.cache, 'getIncludedTeX').returns(new Set())
    })

    beforeEach(() => {
        initialize()
    })

    afterEach(() => {
        queue.clear()
        lw.compile.lastAutoBuildTime = 0
        lw.compile.compiledPDFPath = ''
    })

    after(() => {
        sinon.restore()
    })

    async function configureBuild() {
        await set.codeConfig('latex.tools', tools)
        await set.codeConfig('latex.recipes', recipes)
    }

    it('should use the root folder default recipe', async () => {
        await configureBuild()
        await set.codeConfig('latex.recipe.default', 'fake')
        await set.codeConfig('latex.recipe.default', 'latexmk', projectA)

        await build(root, 'latex', async () => {})

        assert.strictEqual(queue.getStep()?.name, 'latexmk')
    })

    it('should fall back within the root folder recipes if last-used is unavailable', async () => {
        await set.codeConfig('latex.tools', tools)
        await set.codeConfig('latex.recipes', [])
        await set.codeConfig('latex.recipe.default', 'fake')
        await set.codeConfig('latex.recipes', recipes, projectA)
        await set.codeConfig('latex.recipe.default', 'lastUsed', projectA)

        await build(root, 'latex', async () => {})

        assert.strictEqual(queue.getStep()?.name, 'latexmk')
    })

    it('should resolve outDir from the TeX file workspace folder', async () => {
        const rootB = path.resolve(projectB.uri.fsPath, 'switch/main.tex')
        await set.codeConfig('latex.outDir', './out', projectA)

        assert.strictEqual(lw.file.getOutDir(root), 'out')
        assert.pathStrictEqual(lw.file.getOutDir(rootB), path.dirname(rootB))
    })

    it('should ignore magic comments disabled in the root folder', async () => {
        await configureBuild()
        await set.codeConfig('latex.build.enableMagicComments', true)
        await set.codeConfig('latex.build.enableMagicComments', false, projectA)

        await build(path.resolve(projectA.uri.fsPath, 'build/magic.tex'), 'latex', async () => {})

        assert.strictEqual(queue.getStep()?.command, 'latexmk')
    })

    it('should auto-build the root for a saved subfile when disabled in its folder', async () => {
        const subfile = path.resolve(projectA.uri.fsPath, 'root/sub/s.tex')
        await set.codeConfig('latex.autoBuild.run', 'onFileChange')
        await set.codeConfig('latex.autoBuild.run', 'onSave', projectA)
        await set.codeConfig('latex.rootFile.useSubFile', true)
        await set.codeConfig('latex.rootFile.useSubFile', false, projectA)
        lw.root.file.path = root
        lw.root.file.langId = 'latex'
        lw.root.subfiles.path = subfile
        lw.root.subfiles.langId = 'latex'
        const editor = mock.activeTextEditor(subfile, 'subfile')
        const buildRecipe = sinon.stub(recipe, 'build').resolves()
        const fire = sinon.spy(lw.event, 'fire')

        await autoBuild(subfile, 'onSave')
        const eventArgs = fire.firstCall.args
        const builtRoot = buildRecipe.firstCall.args[0]
        editor.restore()
        buildRecipe.restore()
        fire.restore()

        assert.deepStrictEqual(eventArgs, [Events.AutoBuildInitiated, { type: 'onSave', file: subfile }])
        assert.pathStrictEqual(builtRoot, root)
    })
})
