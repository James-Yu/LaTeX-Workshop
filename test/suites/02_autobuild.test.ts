import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as assert from 'assert'
import glob from 'glob'

import { Extension, activate } from '../../src/main'
import { runTest, sleep } from './utils'

suite('Auto-build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    async function assertBuild(fixture: string, texFileName: string, pdfFileName: string,
                               edits?: (cb: vscode.TextEditorEdit) => unknown,
                               haspdf = true) {
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const pdfFilePath = path.join(fixture, pdfFileName)
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const editor = await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        if (edits) {
            await sleep(500)
            await editor.edit(edits)
            await sleep(500)
            await doc.save()
            if (haspdf) {
                await new Promise<void>((resolve, _) => {
                    const disposable = extension?.eventBus.on('buildfinished', () => {
                        resolve()
                        disposable?.dispose()
                    })
                })
            } else {
                await sleep(3000)
            }
        } else {
            await vscode.commands.executeCommand('latex-workshop.build')
        }
        for (const ext of ['aux', 'fdb_latexmk', 'fls', 'log', 'synctex.gz']) {
            const files = glob.sync(`**/**.${ext}`, { cwd: fixture })
            files.forEach(file => {
                if (!fs.existsSync(path.resolve(fixture, file))) {
                    return
                }
                fs.unlinkSync(path.resolve(fixture, file))
            })
        }
        const pdfs = glob.sync('**/**.pdf', { cwd: fixture })
        pdfs.forEach(file => {
            if (!fs.existsSync(path.resolve(fixture, file))) {
                return
            }
            fs.unlinkSync(path.resolve(fixture, file))
        })
        assert.strictEqual(pdfs.map(file => path.resolve(fixture, file)).join(','), pdfFileName === '' ? pdfFileName : pdfFilePath)
    }

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
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.watch.files.ignore', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_001.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'main_001.tex', 'main_001.pdf', (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'main_001.tex', 'main_001.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onFileChange 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'main_002.pdf', (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'main_002.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onFileChange 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['sub_002/*.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'sub_002/sub_002.pdf', (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'sub_002/sub_002.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with import and onFileChange'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_003.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'sub_003/lmn/uvw/two.tex', 'main_003.pdf', (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_003/lmn/uvw/two.tex', 'main_003.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with input'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_004/*.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'sub_004/s.tex', 'main_004/main.pdf', (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_004/s.tex', 'main_004/main.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build when editing bib'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_010.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'bib_010.bib', 'main_010.pdf', (builder) => {
            builder.insert(new vscode.Position(0, 0), ' ')
        })
        await sleep(500)
        await assertBuild(fixture, 'bib_010.bib', 'main_010.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with \\input whose path uses a macro'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_011.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'main_011.tex', 'main_011.pdf')
        await assertBuild(fixture, 'sub_004/s.tex', 'main_011.pdf', (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_004/s.tex', 'main_011.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build when main.tex not in root dir and editing a sub file'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_012/main.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'main_012/main.tex', 'main_012/main.pdf')
        await assertBuild(fixture, 'sub_004/s.tex', 'main_012/main.pdf', (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_004/s.tex', 'main_012/main.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with \\input and outDir'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_013/main.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'main_013/main.tex', 'main_013/out/main.pdf')
        await assertBuild(fixture, 'sub_004/s.tex', 'main_013/out/main.pdf', (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_004/s.tex', 'main_013/out/main.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with watch.files.ignore'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onFileChange')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.watch.files.ignore', ['**/s.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'main_011.tex', 'main_011.pdf')
        await assertBuild(fixture, 'sub_004/s.tex', '', (builder) => {
            builder.insert(new vscode.Position(0, 3), 'z')
        }, false)
        await sleep(500)
        await assertBuild(fixture, 'sub_004/s.tex', '', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)))
        }, false)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onSave 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'main_002.pdf', (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'main_002.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto build with subfiles and onSave 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.commands.executeCommand('latex-workshop.activate')
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'sub_002/sub_002.pdf', (builder) => {
            builder.insert(new vscode.Position(2, 3), 'z')
        })
        await sleep(500)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'sub_002/sub_002.pdf', (builder) => {
            builder.delete(new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)))
        })
    })

})
