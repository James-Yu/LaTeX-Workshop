import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { assert, get, mock, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ': multiroot', () => {
    const projectA = get.workspace('project_A')!
    const projectB = get.workspace('project_B')!
    const inProject = (project: vscode.WorkspaceFolder, ...parts: string[]) => path.resolve(project.uri.fsPath, ...parts)

    before(() => {
        sinon.stub(lw.outline, 'refresh')
        sinon.stub(lw.completion.input, 'reset')
        sinon.stub(lw.lint.label, 'reset')
        sinon.stub(lw.cache, 'reset')
        sinon.stub(lw.cache, 'add')
        sinon.stub(lw.cache, 'refreshCache').resolves()
        sinon.stub(lw.cache, 'loadFlsFile').resolves()
        sinon.stub(lw.cache, 'getFlsChildren').resolves([])
        sinon.stub(lw.cache, 'getIncludedTeX').returns(new Set())
    })

    after(() => {
        sinon.restore()
    })

    async function findFrom(file: string, content: string) {
        const editor = mock.activeTextEditor(file, content)
        await lw.root.find()
        editor.restore()
    }

    it('should search with the active folder include pattern', async () => {
        await set.codeConfig('latex.search.rootFiles.include', ['root/alt/*.tex'], projectA)

        await findFrom(inProject(projectA, 'root/sub/s.tex'), 'subfile')

        assert.pathStrictEqual(lw.root.file.path, inProject(projectA, 'root/alt/main.tex'))
    })

    it('should search with the active folder exclude pattern', async () => {
        await set.codeConfig('latex.search.rootFiles.include', ['root/**/*.tex'], projectA)
        await set.codeConfig('latex.search.rootFiles.exclude', ['root/*.tex'], projectA)

        await findFrom(inProject(projectA, 'root/sub/s.tex'), 'subfile')

        assert.pathStrictEqual(lw.root.file.path, inProject(projectA, 'root/alt/main.tex'))
    })

    it('should switch roots with the active workspace folder', async () => {
        const rootA = inProject(projectA, 'switch/main.tex')
        const rootB = inProject(projectB, 'switch/main.tex')

        await findFrom(rootA, '\\documentclass{article}')
        assert.pathStrictEqual(lw.root.file.path, rootA)

        await findFrom(rootB, '\\documentclass{article}')
        assert.pathStrictEqual(lw.root.file.path, rootB)

        await findFrom(rootA, '\\documentclass{article}')
        assert.pathStrictEqual(lw.root.file.path, rootA)
    })
})
