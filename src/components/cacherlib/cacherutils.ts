import vscode from 'vscode'
import path from 'path'
import os from 'os'
import micromatch from 'micromatch'
import { isTeX } from '../manager'

export class CacherUtils {
    static canCache(filePath: string) {
        return isTeX(path.extname(filePath)) && !filePath.includes('expl3-code.tex')
    }

    static isExcluded(filePath: string): boolean {
        const globsToIgnore = vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.files.ignore') as string[]
        const format = (str: string): string => {
            if (os.platform() === 'win32') {
                return str.replace(/\\/g, '/')
            }
            return str
        }
        return micromatch.some(filePath, globsToIgnore, { format })
    }

    static parseFlsContent(content: string, rootDir: string): {input: string[], output: string[]} {
        const inputFiles: Set<string> = new Set()
        const outputFiles: Set<string> = new Set()
        const regex = /^(?:(INPUT)\s*(.*))|(?:(OUTPUT)\s*(.*))$/gm
        // regex groups
        // #1: an INPUT entry --> #2 input file path
        // #3: an OUTPUT entry --> #4: output file path
        while (true) {
            const result = regex.exec(content)
            if (!result) {
                break
            }
            if (result[1]) {
                const inputFilePath = path.resolve(rootDir, result[2])
                if (inputFilePath) {
                    inputFiles.add(inputFilePath)
                }
            } else if (result[3]) {
                const outputFilePath = path.resolve(rootDir, result[4])
                if (outputFilePath) {
                    outputFiles.add(outputFilePath)
                }
            }
        }

        return {input: Array.from(inputFiles), output: Array.from(outputFiles)}
    }
}
