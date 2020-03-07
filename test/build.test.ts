import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'

function getFixtureDir() {
    const fixtureDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    if (fixtureDir) {
        return fixtureDir
    } else {
        assert.fail('fixtureDir is undefined.')
    }
}

function runTestWithFixture(
    fixtureName: string,
    label: string,
    cb: () => Promise<void>,
    skip?: () => boolean
) {
    const rootPath = vscode.workspace.workspaceFolders?.[0]
    const shouldSkip = skip && skip()
    if (rootPath && path.basename(rootPath.uri.fsPath) === fixtureName && !shouldSkip) {
        test(label, cb)
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function printLogMessages() {
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(1000)
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(1000)
    const logMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(logMessage)
    await vscode.commands.executeCommand('latex-workshop.log', true)
    await sleep(1000)
    const compilerLogMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(compilerLogMessage)
}

async function assertPdfIsGenerated(pdfFilePath: string, cb: () => Promise<void>) {
    if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath)
    }
    await cb()
    for (let i = 0; i < 150; i++) {
        if (fs.existsSync(pdfFilePath)) {
            assert.ok(true, 'PDF file generated.')
            return
        }
        await sleep(100)
    }
    await printLogMessages()
    assert.fail('Timeout Error: PDF file not generated.')
}

function isDockerEnabled() {
    return process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER'] ? true : false
}

suite('Buid TeX files test suite', () => {

    suiteSetup(() => {
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            const dockerConfig = vscode.workspace.getConfiguration()
            dockerConfig.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
    })

    //
    // Basic build tests
    //
    runTestWithFixture('fixture001', 'fixture001: basic build', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture002', 'fixture002: build with subfiles', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture003', 'fixture003: the same multiple placeholders in a recipe', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture004', 'fixture004: automatically detect root', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    //
    // Magic comment tests
    //
    runTestWithFixture('fixture020', 'fixture020: build with magic comment', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture021', 'fixture021: build with !TEX program and !TEX options', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture022', 'fixture022: build with !TEX root', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'z.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture023', 'fixture023: build with invalid !TEX program', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    //
    // Auto build tests
    //
    runTestWithFixture('fixture030', 'fixture030: auto build', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(0, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture031', 'fixture031: auto build with subfiles', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(5000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(2, 0), ' ')
            })
            await doc.save()
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture032', 'fixture032: auto build with input', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(5000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture033', 'fixture033: auto build main.tex when editing s.tex', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(5000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture034', 'fixture034: auto build main.tex when editing a bib file', async () => {
        const fixtureDir = getFixtureDir()
        const bibFileName = 'b.bib'
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await sleep(1000)
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

    //
    // Multi-file project build tests
    //
    runTestWithFixture('fixture050', 'fixture050: build a subfile with the subfiles package', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture051', 'fixture051: build a root file with the subfiles package', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture052', 'fixture052: build a root file in a sub directory', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'mainsub.tex'
        const pdfFileName = 'mainsub.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture053', 'fixture053: build a subfile when main.tex opened', async () => {
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
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture054', 'fixture054: build a subfile with .latexmkrc', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    }, () => isDockerEnabled())

})
