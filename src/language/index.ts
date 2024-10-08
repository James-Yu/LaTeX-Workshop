import { DocSymbolProvider } from './symbol-document'
import { ProjectSymbolProvider } from './symbol-project'
import { DefinitionProvider } from './definition'
import { FoldingProvider, DoctexFoldingProvider, WeaveFoldingProvider } from './folding'
import { SelectionRangeProvider } from './selection'
import { getLocaleString } from './l10n'

export const language = {
    docSymbol: new DocSymbolProvider(),
    projectSymbol: new ProjectSymbolProvider(),
    definition: new DefinitionProvider(),
    folding: new FoldingProvider(),
    doctexFolding: new DoctexFoldingProvider(),
    weaveFolding: new WeaveFoldingProvider(),
    selectionRage: new SelectionRangeProvider(),
    getLocaleString
}
