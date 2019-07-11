import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as child_process from 'child_process'
import { tmpdir } from 'os'
import { promisify } from 'util'

import { Extension } from '../main'

const mkdtemp = promisify(fs.mkdtemp)
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const removeDir = promisify(fse.remove)

interface IFileTikzCollection {
    location: string
    tempDir: string
    tikzPictures: IFileTikzPicture[]
    preamble: string
    lastChange: number
}

interface IFileTikzPicture {
    range: vscode.Range
    content: string[]
    tempFile: string
    lastChange: number
}

export class TikzPictureView {
    extension: Extension
    tikzCollections: { [filePath: string]: IFileTikzCollection } = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    public async view(document: vscode.TextDocument, range: vscode.Range) {
        const fileTikzCollection = await this.getFileTikzCollection(document)

        const tikzPicture = await this.getTikzEntry(fileTikzCollection, {
            range,
            content: document.getText(range).split('\n')
        })

        const generatedPreamble = await this.generatePreamble(fileTikzCollection)
        if (fileTikzCollection.preamble !== generatedPreamble) {
            fileTikzCollection.preamble = generatedPreamble
            await this.precompilePreamble(
                path.join(fileTikzCollection.tempDir, 'preamble.tex'),
                fileTikzCollection.preamble
            )
        }

        this.updateTikzPicture(tikzPicture)
    }

    public async onFileChange(
        document: vscode.TextDocument,
        changes: vscode.TextDocumentContentChangeEvent[],
        waitedDelay?: boolean
    ) {
        const changeDelay = vscode.workspace.getConfiguration('latex-workshop.tikzpreview').get('delay') as number
        if (changeDelay === 0 || this.tikzCollections[document.uri.fsPath] === undefined) {
            return
        } else if (+new Date() - this.tikzCollections[document.uri.fsPath].lastChange < changeDelay) {
            if (!waitedDelay) {
                this.tikzCollections[document.uri.fsPath].lastChange = +new Date()
                setTimeout(() => {
                    this.onFileChange(document, changes, true)
                }, changeDelay)
            }
            return
        }

        const tikzPictures: IFileTikzPicture[] = this.tikzCollections[document.uri.fsPath].tikzPictures

        for (const change of changes) {
            for (const tikzPicture of tikzPictures) {
                const lineDelta =
                    change.text.split('\n').length - 1 - (change.range.end.line - change.range.start.line)
                if (tikzPicture.range.end.isBefore(change.range.start)) {
                    // change after tikzpicture
                    continue
                } else if (tikzPicture.range.start.isAfter(change.range.end)) {
                    // change before tikzpicture
                    tikzPicture.range = new vscode.Range(
                        tikzPicture.range.start.translate(lineDelta, 0),
                        tikzPicture.range.end.translate(lineDelta, 0)
                    )
                } else if (
                    change.range.end.isAfter(tikzPicture.range.start) &&
                    change.range.end.line - lineDelta < tikzPicture.range.start.line
                ) {
                    // tikzpicture removed
                    tikzPictures.splice(tikzPictures.indexOf(tikzPicture), 1)
                } else {
                    // tikzpicture modified
                    tikzPicture.range = new vscode.Range(
                        tikzPicture.range.start,
                        tikzPicture.range.end.translate(lineDelta, 0)
                    )
                    tikzPicture.content = document.getText(tikzPicture.range).split('\n')
                    this.updateTikzPicture(tikzPicture)
                }
            }
        }
    }

    public async updateTikzPicture(tikzPicture: IFileTikzPicture) {
        // await writeFile(
        //     tikzPicture.tempFile,
        //     `%&preamble\n\\begin{document}\n${tikzPicture.content.join('\n')}\n\\end{document}`
        // ).catch(() => {
        //     throw new Error('unable to write tikzpicture to tempfile')
        // })

        fs.writeFileSync(
            tikzPicture.tempFile,
            `%&preamble\n\\begin{document}\n${tikzPicture.content.join('\n')}\n\\end{document}`
        )

        const startTime = +new Date()

        child_process.execSync(`latexmk ${path.basename(tikzPicture.tempFile)} -pdf`, {
            cwd: path.dirname(tikzPicture.tempFile)
        })

        console.log(`took ${+new Date() - startTime}ms to recompile tikzpicture`)

        if (
            this.extension.viewer.clients[tikzPicture.tempFile.replace(/\.tex$/, '.pdf').toLocaleUpperCase()] !==
            undefined
        ) {
            this.extension.viewer.refreshExistingViewer(tikzPicture.tempFile)
        } else {
            this.extension.viewer.openTab(tikzPicture.tempFile, false, true)
        }
    }

