import * as vscode from 'vscode'

export function getCurrentThemeLightness(): 'light' | 'dark' {
    if (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light) {
        return 'light'
    } else {
        return 'dark'
    }
}
