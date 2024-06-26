import * as vscode from 'vscode'
import type { MacroInfoRecord, EnvInfoRecord } from '@unified-latex/unified-latex-types'

const MACROS: MacroInfoRecord = {
    // \input{some-file}
    InputIfFileExists: { signature: 'm' },
    SweaveInput: { signature: 'm' },
    subfile: { signature: 'm' },
    loadglsentries: { signature: 'm' },
    markdownInput: { signature: 'm' },
    // \import{sections/}{some-file}
    import: { signature: 'm m' },
    inputfrom: { signature: 'm m' },
    includefrom: { signature: 'm m' },
    subimport: { signature: 'm m' },
    subinputfrom: { signature: 'm m' },
    subincludefrom: { signature: 'm m' },
    // \label{some-label}
    linelabel: { signature: 'o m' },
    // \newglossaryentry{vscode}{name=VSCode, description=Editor}
    newglossaryentry: { signature: 'm m' },
    provideglossaryentry: { signature: 'm m' },
    // \newacronym[optional parameters]{lw}{LW}{LaTeX Workshop}
    longnewglossaryentry: { signature: 'o m m m' },
    longprovideglossaryentry: { signature: 'o m m m' },
    newacronym: { signature: 'o m m m' },
    newabbreviation: { signature: 'o m m m' },
    newabbr: { signature: 'o m m m' },
    newrobustcmd: { signature: 's d<> +m o +o +m' },
    renewrobustcmd: { signature: 's d<> +m o +o +m' },
    providerobustcmd: { signature: 's +m o +o +m' },
    DeclareRobustCommand: { signature: 's +m o +o +m' },
    DeclareMathOperator: { signature: 's m m' },
    DeclarePairedDelimiter: { signature: 'm m m' },
    DeclarePairedDelimiterX: { signature: 'm o m m m' },
    DeclarePairedDelimiterXPP: { signature: 'm o m m m m m' },
}

const ENVS: EnvInfoRecord = {}

export function getMacroDefs(): MacroInfoRecord {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const cmds = [... new Set([
        ...configuration.get('view.outline.commands') as string[],
        ...configuration.get('intellisense.label.command') as string[]
    ])]
    const secs = (configuration.get('view.outline.sections') as string[]).map(level => level.split('|')).flat()

    const macroDefs = Object.assign({}, MACROS)
    cmds.forEach(cmd => macroDefs[cmd] = { signature: 'd<> o m' })
    secs.forEach(sec => macroDefs[sec] = { signature: 's o m' })

    return macroDefs
}

export function getEnvDefs(): EnvInfoRecord {
    return ENVS
}
