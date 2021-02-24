import * as vscode from 'vscode'
import * as path from 'path'

import type {Extension} from '../main'

type LabelEntries = Map<string, {file: string, range: vscode.Range}[]>

export class DuplicateLabels {
    private readonly extension: Extension
    private readonly duplicatedLabelsDiagnostics = vscode.languages.createDiagnosticCollection('Duplicate Labels')
    private readonly labelEntries: LabelEntries = new Map()

    constructor(extension: Extension) {
        this.extension = extension
        this.extension.manager.onDidUpdateIntellisense((file: string) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if (configuration.get('check.duplicatedLabels.enabled')) {
                this.run(file)
            }
        })
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
            let locations = this.labelEntries.get(ref.label)
            if (locations === undefined) {
                locations = []
                this.labelEntries.set(ref.label, locations)
            }
            locations.push({
                file,
                range: ref.range instanceof vscode.Range ? ref.range : ref.range.inserting
            })
        })
    }

    /**
     * Delete all labels
     *  - that were attached to file
     *  - that are attached to a file not in getTeXChildren()
     */
    private deleteOldLabels(file: string) {
        const allFiles = this.extension.manager.getIncludedTeX()
        for (const label of this.labelEntries.keys()) {
            const locations = this.labelEntries.get(label)
            if (locations !== undefined) {
                const newLocations = locations.filter(entry => {
                    return (entry.file !== file) && allFiles.includes(entry.file)
                })
                if (newLocations.length === 0) {
                    this.labelEntries.delete(label)
                } else {
                    this.labelEntries.set(label, newLocations)
                }
            }
        }
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

        for (const [label, locations] of this.labelEntries.entries()) {
            if (locations.length < 2) {
                continue
            }
            for (const loc of locations) {
                if (!(loc.file in diagsCollection)) {
                    diagsCollection[loc.file] = []
                }
                const diag = new vscode.Diagnostic(loc.range, `Duplicate label ${label}`, vscode.DiagnosticSeverity.Warning)
                diag.source = 'DuplicateLabels'
                diagsCollection[loc.file].push(diag)
            }
        }

        for (const file in diagsCollection) {
            if (path.extname(file) === '.tex') {
                this.duplicatedLabelsDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
            }
        }
    }

    reset() {
        this.labelEntries.clear()
        this.duplicatedLabelsDiagnostics.clear()
    }
}
