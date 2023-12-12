import { lint as latexLinter } from './latex-linter'
import { formatter as latexFormatter } from './latex-formatter'
import { provider as latexActionProvider, action as latexAction } from './latex-code-actions'
import { format as bibtexFormat, formatter as bibtexFormatter } from './bibtex-formatter'
import { dupLabelDetector } from './duplicate-label'

export const lint = {
    latex: {
        formatter: latexFormatter,
        actionprovider: latexActionProvider,
        action: latexAction,
        ...latexLinter
    },
    bibtex: {
        format: bibtexFormat,
        formatter: bibtexFormatter
    },
    label: dupLabelDetector
}