    public async cleanupTempFiles() {
        const rmPromises: Promise<unknown>[] = []
        for (const tikzCollection in this.tikzCollections) {
            rmPromises.push(removeDir(this.tikzCollections[tikzCollection].tempDir))
        }
        await Promise.all(rmPromises)
    }

    private async getFileTikzCollection(document: vscode.TextDocument) : Promise<IFileTikzCollection> {
        if (!(document.uri.fsPath in this.tikzCollections)) {
            if (!fs.existsSync(path.join(tmpdir(), 'vscode-latexworkshop'))) {
                await mkdir(path.join(tmpdir(), 'vscode-latexworkshop'))
            }

            const tempDir: string = await mkdtemp(
                path.join(
                    tmpdir(),
                    'vscode-latexworkshop',
                    `tikzpreview-${path.basename(document.uri.fsPath, '.tex')}-`
                )
            )

            const thisFileTikzCollection: IFileTikzCollection = {
                location: document.uri.fsPath,
                tempDir,
                tikzPictures: [],
                preamble: '',
                lastChange: +new Date()
            }

            this.tikzCollections[document.uri.fsPath] = thisFileTikzCollection
        }

        return this.tikzCollections[document.uri.fsPath]
    }

    private async getTikzEntry(
        tikzCollection: IFileTikzCollection,
        tikzPictureContent: {
            range: vscode.Range;
            content: string[];
        }
    ) : Promise<IFileTikzPicture> {
        for (const tikzPicture of tikzCollection.tikzPictures) {
            if (tikzPicture.range.isEqual(tikzPictureContent.range)) {
                return tikzPicture
            }
        }

        const tempFile: string = path.join(tikzCollection.tempDir, `tikzpicture-${+new Date() % 100000000}.tex`)

        tikzCollection.tikzPictures.push({
            range: tikzPictureContent.range,
            content: tikzPictureContent.content,
            tempFile,
            lastChange: +new Date()
        })

        return tikzCollection.tikzPictures[tikzCollection.tikzPictures.length - 1]
    }

    private async generatePreamble(fileTikzCollection: IFileTikzCollection) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop.tikzpreview')
        let commandsString = ''
        const newCommandFile = configuration.get('preambleContents') as string
        if (newCommandFile !== '') {
            if (path.isAbsolute(newCommandFile)) {
                if (fs.existsSync(newCommandFile)) {
                    commandsString = await readFile(newCommandFile, { encoding: 'utf8' })
                }
            } else {
                if (this.extension.manager.rootFile === undefined) {
                    await this.extension.manager.findRoot()
                }
                const rootDir = this.extension.manager.rootDir
                const newCommandFileAbs = path.join(rootDir, newCommandFile)
                if (fs.existsSync(newCommandFileAbs)) {
                    commandsString = await readFile(newCommandFileAbs, { encoding: 'utf8' })
                }
            }
        }
        commandsString = commandsString.replace(/^\s*$/gm, '')
        if (!configuration.get('parseTeXFile') as boolean) {
            return commandsString
        }
        const regex = /(\\tikzset{(?:(?:[^\{\}]|{[^\{\}]+})*)}|\\usetikzlibrary{[\w\.]+})/gm
        const commands: string[] = []

        const content = await readFile(fileTikzCollection.location, { encoding: 'utf8' })
        const noCommentContent = content.replace(/([^\\]|^)%.*$/gm, '$1') // Strip comments

        let result: RegExpExecArray | null
        do {
            result = regex.exec(noCommentContent)
            if (result) {
                commands.push(result[1])
            }
        } while (result)
        let preamble = commandsString + '\n' + commands.join('\n')
        preamble = preamble.includes('\\usepackage{tikz}') ? preamble : '\n\\usepackage{tikz}\n' + preamble
        return preamble
    }

    private precompilePreamble(file: string, preamble: string) {
        return new Promise((resolve, reject) => {
            writeFile(file, `\\documentclass{standalone}\n\n${preamble}\n\n\\begin{document}\\end{document}`)
                .then(() => {
                    const process = child_process.spawn(
                        'pdftex',
                        [
                            '-ini',
                            '-interaction=nonstopmode',
                            '-shell-escape',
                            '-file-line-error',
                            '-jobname="preamble"',
                            '"&pdflatex"',
                            'mylatexformat.ltx',
                            `"${file}"`
                        ],
                        { cwd: path.dirname(file) }
                    )
                    process.on('exit', code => {
                        resolve(code)
                    })
                    process.on('error', err => {
                        reject(err)
                    })
                })
                .catch(err => {
                    reject(err)
                })
        })
    }
}
