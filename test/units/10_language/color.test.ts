import * as vscode from 'vscode'
import * as path from 'path'
import { assert, get, TextDocument } from '../utils'
import { DocColorProvider } from '../../../src/language/color'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const provider = new DocColorProvider()

    function getColors(content: string): vscode.ColorInformation[] {
        const document = new TextDocument(get.path('main.tex'), content, { languageId: 'latex' })
        return provider.provideDocumentColors(document) as vscode.ColorInformation[]
    }

    function getLabel(line: string, color: vscode.Color): string | undefined {
        const document = new TextDocument(get.path('main.tex'), line, { languageId: 'latex' })
        const range = new vscode.Range(0, 0, 0, 0)
        const presentations = provider.provideColorPresentations(color, { document, range }) as vscode.ColorPresentation[]
        return presentations[0]?.label
    }

    describe('lw.language->docColor', () => {
        it('should scale RGB components from 0-255', () => {
            const colors = getColors('\\definecolor{blue}{RGB}{6,34,81}')

            assert.strictEqual(colors.length, 1)
            assert.strictEqual(colors[0].color.red, 6 / 255)
            assert.strictEqual(colors[0].color.green, 34 / 255)
            assert.strictEqual(colors[0].color.blue, 81 / 255)
        })

        it('should keep rgb components as given', () => {
            const colors = getColors('\\definecolor{x}{rgb}{0.5,0.25,1}')

            assert.strictEqual(colors.length, 1)
            assert.strictEqual(colors[0].color.red, 0.5)
            assert.strictEqual(colors[0].color.green, 0.25)
            assert.strictEqual(colors[0].color.blue, 1)
        })

        it('should scale Gray from 0-15 and keep gray as given', () => {
            const colors = getColors('\\definecolor{a}{Gray}{3}\n\\definecolor{b}{gray}{0.5}')

            assert.strictEqual(colors.length, 2)
            assert.strictEqual(colors[0].color.red, 3 / 15)
            assert.strictEqual(colors[1].color.red, 0.5)
        })

        it('should present RGB and Gray colors as integers', () => {
            const color = new vscode.Color(227 / 255, 34 / 255, 54 / 255, 1)

            assert.strictEqual(getLabel('\\definecolor{red}{RGB}{0,0,0}', color), '227,34,54')
            assert.strictEqual(getLabel('\\definecolor{red}{rgb}{0,0,0}', color), '0.89,0.13,0.21')
            assert.strictEqual(getLabel('\\definecolor{g}{Gray}{0}', new vscode.Color(0.2, 0.2, 0.2, 1)), '3')
            assert.strictEqual(getLabel('\\definecolor{g}{gray}{0}', new vscode.Color(0.2, 0.2, 0.2, 1)), '0.20')
        })
    })
})
