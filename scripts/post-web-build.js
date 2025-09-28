const path = require('path')
const fs = require('fs')

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
  const sourceDirPath = path.join(projectRoot, sourceDir)
  const targetDirPath = path.join(projectRoot, targetDir)

  // Ensure target directory exists
  if (!fs.existsSync(targetDirPath)) {
    fs.mkdirSync(targetDirPath, {recursive: true})
  }

  // Check if source directory exists
  if (!fs.existsSync(sourceDirPath)) {
    console.log(
      `Warning: Source directory ${sourceDirPath} does not exist, skipping...`,
    )
    return
  }

  const files = fs.readdirSync(sourceDirPath)
  files.forEach(file => {
    const sourcePath = path.join(sourceDirPath, file)
    const targetPath = path.join(targetDirPath, file)

    // Check if source file exists and is a file (not directory)
    if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
      try {
        fs.copyFileSync(sourcePath, targetPath)
        console.log(`Copied ${sourcePath} to ${targetPath}`)
      } catch (error) {
        console.error(
          `Failed to copy ${sourcePath} to ${targetPath}:`,
          error.message,
        )
        // Don't throw - continue with other files
      }
    } else {
      console.log(`Skipping ${sourcePath} (not a file or doesn't exist)`)
    }
  })
}

copyFiles('web-build/static/js', 'bskyweb/static/js')
copyFiles('web-build/static/css', 'bskyweb/static/css')
copyFiles('web-build/static/media', 'bskyweb/static/media')
