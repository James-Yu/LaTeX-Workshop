import * as vscode from 'vscode'

import {Extension} from '../main'

export class Logger {
    extension: Extension
    logPanel: vscode.OutputChannel
    compilerLogPanel: vscode.OutputChannel
    status: vscode.StatusBarItem
    status2: vscode.StatusBarItem

    constructor(extension: Extension) {
        this.extension = extension
        this.logPanel = vscode.window.createOutputChannel('LaTeX Workshop')
        this.compilerLogPanel = vscode.window.createOutputChannel('LaTeX Compiler')
        this.compilerLogPanel.append('Ready')
        this.addLogMessage('Initializing LaTeX Workshop.')
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)
        this.status2 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10001)
        this.status.command = 'latex-workshop.actions'
        this.status2.command = 'latex-workshop.actions'
        this.status.show()
        this.status2.show()
        this.displayStatus('check', 'statusBar.foreground')
    }

    addLogMessage(message: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('message.log.show')) {
            this.logPanel.append(`[${new Date().toLocaleTimeString('en-US', {hour12: false})}] ${message}\n`)
        }
    }

    addCompilerMessage(message: string) {
        this.compilerLogPanel.append(message)
    }

    clearCompilerMessage() {
        this.compilerLogPanel.clear()
    }

    displayStatus(icon: string, color: string, message: string | undefined = undefined, severity: string = 'info', build: string = '') {
        this.status.text = `$(${icon})${build}`
        this.status.tooltip = message
        this.status.color = new vscode.ThemeColor(color)
        if (message === undefined) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        switch (severity) {
            case 'info':
                if (configuration.get('message.information.show')) {
                    vscode.window.showInformationMessage(message)
                }
                break
            case 'warning':
                if (configuration.get('message.warning.show')) {
                    vscode.window.showWarningMessage(message)
                }
                break
            case 'error':
            default:
                if (configuration.get('message.error.show')) {
                    vscode.window.showErrorMessage(message)
                }
                break
        }
    }

    showErrorMessage(message: string, ...args) : Thenable<any> | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('message.error.show')) {
            return vscode.window.showErrorMessage(message, ...args)
        } else {
            return undefined
        }
    }

    showLog() {
        this.logPanel.show()
    }

    showCompilerLog() {
        this.compilerLogPanel.show()
    }
}

export class BuildInfo {
    extension: Extension
    status: vscode.StatusBarItem
    currentBuild: {
        buildStart: number
        pageTotal?: number | undefined
        lastPageTime: number
        pageTimes: {[pageNo: number]: number}[]
        stdout: string
        ruleNumber: number
    } // | undefined

    constructor(extension: Extension) {
        this.extension = extension
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10001)
        // this.status.command = 'latex-workshop.actions' // to be added when detailed build info window exists
        this.status.show()
    }

    public buildStarted() {
        this.currentBuild = {
            buildStart: +new Date(),
            pageTotal: undefined,
            lastPageTime: +new Date(),
            pageTimes: [{}],
            stdout: '',
            ruleNumber: 0
        }
        this.status.text = ''
    }
    public buildEnded() {
        if (this.currentBuild) {
            this.status.text = `( ${((+new Date - this.currentBuild.buildStart) / 1000).toFixed(1)} s )`
            // @ts-ignore
            this.currentBuild = undefined
            setTimeout(() => {
                if (!this.currentBuild) {
                    this.status.text = ''
                }
            }, 5000)
        }
    }

    public setPageTotal (count: number) {
        if (this.currentBuild) {
            this.currentBuild.pageTotal = count
        }
    }

    public newStdoutLine(line: string) {
        if (!this.currentBuild) {
            throw Error(`Can't Display Progress for non-Started build - see BuildInfo.buildStarted()`)
        }
        this.currentBuild.stdout += line

        console.log(line)

        this.checkStdoutForInfo()
    }

    private checkStdoutForInfo() {
        const pageNumberRegex = /\n\[(\d+)[\s\w\{\}\.\/\-]*\]$/
        const latexRuleStartedRegex = /Latexmk: applying rule '[A-z]+'\.\.\.\n$/

        if (this.currentBuild.stdout.match(pageNumberRegex)) {
            // @ts-ignore
            const pageNo = parseInt(this.currentBuild.stdout.match(pageNumberRegex)[1])
            this.extension.buildInfo.displayProgress(pageNo)
        } else if (this.currentBuild.stdout.match(latexRuleStartedRegex)) {
            this.currentBuild.ruleNumber++
            this.currentBuild.pageTimes.push({})
            this.extension.buildInfo.displayProgress(0)
        }
    }

    private displayProgress(
        current: number,
        tooltip: string = ''
      ) {
        if (!this.currentBuild) {
            throw Error(`Can't Display Progress for non-Started build - see BuildInfo.buildStarted()`)
        }

        this.currentBuild.pageTimes[this.currentBuild.ruleNumber][current] = +new Date() - this.currentBuild.lastPageTime
        this.currentBuild.lastPageTime = +new Date()

        const generateProgressBar = (proportion: number, length: number) => {
          const wholeCharacters = Math.trunc(length * proportion)
          const extraEighths = Math.round(
            (length * proportion - wholeCharacters) * 8
          )
          const eighths = {
            0: ' ',
            1: '▏',
            2: '▎',
            3: '▍',
            4: '▌',
            5: '▋',
            6: '▊',
            7: '▉',
            8: '█'
          }
          return (
            '█'.repeat(wholeCharacters) +
            (eighths[extraEighths] !== ' ' ? eighths[extraEighths] : '') +
            '░'.repeat(Math.max(0, length - wholeCharacters - 1))
          )
        }
        const parenthasisedNumbers = {
            0: '⒪',
            1: '⑴',
            2: '⑵',
            3: '⑶',
            4: '⑷',
            5: '⑸',
            6: '⑹',
            7: '⑺',
            8: '⑻',
            9: '⑼',
            10: '⑽',
            11: '⑾',
            12: '⑿',
            13: '⒀',
            14: '⒁',
            15: '⒂',
            16: '⒃',
            17: '⒄',
            18: '⒅',
            19: '⒆',
            20: '⒇',
        }
        const padRight = (str: string, desiredMinLength: number) => {
          if (str.length < desiredMinLength) {
            str = str + '   '.repeat(desiredMinLength - str.length)
          }
          return str
        }

        const currentAsString = current.toString()
        const endpointAsString = this.currentBuild.pageTotal ? '/' + this.currentBuild.pageTotal.toString() : ''
        const barAsString = this.currentBuild.pageTotal
          ? generateProgressBar(current / this.currentBuild.pageTotal, 15)
          : ''

        this.status.text = `${parenthasisedNumbers[this.currentBuild.ruleNumber]}  Page ${padRight(
          currentAsString + endpointAsString,
          5
        )} ${barAsString}`
        this.status.tooltip = tooltip
      }
}
