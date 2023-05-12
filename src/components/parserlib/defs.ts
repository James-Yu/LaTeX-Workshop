import type { MacroInfoRecord, EnvInfoRecord } from '@unified-latex/unified-latex-types'

export const macros: MacroInfoRecord = {
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
}

export const environments: EnvInfoRecord = {

}
