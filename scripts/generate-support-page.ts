#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

function camelToTitle(name: string): string {
  return name.replace(/([A-Z])/g, ' $1').trim()
}

function generateSupportPage(pageName: string): boolean {
  const screensDir = path.join(__dirname, '..', 'src', 'view', 'screens')
  const contentFile = path.join(screensDir, `bluenotes-${pageName}.html`)
  const outputFile = path.join(screensDir, `${pageName}.tsx`)
  const templateFile = path.join(screensDir, 'SupportPageTemplate.tsx.template')

  // Check if files exist
  if (!fs.existsSync(contentFile)) {
    console.error(`Error: Content file ${contentFile} not found`)
    return false
  }

  if (!fs.existsSync(templateFile)) {
    console.error(`Error: Template file ${templateFile} not found`)
    return false
  }

  console.log(`Generating ${outputFile} from ${contentFile}...`)

  try {
    // Read files
    const htmlContent = fs.readFileSync(contentFile, 'utf-8')
    const templateContent = fs.readFileSync(templateFile, 'utf-8')

    // Generate values
    const pageTitle = camelToTitle(pageName)
    const componentName = pageName

    // Escape HTML content for JavaScript template literal
    const htmlEscaped = htmlContent.replace(/`/g, '\\`').replace(/\${/g, '\\${')

    // Replace placeholders
    let result = templateContent
    result = result.replace(/\{\{PAGE_TITLE\}\}/g, pageTitle)
    result = result.replace(/\{\{COMPONENT_NAME\}\}/g, componentName)
    result = result.replace(/\{\{HTML_CONTENT\}\}/g, htmlEscaped)

    // Write output file
    fs.writeFileSync(outputFile, result, 'utf-8')

    console.log(`✅ Generated ${outputFile} successfully!`)
    console.log(`📄 Page Title: ${pageTitle}`)
    console.log(`📁 Component: ${componentName}Screen`)

    return true
  } catch (error) {
    console.error(`Error generating support page: ${error}`)
    return false
  }
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    console.log('Usage: npx tsx scripts/generate-support-page.ts <PageName>')
    console.log(
      'Example: npx tsx scripts/generate-support-page.ts TermsOfService',
    )
    console.log(
      'Example: npx tsx scripts/generate-support-page.ts PrivacyPolicy',
    )
    process.exit(1)
  }

  const pageName = args[0]
  const success = generateSupportPage(pageName)

  if (!success) {
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
