import { execFileSync } from 'node:child_process'

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
if (!branch || branch === 'main' || branch === 'master') throw new Error(`Ungültiger Review-Branch: ${branch || '(detached)'}`)
console.log(`BRANCH_OK ${branch}`)
