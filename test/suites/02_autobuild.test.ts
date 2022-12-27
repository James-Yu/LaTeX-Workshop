import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'

import type { Extension, activate } from '../../src/main'
import { assertBuild, runTest, sleep } from './utils'

suite('Auto-build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.watch.files.ignore', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_001.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_001.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_001.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onFileChange 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onFileChange 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['sub_002/*.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with import and onFileChange'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_003.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'sub_003/lmn/uvw/two.tex', pdfFileName: 'main_003.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_003/lmn/uvw/two.tex', pdfFileName: 'main_003.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with input'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_004/*.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_004/main.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_004/main.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build when editing bib'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_010.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'bib_010.bib', pdfFileName: 'main_010.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 0), ' ')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'bib_010.bib', pdfFileName: 'main_010.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with \\input whose path uses a macro'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_011.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'main_011.tex', pdfFileName: 'main_011.pdf', extension})
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_011.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_011.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build when main.tex not in root dir and editing a sub file'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_012/main.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'main_012/main.tex', pdfFileName: 'main_012/main.pdf', extension})
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_012/main.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_012/main.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with \\input and outDir'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_013/main.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'main_013/main.tex', pdfFileName: 'main_013/out/main.pdf', extension})
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_013/out/main.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_013/out/main.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with watch.files.ignore'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.watch.files.ignore', ['**/s.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'main_011.tex', pdfFileName: 'main_011.pdf', extension})
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: '', extension, edits: (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }, nobuild: true})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: '', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }, nobuild: true})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onSave 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onSave 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension, edits: (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        }})
        await sleep(500)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension, edits: (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        }})
    })

})
