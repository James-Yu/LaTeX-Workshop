// Run npx esbuild unified.ts --bundle --outfile=../resources/unified.js
// Then change the `var unified2 = {` near EOF to `module.exports = {`

import { getParser } from '@unified-latex/unified-latex-util-parse'
import { attachMacroArgs } from '@unified-latex/unified-latex-util-arguments'

export const unified = {
    getParser,
    attachMacroArgs
}
