import vscode from 'vscode'
import type { ExternalStep, RecipeStep, Step, StepQueue, Tool } from '../types'

const stepQueue: StepQueue = { steps: [], nextSteps: [] }

/**
 * Add a Tool to the queue, either as a RecipeStep or ExternalStep, based on
 * isExternal flag. If the tool belongs to the same recipe (determined by
 * timestamp), it is added to the current steps; otherwise, it is added to the
 * next steps for later execution.
 *
 * @param {Tool} tool - The Tool to be added to the queue.
 * @param {string | undefined} rootFile - Path to the root LaTeX file.
 * @param {string} recipeName - The name of the recipe to which the tool
 * belongs.
 * @param {number} timestamp - The timestamp when the recipe is called.
 * @param {boolean} [isExternal=false] - Whether the tool is an external
 * command.
 * @param {string} [cwd] - The current working directory if the tool is an
 * external command.
 */
function add(tool: Tool, rootFile: string | undefined, recipeName: string, timestamp: number, isExternal: boolean = false, cwd?: string) {
    // Wrap the tool as a RecipeStep or ExternalStep
    let step: Step
    if (!isExternal && rootFile !== undefined) {
        step = tool as RecipeStep
        step.rootFile = rootFile
        step.recipeName = recipeName
        step.timestamp = timestamp
        step.isRetry = false
        step.isExternal = false
        step.isSkipped = false
    } else {
        step = tool as ExternalStep
        step.recipeName = 'External'
        step.timestamp = timestamp
        step.isExternal = true
        step.cwd = cwd || ''
    }

    // Add the step to the appropriate queue (steps or nextSteps)
    if (stepQueue.steps.length === 0 || step.timestamp === stepQueue.steps[0].timestamp) {
        step.index = (stepQueue.steps[stepQueue.steps.length - 1]?.index ?? -1) + 1
        stepQueue.steps.push(step)
    } else if (stepQueue.nextSteps.length === 0 || step.timestamp === stepQueue.nextSteps[0].timestamp){
        step.index = (stepQueue.nextSteps[stepQueue.nextSteps.length - 1]?.index ?? -1) + 1
        stepQueue.nextSteps.push(step)
    } else {
        step.index = 0
        stepQueue.nextSteps = [ step ]
    }
}

/**
 * Add a step to the beginning of the current steps queue.
 *
 * @param {Step} step - The Step to be added to the front of the current steps
 * queue.
 */
function prepend(step: Step) {
    stepQueue.steps.unshift(step)
}

/**
 * Clear both the current steps and next steps queues.
 */
function clear() {
    stepQueue.nextSteps.length = 0
    stepQueue.steps.length = 0
}

/**
 * Check if the given step is the last one in the current steps queue.
 *
 * @param {Step} step - The Step to check.
 * @returns {boolean} - True if the step is the last one; otherwise, false.
 */
function isLastStep(step: Step): boolean {
    return stepQueue.steps.length === 0 || stepQueue.steps[0].timestamp !== step.timestamp
}

/**
 * Get a formatted string representation of the given step.
 *
 * @param {Step} step - The Step to get the string representation for.
 * @returns {string} - The formatted string representation of the step.
 */
function getStepString(step: Step): string {
    let stepString: string

    // Determine the format of the stepString based on timestamp and index
    if (step.timestamp !== stepQueue.steps[0]?.timestamp && step.index === 0) {
        stepString = step.recipeName
    } else if (step.timestamp === stepQueue.steps[0]?.timestamp) {
        stepString = `${step.recipeName}: ${step.index + 1}/${stepQueue.steps[stepQueue.steps.length - 1].index + 1} (${step.name})`
    } else {
        stepString = `${step.recipeName}: ${step.index + 1}/${step.index + 1} (${step.name})`
    }

    // Determine the format of the stepString based on timestamp and index
    if(step.rootFile) {
        const rootFileUri = vscode.Uri.file(step.rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop', rootFileUri)
        const showFilename = configuration.get<boolean>('latex.build.rootfileInStatus', false)
        if(showFilename) {
            const relPath = vscode.workspace.asRelativePath(step.rootFile)
            stepString = `${relPath}: ${stepString}`
        }
    }
    return stepString
}

/**
 * Get the next step from the queue, either from the current steps or next
 * steps.
 *
 * @returns {Step | undefined} - The next step from the queue, or undefined if
 * the queue is empty.
 */
function getStep(): Step | undefined {
    let step: Step | undefined
    if (stepQueue.steps.length > 0) {
        step = stepQueue.steps.shift()
    } else if (stepQueue.nextSteps.length > 0) {
        stepQueue.steps = stepQueue.nextSteps
        stepQueue.nextSteps = []
        step = stepQueue.steps.shift()
    }
    return step
}

export const queue = {
    add,
    prepend,
    clear,
    isLastStep,
    getStep,
    getStepString
}
