import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    executeVscodeCommandAfterActivation,
    execCommandThenPick,
    getFixtureDir,
    isDockerEnabled,
    runTestWithFixture,
    waitLatexWorkshopActivated,
    waitRootFileFound
} from './utils'
import {sleep} from '../src/utils/utils'


suite('Buid TeX files test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
    })

    //
    // Basic build tests
    //
    runTestWithFixture('fixture001', 'basic build', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture002', 'build with subfiles', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture003', 'the same multiple placeholders in a recipe', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture004', 'automatically detect root', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture005', 'basic build with outDir', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, 'out', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture006', 'detect root with search.rootFiles.include', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture007', 'detect root with search.rootFiles.exclude', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture008', 'basic build with spaces in names', async () => {
        const fixtureDir = getFixtureDir()
        const subDir = 'root dir'
        const texFileName = path.join(subDir, 'file t.tex')
        const pdfFileName = path.join(subDir, 'file t.pdf')
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    //
    // Magic comment tests
    //
    runTestWithFixture('fixture020', 'build with magic comment', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture021', 'build with !TEX program and !TEX options', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture022', 'build with !TEX root', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'z.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture023', 'build with invalid !TEX program', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture024', 'build with forceRecipeUsage: true', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    //
    // Auto build tests
    //
    runTestWithFixture('fixture030', 'auto build', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(0, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture031', 'auto build with subfiles', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await waitRootFileFound()
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(2, 0), ' ')
            })
            await doc.save()
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture032', 'auto build with input', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await waitRootFileFound()
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture033', 'auto build main.tex when editing s.tex', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await waitRootFileFound()
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture034', 'auto build main.tex when editing a bib file', async () => {
        const fixtureDir = getFixtureDir()
        const bibFileName = 'b.bib'
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await waitLatexWorkshopActivated()
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const bibFilePath = vscode.Uri.file(path.join(fixtureDir, bibFileName))
            const bibDoc = await vscode.workspace.openTextDocument(bibFilePath)
            const editor = await vscode.window.showTextDocument(bibDoc)
            await sleep(1000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await bibDoc.save()
        })
    })

    runTestWithFixture('fixture035', 'auto build with \\input whose path uses a macro', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main', 'main.tex'))
        const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
        await vscode.window.showTextDocument(mainDoc)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(1000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture036', 'auto build main.tex when main.tex not in root dir and editing a sub file', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main', 'main.tex'))
        const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
        await vscode.window.showTextDocument(mainDoc)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(1000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture037', 'auto build with \\input and outDir', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', 'out', pdfFileName)
        const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main', 'main.tex'))
        const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
        await vscode.window.showTextDocument(mainDoc)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(1000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture038', 'auto build with watch.files.ignore', async () => {
        const fixtureDir = getFixtureDir()
        const mainTexFileName = 'main.tex'
        const subTexFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, mainTexFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        fs.unlinkSync(pdfFilePath)
        const subTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', subTexFileName))
        const subDoc = await vscode.workspace.openTextDocument(subTexFilePath)
        const editor = await vscode.window.showTextDocument(subDoc)
        await sleep(1000)
        await editor.edit((builder) => {
            builder.insert(new vscode.Position(1, 0), ' ')
        })
        await subDoc.save()
        await sleep(5000)
        assert.ok( !fs.existsSync(pdfFilePath) )
    })

    //
    // Multi-file project build tests
    //
    runTestWithFixture('fixture050', 'build a subfile with the subfiles package', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture051', 'build a root file with the subfiles package', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture052', 'build a root file in a sub directory', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'mainsub.tex'
        const pdfFileName = 'mainsub.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture053', 'build a subfile when main.tex opened', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main.tex'))
            const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
            await vscode.window.showTextDocument(mainDoc)
            const subTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(subTexFilePath)
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture054', 'build a subfile with .latexmkrc', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture055', 'build a subfile in the same directory as main.tex', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture056', 'build main.tex with input whose path uses a macro when subfile opened', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main', 'main.tex'))
        const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
        await vscode.window.showTextDocument(mainDoc)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture057', 'build main.tex with subfiles whose path uses a macro when subfile opened', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main', 'main.tex'))
        const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
        await vscode.window.showTextDocument(mainDoc)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture058', 'build main.tex when main.tex not in root dir and subfile opened', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, 'main', pdfFileName)
        const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main', 'main.tex'))
        const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
        await vscode.window.showTextDocument(mainDoc)
        await waitLatexWorkshopActivated()
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture059', 'build main.tex choosing it in QuickPick', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            execCommandThenPick(
                () => vscode.commands.executeCommand('latex-workshop.build'),
                async () => await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            )
        })
    })

    runTestWithFixture('fixture05a', 'build s.tex choosing it in QuickPick', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            execCommandThenPick(
                () => vscode.commands.executeCommand('latex-workshop.build'),
                async () => {
                    await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
                    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
                }
            )
        })
    }, () => isDockerEnabled())

})
