
import * as vscode from 'vscode'

function colorParserCMYK(colorAsString: string): vscode.Color | undefined {

    const tokens = colorAsString.split(',')
    if (tokens.length !== 4) {
        return undefined
    }
    const c = parseFloat(tokens[0])
    const m = parseFloat(tokens[1])
    const y = parseFloat(tokens[2])
    const k = parseFloat(tokens[3])
    const r = (1 - c) * (1 - k)
    const g = (1 - m) * (1 - k)
    const b = (1 - y) * (1 - k)
    return new vscode.Color(r, g, b, 1)
}

function colorParserHTML(colorAsString: string): vscode.Color | undefined {
    if (colorAsString.length !== 6) {
        return undefined
    }
    const r = parseInt(colorAsString.slice(0, 2), 16) / 255
    const g = parseInt(colorAsString.slice(2, 4), 16) / 255
    const b = parseInt(colorAsString.slice(4, 6), 16) / 255
    return new vscode.Color(r, g, b, 1)
}

function colorParserRGB(colorAsString: string, scale: number = 1): vscode.Color | undefined {
    const tokens = colorAsString.split(',')
    if (tokens.length !== 3) {
        return undefined
    }
    const r = parseFloat(tokens[0]) / scale
    const g = parseFloat(tokens[1]) / scale
    const b = parseFloat(tokens[2]) / scale
    return new vscode.Color(r, g, b, 1)
}

function colorParserGray(colorAsString: string, scale: number = 1): vscode.Color | undefined{
    if (!colorAsString.match(/^[0-9.]*$/)) {
        return undefined
    }
    const gray = parseFloat(colorAsString) / scale
    if (gray < 0 || gray > 1) {
        return undefined
    }
    return new vscode.Color(gray, gray, gray, 1)
}

export class DocColorProvider implements vscode.DocumentColorProvider {

    provideDocumentColors(document: vscode.TextDocument): vscode.ProviderResult<vscode.ColorInformation[]> {
        const colors: vscode.ColorInformation[] = []
        const text = document.getText()
        const defineColorRegex = /(\\definecolor\{\w+\}\{(\w+)\}\{)([^}]+)/g
        let match: RegExpExecArray | null

        while ((match = defineColorRegex.exec(text))) {
            const start = document.positionAt(match.index + match[1].length)
            const end = start.translate(0, match[3].length)
            let color: vscode.Color | undefined = undefined
            switch(match[2]) {
                case 'HTML':
                    color = colorParserHTML(match[3])
                    break
                case 'gray':
                    color = colorParserGray(match[3])
                    break
                case 'Gray':
                    color = colorParserGray(match[3], 15)
                    break
                case 'rgb':
                    color = colorParserRGB(match[3])
                    break
                case 'RGB':
                    color = colorParserRGB(match[3], 255)
                    break
                case 'cmyk':
                    color = colorParserCMYK(match[3])
                    break
                default:
                    break
            }
            if (color !== undefined) {

                colors.push(
                    new vscode.ColorInformation(
                        new vscode.Range(start, end),
                        color
                    )
                )
            }
        }
        return colors
    }

    provideColorPresentations(color: vscode.Color, context: { document: vscode.TextDocument, range: vscode.Range }): vscode.ProviderResult<vscode.ColorPresentation[]> {
        const precision = 2
        const line = context.document.lineAt(context.range.start.line).text
        let label: string

        const regex = /\\definecolor\{\w+\}\{([a-zA-Z]+)\}/g
        const match = regex.exec(line)
        if (match === null) {
            return
        }
        const type = match[1]
        switch (type) {
            case 'HTML': {
                const toHex = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0')
                label = `${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`
                break
            }
            case 'rgb': {
                label = `${color.red.toFixed(precision)},${color.green.toFixed(precision)},${color.blue.toFixed(precision)}`
                break
            }
            case 'RGB': {
                label = `${Math.round(color.red * 255)},${Math.round(color.green * 255)},${Math.round(color.blue * 255)}`
                break
            }
            case 'cmyk': {
                const r = color.red
                const g = color.green
                const b = color.blue
                const k = 1 - Math.max(r, g, b)
                if (k === 1) {
                    const c = 0.
                    const m = 0.
                    const y = 0.
                    label = `${c.toFixed(precision)},${m.toFixed(precision)},${y.toFixed(precision)},${k.toFixed(precision)}`

                } else {
                    const c = (1 - r - k) / (1 - k)
                    const m = (1 - g - k) / (1 - k)
                    const y = (1 - b - k) / (1 - k)
                    label = `${c.toFixed(precision)},${m.toFixed(precision)},${y.toFixed(precision)},${k.toFixed(precision)}`
                }
                break
            }
            case 'gray': {
                const gray = (color.red + color.green + color.blue) / 3
                label = `${gray.toFixed(precision)}`
                break
            }
            case 'Gray': {
                const gray = (color.red + color.green + color.blue) / 3
                label = `${Math.round(gray * 15)}`
                break
            }
            default:
                return []
        }

        return [new vscode.ColorPresentation(label)]
    }
}
