import * as vscode from 'vscode'

const configs: Map<string, any> = new Map()
const changedConfigs: { section: string, scope?: vscode.ConfigurationScope }[] = []

/**
 * Records an in-memory test configuration value consumed by `mock.config`.
 * Use this when a unit test should override configuration without changing
 * the VS Code workspace settings.
 */
export function setConfig(section: string, value: any): void {
    configs.set(section, value)
}

/**
 * Updates a real VS Code configuration value and remembers it for cleanup.
 * Use this only when the code under test reads configuration outside the
 * in-memory `set.config` mock.
 */
export async function setCodeConfig(section: string, value: any, scope?: vscode.ConfigurationScope): Promise<void> {
    if (!changedConfigs.some(config => config.section === section && config.scope === scope)) {
        changedConfigs.push({ section, scope })
    }
    await vscode.workspace.getConfiguration('latex-workshop', scope).update(section, value)
}

/**
 * Returns whether an in-memory configuration override exists.
 * This is used internally by the configuration mock.
 */
export function hasTestConfig(section: string): boolean {
    return configs.has(section)
}

/**
 * Reads an in-memory configuration override.
 * This is used internally by the `configuration mock rather than by tests directly.
 */
export function getTestConfig<T>(section: string): T | undefined {
    return configs.get(section) as T | undefined
}

/**
 * Restores all real configuration values changed by `set.codeConfig` and
 * clears the in-memory overrides. Call this from test cleanup.
 */
export async function resetConfig(): Promise<void> {
    for (const { section, scope } of changedConfigs.slice().reverse()) {
        await vscode.workspace.getConfiguration('latex-workshop', scope).update(section, undefined)
    }
    changedConfigs.length = 0
    configs.clear()
}
