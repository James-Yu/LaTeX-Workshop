import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import { Extension } from './../main'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined> = this._onDidChangeTreeData.event
    private hierarchy: string[]
    private sectionDepths: { string?: number } = {}
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    private ds: Section[] = []

    constructor(private extension: Extension) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.hierarchy = configuration.get('view.outline.sections') as string[]
        this.hierarchy.forEach((section, index) => {
            section.split('|').forEach(sec => {
                this.sectionDepths[sec] = index
            })
        })
    }

    refresh() : Section[] {
        if (this.extension.manager.rootFile) {
            this.ds = this.buildModel(this.extension.manager.rootFile)
            return this.ds
        } else {
            return []
        }
    }

    update() {
        this._onDidChangeTreeData.fire()
    }

    buildModel(filePath: string, parentStack?: Section[], parentChildren?: Section[]) : Section[] {

        let rootStack: Section[] = []
        if (parentStack) {
            rootStack = parentStack
        }

        let children: Section[] = []
        if (parentChildren) {
            children = parentChildren
        }

        const currentRoot = () => {
            return rootStack[rootStack.length - 1]
        }
        const noRoot = () => {
            return rootStack.length === 0
        }

        this.extension.logger.addLogMessage(`Parsing ${filePath} for outline`)
        let content = fs.readFileSync(filePath, 'utf-8')
        const endPos = content.search(/^(?!%)\s*\\end{document}/gm)
        if (endPos > -1) {
            content = content.substr(0, endPos)
        }

        let pattern = '^(?!%)\\s*(?:((?:\\\\(?:input|include|subfile|(?:subimport{([^}]*)}))(?:\\[[^\\[\\]\\{\\}]*\\])?){([^}]*)})|((?:\\\\('
        this.hierarchy.forEach((section, index) => {
            pattern += section
            if (index < this.hierarchy.length - 1) {
                pattern += '|'
            }
        })
        pattern += ')(?:\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?){([^}]*)}))'

        // const inputReg = /^((?:\\(?:input|include|subfile)(?:\[[^\[\]\{\}]*\])?){([^}]*)})|^((?:\\((sub)?section)(?:\[[^\[\]\{\}]*\])?){([^}]*)})/gm
        const inputReg = RegExp(pattern, 'gm')

        // if it's a section elements 5 = section
        // element 6 = title.

        // if it's a subsection:
        // element X = title

        // if it's an input, include, or subfile:
        // element 3 is the file (need to resolve the path)
        // element 0 starts with \input, include, or subfile

        // if it's a subimport
        // element 0 starts with \subimport
        // element 2 is the directory part
        // element 3 is the file

        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            if (result[5] in this.sectionDepths) {
                // is it a section, a subsection, etc?
                const heading = result[5]
                const title = result[6]
                const depth = this.sectionDepths[heading]

                const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1)

                // get a  line number
                const lineNumber = (prevContent.match(/\n/g) || []).length

                const newSection = new Section(title, vscode.TreeItemCollapsibleState.Expanded, depth, lineNumber, filePath)

                // console.log("Created New Section: " + title)
                if (noRoot()) {
                    children.push(newSection)
                    rootStack.push(newSection)
                    continue
                }

                // Find the proper root section
                while (!noRoot() && currentRoot().depth >= depth) {
                    rootStack.pop()
                }
                if (noRoot()) {
                    children.push(newSection)
                } else {
                    currentRoot().children.push(newSection)
                }
                rootStack.push(newSection)

                // if this is the same depth as the current root, append to the children array
                // i.e., at this level
                // if (depth === currentRoot().depth) {
                //     rootStack.push(newSection)
                // }

                // if (depth === 0) {
                //     children.push(newSection)
                // } else if (depth < currentRoot().depth) { // it's one level UP
                //     rootStack.pop()
                //     currentRoot().children.push(newSection)
                // } else { // it's one level DOWN (add it to the children of the current node)
                //     currentRoot().children.push(newSection)
                // }
            } else if (result[1].startsWith('\\input') || result[1].startsWith('\\include') || result[1].startsWith('\\subfile') || result[1].startsWith('\\subimport')) {
                // zoom into this file
                // resolve the path
                let inputFilePath
                if (result[1].startsWith('\\subimport')) {
                    inputFilePath = path.resolve(path.join(this.extension.manager.rootDir, result[2], result[3]))
                } else {
                    inputFilePath = path.resolve(path.join(this.extension.manager.rootDir, result[3]))
                }

                if (path.extname(inputFilePath) === '') {
                    inputFilePath += '.tex'
                }
                if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + '.tex')) {
                    inputFilePath += '.tex'
                }
                if (fs.existsSync(inputFilePath) === false) {
                    this.extension.logger.addLogMessage(`Could not resolve included file ${inputFilePath}`)
                    //console.log(`Could not resolve included file ${inputFilePath}`)
                    continue
                }

                this.buildModel(inputFilePath, rootStack, children)
            }
        }
        return children
    }

    getTreeItem(element: Section) : vscode.TreeItem {

        const hasChildren = element.children.length > 0
        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)

        treeItem.command = {
            command: 'latex-workshop.goto-section',
            title: '',
            arguments: [element.fileName, element.lineNumber]
        }

        return treeItem
    }

    getChildren(element?: Section) : Thenable<Section[]> {
        if (this.extension.manager.rootFile === undefined) {
            return Promise.resolve([])
        }
        // if the root doesn't exist, we need
        // to explicitly build the model from disk
        if (!element) {
            return Promise.resolve(this.refresh())
        }

        return Promise.resolve(element.children)
    }
}

class Section extends vscode.TreeItem {

    public children: Section[] = []

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly depth: number,
        public readonly lineNumber: number,
        public readonly fileName: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)

    }

    iconPath = {
        light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'Section.svg'),
        dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'Section.svg')
    }

    contextValue = 'Section'

}
