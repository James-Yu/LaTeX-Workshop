import vscode from 'vscode'
import type { ExternalStep, RecipeStep, Step, StepQueue, Tool } from '.'

const stepQueue: StepQueue = { steps: [], nextSteps: [] }

/**
 * Add a {@link Tool} to the queue. The input {@link tool} is first wrapped
 * to be a {@link RecipeStep} or {@link ExternalStep} with additional
 * information, according to the nature {@link isExternal}. Then the wrapped
 * {@link Step} is added to the current {@link steps} if they belongs to the
 * same recipe, determined by the same {@link timestamp}, or added to the
 * {@link nextSteps} for later execution.
 *
 * @param tool The {@link Tool} to be added to the queue.
 * @param rootFile Path to the root LaTeX file.
 * @param recipeName The name of the recipe which the {@link tool} belongs
 * to.
 * @param timestamp The timestamp when the recipe is called.
 * @param isExternal Whether the {@link tool} is an external command.
 * @param cwd The current working directory if the {@link tool} is an
 * external command.
 */
function add(tool: Tool, rootFile: string | undefined, recipeName: string, timestamp: number, isExternal: boolean = false, cwd?: string) {
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

function prepend(step: Step) {
    stepQueue.steps.unshift(step)
}

function clear() {
    stepQueue.nextSteps = []
    stepQueue.steps = []
}

function isLastStep(step: Step) {
    return stepQueue.steps.length === 0 || stepQueue.steps[0].timestamp !== step.timestamp
}

function getStepString(step: Step): string {
    let stepString: string
    if (step.timestamp !== stepQueue.steps[0]?.timestamp && step.index === 0) {
        stepString = step.recipeName
    } else if (step.timestamp === stepQueue.steps[0]?.timestamp) {
        stepString = `${step.recipeName}: ${step.index + 1}/${stepQueue.steps[stepQueue.steps.length - 1].index + 1} (${step.name})`
    } else {
        stepString = `${step.recipeName}: ${step.index + 1}/${step.index + 1} (${step.name})`
    }
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