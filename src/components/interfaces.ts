export interface ILogger {
    addLogMessage(message: string): void,
    logCommand(message: string, command: string, args: string[]): void,
    addCompilerMessage(message: string): void,
    logError(e: Error): void,
    logOnRejected(e: unknown): void,
    clearCompilerMessage(): void,
    displayStatus(
        icon: string,
        color: string,
        message: string | undefined,
        severity: 'info' | 'warning' | 'error',
        build: string
    ): void,
    showErrorMessage(message: string, ...args: string[]): Thenable<string | undefined> | undefined,
    showErrorMessageWithCompilerLogButton(message: string): void,
    showErrorMessageWithExtensionLogButton(message: string): void,
    showLog(): void,
    showCompilerLog(): void
}
