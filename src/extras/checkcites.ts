import * as vscode from 'vscode'
import { EOL } from 'os'
import { lw } from '../lw'
import * as path from 'path'

const logger = lw.log('Citations', 'Linter')

export function checkCitations() {
  logger.log('Checking citations.')
  const rootPath = lw.root.file.path
  if (!rootPath) {
    logger.log('No root file found.')
    return []
  }
  const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.file.toUri(rootPath))

  const aux = rootPath.replace(/\.tex$/, '.aux')
  const outDir = configuration.get<string>('latex.outDir', '')
  const auxDir = path.join(path.dirname(aux), path.normalize(outDir))
  const auxBaseName = path.basename(aux)
  const auxFile = path.join(auxDir, auxBaseName)
  if (!auxFile) {
    logger.log('No aux file found.')
    return []
  }

  const {stdout, error} = lw.external.sync('checkcites', ['-u', auxFile], {
    cwd: lw.root.dir.path,
  })
  if (error) {
    logger.logError('Error checking citations.', error)
    return []
  }

  const result = stdout
    .toString()
    .split(EOL)
    .filter(l => l.startsWith('=>'))
    .map(l => l.slice(2).trim())

  logger.log(`Found ${result.length} unused citation(s).`)
  return result
}
