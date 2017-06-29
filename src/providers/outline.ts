import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import { Extension } from './../main'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined> = this._onDidChangeTreeData.event
    private sectionDepths = { "section": 0, "subsection": 1, "subsubsection": 2 }

    // our data source is a set multi-rooted set of trees 
    private ds: Section[] = []

    constructor(private extension: Extension) {

        extension.manager.fileWatcher.on('change', (path: string) => {
            this.extension.logger.addLogMessage(`[outline]: responding to change in ${path}`)
            this.refresh()
        })

    }

    refresh(): Section[] {

        this.ds = this.buildModel(this.extension.manager.rootFile)
        this._onDidChangeTreeData.fire()

        return this.ds
    }

    buildModel(filePath: string, stack?: Section[], previousRoot?: Section): Section[] {

        let rootStack: Section[] = []

        if (stack != null) {
            rootStack = stack
        }

        let currentRoot = function () {
            return rootStack[rootStack.length - 1]
        }
        let noRoot = function () {
            return rootStack.length == 0
        }

        if (previousRoot != null) {
            rootStack.push(previousRoot)
        }

        let children: Section[] = []

        this.extension.logger.addLogMessage(`Parsing ${filePath}`)
        //console.log(`Parsing ${filePath}`)
        const content = fs.readFileSync(filePath, 'utf-8')

        const inputReg = /^((?:\\(?:input|include|subfile)(?:\[[^\[\]\{\}]*\])?){([^}]*)})|((?:\\((sub)?section)(?:\[[^\[\]\{\}]*\])?){([^}]*)})/gm

        // if it's a section elements 4 = section
        // element 6 = title.

        // if it's a subsection: 
        // element X = title

        // if it's an input, include, or subfile:
        // element 2 is the file (need to resolve the path)
        // element 0 starts with \input, include, or subfile

        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            if (result[4] !== undefined && result[4].endsWith("section")) {

                // we don't go any further than three levels down
                if (!(result[4] in this.sectionDepths)) {
                    continue
                }
                // is it a section, a subsection, etc?
                let heading = result[4]
                let title = result[6]
                let depth = this.sectionDepths[heading]

                const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1)

                // get a  line number
                var lineNumber = (prevContent.match(/\n/g) || []).length;

                let newSection = new Section(title, vscode.TreeItemCollapsibleState.Expanded, depth, lineNumber, filePath)

                // console.log("Created New Section: " + title)
                if (noRoot()) {
                    children.push(newSection)
                    rootStack.push(newSection)
                    continue
                }

                // if this is the same depth as the current root, append to the children array
                // i.e., at this level
                if (depth == currentRoot().depth) {
                    rootStack.push(newSection)
                }

                if (depth == 0) {
                    children.push(newSection)
                }
                // it's one level UP

                else if (depth < currentRoot().depth) {
                    rootStack.pop()
                    currentRoot().children.push(newSection)
                }
                // it's one level DOWN (add it to the children of the current node)
                else {
                    currentRoot().children.push(newSection)
                }
            }
            // zoom into this file 
            else if (result[0].startsWith("\\input") || result[0].startsWith("\\include") || result[0].startsWith("\\subfile")) {

                // resolve the path
                let inputFilePath = path.resolve(path.join(this.extension.manager.rootDir, result[2]))

                if (path.extname(inputFilePath) === '') {
                    inputFilePath += '.tex'
                }
                if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + '.tex')) {
                    inputFilePath += '.tex'
                }
                if (fs.existsSync(inputFilePath) == false) {
                    this.extension.logger.addLogMessage(`Could not resolve included file ${inputFilePath}`)
                    //console.log(`Could not resolve included file ${inputFilePath}`)
                    continue
                }

                if (noRoot()) {
                    children = children.concat(this.buildModel(inputFilePath, rootStack))
                } else {
                    children = children.concat(this.buildModel(inputFilePath, rootStack, currentRoot()))
                }
            }
        }

        return children
    }

    getTreeItem(element: Section): vscode.TreeItem {



        let hasChildren = element.children.length > 0
        let treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

        treeItem.command = {
            command: 'latex-workshop.goto-section',
            title: '',
            arguments: [element.fileName, element.lineNumber]
        };

        return treeItem
    }

    getChildren(element?: Section): Thenable<Section[]> {

        // if the root doesn't exist, we need 
        // to explicitly build the model from disk
        if (!element) {
            return Promise.resolve(this.refresh())
        }

        return Promise.resolve(element.children)
    }


    // getSectionItems(content: string) : SectionDataItem[] {

    //     const itemReg = /(?:\\((sub)?section)(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
    //     var items : SectionDataItem[] = []

    //     while (true) {
    //         const result = itemReg.exec(content)
    //         if (result === null) {
    //             break
    //         }
    //         // element 1 tells us if it is a section or a subsection
    //         // element 3 gives us the title
    //         if (!(result[1] in items)) {
    //             const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1)
    //             const followLength = content.substring(result.index, content.length).split('\n', 4).join('\n').length

    //             // get a  line number
    //             var count = (prevContent.match(/\n/g) || []).length;

    //             items.push()

    //         }
    //     }
    //     return items
    // }
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
