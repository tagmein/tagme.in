import {
 readFileSync,
 readdirSync,
 statSync,
 writeFileSync,
} from 'fs'
import { extname, join } from 'path'

const commentSyntax = {
 js: {
  singleLine: '//',
  multiLineStart: '/*',
  multiLineEnd: '*/',
 },

 ts: {
  singleLine: '//',
  multiLineStart: '/*',
  multiLineEnd: '*/',
 },

 html: {
  multiLineStart: '<!--',
  multiLineEnd: '-->',
 },

 css: {
  multiLineStart: '/*',
  multiLineEnd: '*/',
 },
}

function stats(rootDir) {
 const result = {
  html: {
   name: 'HTML',
   blank: 0,
   code: 0,
   comment: 0,
   size: 0,
  },
  ts: {
   name: 'TypeScript',
   blank: 0,
   code: 0,
   comment: 0,
   size: 0,
  },
  js: {
   name: 'JavaScript',
   blank: 0,
   code: 0,
   comment: 0,
   size: 0,
  },
  css: {
   name: 'CSS',
   blank: 0,
   code: 0,
   comment: 0,
   size: 0,
  },
 }

 function updateStats(filePath) {
  const ext = extname(filePath).slice(1)
  const typeStats = result[ext]
  if (!typeStats) {
   return
  }

  const {
   singleLine,
   multiLineStart,
   multiLineEnd,
  } = commentSyntax[ext] || {}

  let inMultiLineComment = false
  const content = readFileSync(filePath, 'utf8')
  typeStats.size += content.length
  const contentLines = content.split('\n')
  contentLines.forEach((lineOfCode) => {
   const line = lineOfCode.trim()

   if (!line) {
    typeStats.blank++
   } else if (
    !inMultiLineComment &&
    singleLine &&
    line.startsWith(singleLine)
   ) {
    typeStats.comment++
   } else if (line.includes(multiLineStart)) {
    inMultiLineComment = true
    typeStats.comment++
   } else if (
    inMultiLineComment &&
    line.includes(multiLineEnd)
   ) {
    inMultiLineComment = false
    typeStats.comment++
   } else if (inMultiLineComment) {
    typeStats.comment++
   } else {
    typeStats.code++
   }
  })
 }

 function updateStatsDir(dir) {
  readdirSync(dir).forEach((file) => {
   const filePath = join(dir, file)
   const stat = statSync(filePath)
   if (stat.isFile()) {
    updateStats(filePath)
   } else if (stat.isDirectory()) {
    if (
     file !== 'node_modules' &&
     !file.startsWith('.')
    ) {
     updateStatsDir(filePath)
    }
   }
  })
 }

 updateStatsDir(rootDir)

 return result
}

function injectStats(stats, filePath) {
 const statsText = `Written in ${stats.html.code} lines of HTML, ${stats.ts.code} lines of TypeScript, ${stats.js.code} lines of JavaScript, and ${stats.css.code} lines of CSS`
 writeFileSync(
  filePath,
  readFileSync(filePath, 'utf8').replace(
   /<p id="stats">[^<]*<\/p>/,
   `<p id="stats">${statsText}</p>`
  )
 )
}

injectStats(
 stats(process.cwd()),
 join(process.cwd(), 'public', 'index.html')
)
