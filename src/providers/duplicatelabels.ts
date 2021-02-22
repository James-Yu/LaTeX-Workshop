import * as vscode from 'vscode'
import * as path from 'path'

import type {Extension} from '../main'

type LabelEntries = {
    [key: string]: {
        file: string,
        range: vscode.Range
    }[]
}

export class DuplicateLabels {
    private readonly extension: Extension
    private readonly duplicatedLabelsDiagnostics = vscode.languages.createDiagnosticCollection('Duplicate Labels')
    private labelEntries: LabelEntries = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    /**
     * Compute the dictionary of labels holding their file and position
     */
    private parseFileLabels(file: string) {
        if (! (file in this.extension.manager.cachedContent)) {
            this.extension.logger.addLogMessage(`Cannot check for duplicate labels in a file not in manager: ${file}.`)
            return
        }
        const cachedRefs = this.extension.manager.cachedContent[file].element.reference
        if (cachedRefs === undefined) {
            return
        }
        cachedRefs.forEach(ref => {
            if (ref.range === undefined) {
                return
            }
            if (! (ref.label in this.labelEntries)) {
                this.labelEntries[ref.label] = []
            }
            this.labelEntries[ref.label].push({
                file,
                range: ref.range instanceof vscode.Range ? ref.range : ref.range.inserting
            })
        })
    }

    private deleteOldLabels(file: string) {
        Object.keys(this.labelEntries).forEach(label => {
            this.labelEntries[label] = this.labelEntries[label].filter(entry => {
                return entry.file !== file
            })
        })
    }

    /**
     * Only update the previous diagnostic based on the content of `file`
     */
    run(file: string) {
        this.extension.logger.addLogMessage(`Checking for duplicate labels: ${file}.`)
        this.deleteOldLabels(file)
        this.parseFileLabels(file)
        this.showDiagnostics()
    }

    private showDiagnostics() {
        this.duplicatedLabelsDiagnostics.clear()
        const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}

        for (const label in this.labelEntries) {
            if (this.labelEntries[label].length < 2) {
                continue
            }
            for (const occur of this.labelEntries[label]) {
                if (!(occur.file in diagsCollection)) {
                    diagsCollection[occur.file] = []
                }
                const diag = new vscode.Diagnostic(occur.range, `Duplicate label ${label}`, vscode.DiagnosticSeverity.Warning)
                diag.source = 'DuplicateLabels'
                diagsCollection[occur.file].push(diag)
            }
        }

        for (const file in diagsCollection) {
            if (path.extname(file) === '.tex') {
                this.duplicatedLabelsDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
            }
        }
    }

    reset() {
        this.labelEntries = {}
        this.duplicatedLabelsDiagnostics.clear()
    }
}
