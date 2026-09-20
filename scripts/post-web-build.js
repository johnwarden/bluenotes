const path = require('path')
const fs = require('fs')

const {absolutizeHtmlAssetPaths} = require('./absolutize-web-asset-paths')

const projectRoot = path.join(__dirname, '..')
const templateFile = path.join(
  projectRoot,
  'bskyweb',
  'templates',
  'scripts.html',
)

const {entrypoints} = require(
  path.join(projectRoot, 'web-build/asset-manifest.json'),
)

console.log(`Found ${entrypoints.length} entrypoints`)
console.log(`Writing ${templateFile}`)

const outputFile = entrypoints
  .map(name => {
    const file = path.basename(name)
    const ext = path.extname(file)

    if (ext === '.js') {
      return `<script defer="defer" src="{{ staticCDNHost }}/static/js/${file}"></script>`
    }
    if (ext === '.css') {
      return `<link rel="stylesheet" href="{{ staticCDNHost }}/static/css/${file}">`
    }

    return ''
  })
  .join('\n')
fs.writeFileSync(templateFile, outputFile)

function copyFiles(sourceDir, targetDir) {
  const files = fs.readdirSync(path.join(projectRoot, sourceDir))
  files.forEach(file => {
    const sourcePath = path.join(projectRoot, sourceDir, file)
    const targetPath = path.join(projectRoot, targetDir, file)
    fs.copyFileSync(sourcePath, targetPath)
    console.log(`Copied ${sourcePath} to ${targetPath}`)
  })
}

copyFiles('web-build/static/js', 'bskyweb/static/js')
copyFiles('web-build/static/css', 'bskyweb/static/css')
copyFiles('web-build/static/media', 'bskyweb/static/media')

/*
 * Belt-and-suspenders for local `serve web-build` deep links: rewrite any
 * remaining relative `static/…` hrefs in the exported index.html. Production
 * bskyweb uses scripts.html with `{{ staticCDNHost }}/static/…` and is not
 * affected.
 */
const indexHtmlPath = path.join(projectRoot, 'web-build/index.html')
if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8')
  const rewritten = absolutizeHtmlAssetPaths(indexHtml)
  if (rewritten !== indexHtml) {
    fs.writeFileSync(indexHtmlPath, rewritten)
    console.log('Rewrote relative static/ asset paths in web-build/index.html')
  }
}
