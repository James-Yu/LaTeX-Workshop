'use strict'

import * as vscode from 'vscode'

import {Extension} from './main'

export class Commander {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    build() {
        this.extension.logger.addLogMessage(`BUILD command invoked.`)
        let rootFile = this.extension.manager.findRoot()
        if (rootFile !== undefined) {
            this.extension.logger.addLogMessage(`Building root file: ${rootFile}`)
            this.extension.builder.build(this.extension.manager.rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root file.`)
        }
    }

    view() {
        this.extension.logger.addLogMessage(`VIEW command invoked.`)
        let rootFile = this.extension.manager.findRoot(false)
        if (rootFile !== undefined) {
            this.extension.viewer.openViewer(rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root PDF to view.`)
        }
    }

    synctex() {
        this.extension.logger.addLogMessage(`SYNCTEX command invoked.`)
        this.extension.locator.syncTeX()
    }
}