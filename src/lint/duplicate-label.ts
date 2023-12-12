import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../lw'

const duplicatedLabelsDiagnostics = vscode.languages.createDiagnosticCollection('Duplicate Labels')

export const dupLabelDetector = {
    check,
    reset
}

/**
 * Compute the dictionary of labels
 */
function computeDuplicates(): string[] {
    const labelsCount = new Map<string, number>()
    lw.cache.getIncludedTeX().forEach(cachedFile => {
        const cachedRefs = lw.cache.get(cachedFile)?.elements.reference
        if (cachedRefs === undefined) {
            return
        }
        cachedRefs.forEach(ref => {
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

function check() {
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

    lw.cache.getIncludedTeX().forEach(cachedFile => {
        const cachedRefs = lw.cache.get(cachedFile)?.elements.reference
        if (cachedRefs === undefined) {
            return
        }
        cachedRefs.forEach(ref => {
            if (ref.range === undefined) {
                return
            }
            if (duplicates.includes(ref.label)) {
                if (! (cachedFile in diagsCollection)) {
                    diagsCollection[cachedFile] = []
                }
                const range = ref.range instanceof vscode.Range ? ref.range : ref.range.inserting
                const diag = new vscode.Diagnostic(range, `Duplicate label ${ref.label}`, vscode.DiagnosticSeverity.Warning)
                diag.source = 'DuplicateLabels'
                diagsCollection[cachedFile].push(diag)
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
