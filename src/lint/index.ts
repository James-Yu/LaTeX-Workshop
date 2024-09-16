import { format as bibtexFormat, formatter as bibtexFormatter } from './bibtex-formatter'
import { dupLabelDetector } from './duplicate-label'
import { action as latexAction, provider as latexActionProvider } from './latex-code-actions'
import { formatter as latexFormatter } from './latex-formatter'
import { lint as latexLinter } from './latex-linter'

export const lint = {
    latex: {
        formatter: latexFormatter,
        actionprovider: latexActionProvider,
        action: latexAction,
        ...latexLinter
    },
    bibtex: {
        format: bibtexFormat,
        formatter: bibtexFormatter,
    },
    label: dupLabelDetector
}
