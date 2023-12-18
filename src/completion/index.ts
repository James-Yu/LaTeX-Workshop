import { citation } from './completer/citation'
import { environment } from './completer/environment'
import { macro } from './completer/macro'
import { reference } from './completer/reference'
import { usepackage } from './completer/package'
import { input } from './completer/input'
import { glossary } from './completer/glossary'

import { Provider, AtProvider } from './latex'
import { BibProvider } from './bibtex'

export const completion = {
    citation,
    environment,
    macro,
    reference,
    usepackage,
    input,
    glossary,
    provider: new Provider(),
    atProvider: new AtProvider(),
    bibProvider: new BibProvider()
}
