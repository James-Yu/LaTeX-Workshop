import * as vscode from 'vscode'
import * as path from 'path'
import { extension } from '../extension'

const duplicatedLabelsDiagnostics = vscode.languages.createDiagnosticCollection('Duplicate Labels')

export const dupLabelDetector = {
    run,
    reset
}

/**
 * Compute the dictionary of labels
 */
function computeDuplicates(): string[] {
    const labelsCount = new Map<string, number>()
    extension.cache.getIncludedTeX().forEach(filePath => {
        const refCache = extension.cache.get(filePath)?.elements.reference
        if (refCache === undefined) {
            return
        }
        refCache.forEach(ref => {
            if (ref.range === undefined) {
                return
            }
            let count = labelsCount.get(ref.label)
            if (count === undefined) {
                count = 0
            }
            count += 1
            labelsCount.set(ref.label, count)
        })
    })
    const duplicates = []
    for (const [label, count] of labelsCount) {
        if (count > 1) {
            duplicates.push(label)
        }
    }
    return duplicates
}

function run() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.get('check.duplicatedLabels.enabled')) {
        return
    }
    const duplicates = computeDuplicates()
    showDiagnostics(duplicates)
}

function showDiagnostics(duplicates: string[]) {
    duplicatedLabelsDiagnostics.clear()
    if (duplicates.length === 0) {
        return
    }
    const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }

    extension.cache.getIncludedTeX().forEach(filePath => {
        const refCache = extension.cache.get(filePath)?.elements.reference
        if (refCache === undefined) {
            return
        }
        refCache.forEach(ref => {
            if (ref.range === undefined) {
                return
            }
            if (duplicates.includes(ref.label)) {
                if (! (filePath in diagsCollection)) {
                    diagsCollection[filePath] = []
                }
                const range = ref.range instanceof vscode.Range ? ref.range : ref.range.inserting
                const diag = new vscode.Diagnostic(range, `Duplicate label ${ref.label}`, vscode.DiagnosticSeverity.Warning)
                diag.source = 'DuplicateLabels'
                diagsCollection[filePath].push(diag)
            }
        })
    })

    for (const file in diagsCollection) {
        if (path.extname(file) === '.tex') {
            duplicatedLabelsDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
        }
    }
}

function reset() {
    duplicatedLabelsDiagnostics.clear()
}
