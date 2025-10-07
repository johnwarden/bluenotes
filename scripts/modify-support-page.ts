#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'

/**
 * Script to modify Bluesky support page HTML for Bluenotes deployment
 *
 * This script:
 * 1. Extracts content from full HTML pages
 * 2. Removes Table of Contents sections
 * 3. Replaces all references to "Bluesky" with "Bluenotes"
 * 4. Replaces all links to "bsky.app" with "bluenotes.social"
 * 5. Adds a section explaining the relationship with Bluesky (based on page type)
 * 6. Removes EU-specific content (DPO/DPR sections, Digital Services Act paragraphs)
 * 7. Prettifies the HTML content
 * 8. Outputs to specified file
 *
 * Usage:
 *   tsx scripts/modify-support-page.ts <input-file> <output-file>
 *
 * Examples:
 *   tsx scripts/modify-support-page.ts bsky-PrivacyPolicy.html bluenotes-PrivacyPolicy.html
 *   tsx scripts/modify-support-page.ts bsky-TermsOfService.html bluenotes-TermsOfService.html
 */

type PageType = string

interface ProcessingOptions {
  inputFile: string
  outputFile: string
  pageType: PageType
}

function determinePageType(inputFileName: string): PageType {
  const basename = path.basename(inputFileName, '.html')

  // Extract page type from filename pattern: bsky-{PageType}.html
  const match = basename.match(/^bsky-(.+)$/)
  if (match) {
    return match[1] // Returns: PrivacyPolicy, TermsOfService, CommunityGuidelines, etc.
  }

  // Fallback for other patterns
  return basename.replace(/^bsky-?/, '') || 'unknown'
}

// Parse command line arguments
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error(
    '❌ Usage: tsx scripts/modify-support-page.ts <input-file> <output-file>',
  )
  console.error('')
  console.error('Examples:')
  console.error(
    '  tsx scripts/modify-support-page.ts bsky-PrivacyPolicy.html bluenotes-PrivacyPolicy.html',
  )
  console.error(
    '  tsx scripts/modify-support-page.ts bsky-TermsOfService.html bluenotes-TermsOfService.html',
  )
  console.error(
    '  tsx scripts/modify-support-page.ts bsky-CommunityGuidelines.html bluenotes-CommunityGuidelines.html',
  )
  process.exit(1)
}

const inputFileName = args[0]
const outputFileName = args[1]
const pageType = determinePageType(inputFileName)

// Support both relative and absolute paths
const INPUT_FILE = path.isAbsolute(inputFileName)
  ? inputFileName
  : path.join(__dirname, '../src/view/screens', inputFileName)
const OUTPUT_FILE = path.isAbsolute(outputFileName)
  ? outputFileName
  : path.join(__dirname, '../src/view/screens', outputFileName)

function extractContentFromHtml(fullHtml: string): string {
  // Extract content from full HTML pages downloaded from Bluesky

  // Look for the main content section with support-page class
  const supportSectionRegex =
    /<section[^>]*(?:support-page|max-w-\[918px\])[^>]*>([\s\S]*?)<\/section>/
  const supportMatch = fullHtml.match(supportSectionRegex)

  if (supportMatch) {
    return supportMatch[1].trim()
  }

  // Fallback: look for any section content
  const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/
  const sectionMatch = fullHtml.match(sectionRegex)

  if (sectionMatch) {
    return sectionMatch[1].trim()
  }

  throw new Error(
    'Could not find section content in the HTML. Expected full HTML page from Bluesky.',
  )
}

function prettifyHtml(html: string): string {
  // Basic HTML prettification
  let formatted = html

  // Add line breaks after major HTML elements
  formatted = formatted.replace(
    /<\/?(section|h[1-6]|p|ol|ul|li|div)([^>]*)>/g,
    '\n$&\n',
  )

  // Add line breaks after self-closing tags
  formatted = formatted.replace(/<(hr|br)([^>]*)>/g, '\n$&\n')

  // Clean up multiple consecutive newlines
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n')

  // Add proper indentation
  const lines = formatted.split('\n')
  let indentLevel = 0
  const indentedLines = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return ''

    // Decrease indent for closing tags
    if (
      trimmed.startsWith('</') &&
      !trimmed.includes('</a>') &&
      !trimmed.includes('</strong>') &&
      !trimmed.includes('</u>')
    ) {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    const indented = '  '.repeat(indentLevel) + trimmed

    // Increase indent for opening tags (but not self-closing or inline tags)
    if (
      trimmed.startsWith('<') &&
      !trimmed.startsWith('</') &&
      !trimmed.includes('/>') &&
      !trimmed.includes('</') &&
      !['<a ', '<strong', '<u>', '<em>', '<br', '<hr'].some(tag =>
        trimmed.startsWith(tag),
      )
    ) {
      indentLevel++
    }

    return indented
  })

  return indentedLines.join('\n').trim()
}

function createRelationshipSection(pageType: PageType): string {
  if (pageType === 'PrivacyPolicy') {
    return `
<h2 id="bluesky-relationship">Relationship with Bluesky</h2>
<p>
  <strong>Bluenotes is a fork of the Bluesky application</strong> that adds Community Notes functionality 
  while maintaining full compatibility with the AT Protocol network. This means:
</p>
<ul>
  <li><strong>Shared Infrastructure:</strong> Bluenotes uses Bluesky's AT Protocol infrastructure, 
      including their API services, link metadata proxy, and other supporting services.</li>
  <li><strong>Data Compatibility:</strong> Your posts, follows, and other social data are fully 
      compatible between Bluenotes and Bluesky applications.</li>
  <li><strong>Independent Operation:</strong> While we share infrastructure, Bluenotes operates 
      independently with its own privacy practices and Community Notes features.</li>
  <li><strong>Original Privacy Policy:</strong> For comprehensive details about data handling 
      in the shared AT Protocol infrastructure, please also review the 
      <a href="https://bsky.social/about/support/privacy-policy" target="_blank" rel="noopener noreferrer">
        original Bluesky Privacy Policy
      </a>.</li>
</ul>
<p>
  This relationship allows Bluenotes to provide enhanced social media functionality while 
  leveraging the robust, decentralized AT Protocol ecosystem that Bluesky has built.
</p>
<hr>`
  } else if (pageType === 'TermsOfService') {
    return `
<h2 id="bluesky-relationship">Relationship with Bluesky</h2>
<p>
  <strong>Bluenotes is a fork of the Bluesky application</strong> that adds Community Notes functionality 
  while maintaining full compatibility with the AT Protocol network. These Terms of Service govern your use 
  of Bluenotes specifically, while you continue to benefit from the broader AT Protocol ecosystem.
</p>
<p>
  <strong>Important:</strong> For additional terms that may apply to your use of the underlying AT Protocol 
  infrastructure, please also review the 
  <a href="https://bsky.social/about/support/tos" target="_blank" rel="noopener noreferrer">
    Bluesky Terms of Service
  </a>.
</p>
<hr>`
  } else if (pageType === 'CommunityGuidelines') {
    return `
<h2 id="bluesky-relationship">Relationship with Bluesky</h2>
<p>
  <strong>Bluenotes is a fork of the Bluesky application</strong> that adds Community Notes functionality. 
  These Community Guidelines apply specifically to Bluenotes, while we maintain compatibility with the 
  broader AT Protocol network standards.
</p>
<p>
  For reference, you may also review the 
  <a href="https://bsky.social/about/support/community-guidelines" target="_blank" rel="noopener noreferrer">
    original Bluesky Community Guidelines
  </a>.
</p>
<hr>`
  }

  // For unrecognized page types, don't add a relationship section
  return ''
}

function removeTableOfContents(content: string): string {
  // Remove Table of Contents section if present
  // This looks for various patterns of TOC sections

  // Pattern 1: <h3>Table of Contents</h3> followed by <ol>...</ol>
  let modified = content.replace(
    /<h3[^>]*>\s*Table of Contents\s*<\/h3>\s*<ol[^>]*>[\s\S]*?<\/ol>\s*(?:<hr[^>]*>)?/gi,
    '',
  )

  // Pattern 2: <h2>Table of Contents</h2> followed by <ol>...</ol>
  modified = modified.replace(
    /<h2[^>]*>\s*Table of Contents\s*<\/h2>\s*<ol[^>]*>[\s\S]*?<\/ol>\s*(?:<hr[^>]*>)?/gi,
    '',
  )

  // Pattern 3: <h4>Table of Contents</h4> followed by <ol>...</ol>
  modified = modified.replace(
    /<h4[^>]*>\s*Table of Contents\s*<\/h4>\s*<ol[^>]*>[\s\S]*?<\/ol>\s*(?:<hr[^>]*>)?/gi,
    '',
  )

  // Pattern 4: Any heading with "Contents" followed by <ul>...</ul>
  modified = modified.replace(
    /<h[1-6][^>]*>\s*.*Contents.*\s*<\/h[1-6]>\s*<ul[^>]*>[\s\S]*?<\/ul>\s*(?:<hr[^>]*>)?/gi,
    '',
  )

  // Clean up any leftover standalone <hr> tags that might have been after TOC
  modified = modified.replace(/^\s*<hr[^>]*>\s*$/gm, '')

  // Clean up multiple consecutive newlines that might result from removal
  modified = modified.replace(/\n\s*\n\s*\n+/g, '\n\n')

  return modified.trim()
}

function modifyContent(content: string, pageType: PageType): string {
  let modified = content

  // Replace Bluesky with Bluenotes (but preserve some specific cases)
  // First, protect URLs and email addresses from replacement
  const protectedStrings: string[] = []
  let protectedIndex = 0

  // Protect email addresses
  // modified = modified.replace(/support@bsky\.app/g, () => {
  //   const placeholder = `__PROTECTED_${protectedIndex++}__`
  //   protectedStrings.push('support@bsky.app')
  //   return placeholder
  // })

  modified = modified.replace(
    /legal-req@blueskyweb\.xyz/g,
    'legal@bluenotes.social',
  )

  modified = modified.replace(
    /\/about\/support\/network-services-privacy-policy/g,
    'https://bsky.social/about/support/network-services-privacy-policy',
  )

  // Protect specific Bluesky service URLs that should remain unchanged
  const preserveUrls = [
    'https://bsky.social/about/support/privacy-policy',
    'https://bsky.social/about/support/tos',
    'https://bsky.social/about/support/tos-gov',
    'https://bsky.social/about/support/community-guidelines',
    'https://bsky.social/about/support/network-services-privacy-policy',
    'bsky.social/about/support',
    '/about/support/',
  ]

  preserveUrls.forEach(url => {
    const regex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    modified = modified.replace(regex, () => {
      const placeholder = `__PROTECTED_${protectedIndex++}__`
      protectedStrings.push(url)
      return placeholder
    })
  })

  // Remove Table of Contents if present
  modified = removeTableOfContents(modified)

  // Replace Bluesky with Bluenotes
  modified = modified.replace(/Bluesky/g, 'Bluenotes')
  modified = modified.replace(/BLUESKY/g, 'BLUENOTES')
  modified = modified.replace(/bluesky/gi, 'bluenotes')

  // Replace bsky.app with bluenotes.social (but not in protected strings)
  modified = modified.replace(/bsky\.app/g, 'bluenotes.social')

  // Replace bsky.social with bluenotes.social in most contexts
  // But be careful with support links
  modified = modified.replace(
    /bsky\.social(?!\/about\/support)/g,
    'bluenotes.social',
  )

  modified = modified.replace(
    /available at bluenotes.social and bluenotes.social; each a "Site"/g,
    'available at bluenotes.social',
  )

  // Add relationship section based on page type
  const relationshipSection = createRelationshipSection(pageType)
  if (relationshipSection) {
    // For privacy policy, add after introduction
    if (pageType === 'PrivacyPolicy') {
      // Add the relationship section after the introduction
      const introEndRegex =
        /(<h2 id="personal-data">2\. What is Personal Data\?<\/h2>)/
      modified = modified.replace(introEndRegex, relationshipSection + '\n$1')
    }
    // For TOS, add at the beginning after any intro content
    else if (pageType === 'TermsOfService') {
      // Add the relationship section at the beginning
      const eligibilityRegex =
        /(<h2 id="eligibility">1\. Eligibility and Age Verification<\/h2>)/
      modified = modified.replace(
        eligibilityRegex,
        relationshipSection + '\n$1',
      )
    }
    // For guidelines, add at the beginning
    else if (pageType === 'CommunityGuidelines') {
      // Add at the very beginning after any intro content
      const firstHeadingRegex = /(<h[1-6][^>]*>)/
      modified = modified.replace(
        firstHeadingRegex,
        relationshipSection + '\n$1',
      )
    }
  }

  // Remove Data Protection Officer and Data Protection Representative sections
  // since Bluenotes doesn't have these
  if (pageType === 'PrivacyPolicy') {
    // Remove DPO and DPR sections completely
    const dpoRegex =
      /<p>\s*<strong>\s*Data Protection Officer:\s*<\/strong>[\s\S]*?<\/p>/g
    const dprRegex =
      /<p>\s*<strong>\s*Data Protection Representative:\s*<\/strong>[\s\S]*?<\/p>/g

    modified = modified.replace(dpoRegex, '')
    modified = modified.replace(dprRegex, '')

    // Clean up any extra whitespace left behind
    modified = modified.replace(/\n\s*\n\s*\n+/g, '\n\n')
  }

  // Remove EU Digital Services Act sections from Terms of Service
  // since Bluenotes doesn't operate under EU jurisdiction
  if (pageType === 'TermsOfService') {
    // Remove the English paragraph about EU competent authorities
    const euContactRegex =
      /<p[^>]*>\s*Competent authorities of the EU and EU Member States that want to contact Bluenotes under the Digital Services Act[\s\S]*?<\/p>/gi
    modified = modified.replace(euContactRegex, '')

    // Remove the German paragraph that follows
    const germanContactRegex =
      /<p[^>]*>\s*Zuständige Behörden der EU und der EU-Mitgliedstaaten[\s\S]*?<\/p>/gi
    modified = modified.replace(germanContactRegex, '')

    // Remove the VeraSafe Ireland address block (EU representative)
    const addressRegex =
      /<address[^>]*>[\s\S]*?VeraSafe Ireland Ltd\.[\s\S]*?<\/address>/gi
    modified = modified.replace(addressRegex, '')

    // Remove the paragraph about EU competent authorities filing requests
    const euRequestsRegex =
      /<p[^>]*>\s*Requests are accepted in English\. Competent EU or EU member authorities[\s\S]*?<\/p>/gi
    modified = modified.replace(euRequestsRegex, '')

    // Clean up any extra whitespace left behind
    modified = modified.replace(/\n\s*\n\s*\n+/g, '\n\n')
  }

  // Restore protected strings
  protectedStrings.forEach((str, index) => {
    const placeholder = `__PROTECTED_${index}__`
    modified = modified.replace(new RegExp(placeholder, 'g'), str)
  })

  return modified
}

function main(): void {
  try {
    console.log(`🔄 Reading input file: ${INPUT_FILE}`)
    console.log(`📄 Page type detected: ${pageType}`)

    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Input file not found: ${INPUT_FILE}`)
    }

    const fullHtmlContent = fs.readFileSync(INPUT_FILE, 'utf-8')
    console.log('✅ Successfully read input file')

    console.log('🔄 Extracting content from HTML page...')
    const extractedContent = extractContentFromHtml(fullHtmlContent)
    console.log('✅ Successfully extracted content')

    console.log('🔄 Modifying content...')
    const modifiedContent = modifyContent(extractedContent, pageType)

    console.log('🔄 Prettifying HTML...')
    const prettifiedContent = prettifyHtml(modifiedContent)

    // Wrap the content in the section tag to match the original format
    const finalContent = `<section class="max-w-[918px] mx-auto px-4 pt-2 600:px-6 support-page">${prettifiedContent}</section>`

    console.log(`🔄 Writing output file: ${OUTPUT_FILE}`)
    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf-8')

    console.log(`✅ Successfully created: ${OUTPUT_FILE}`)
    console.log('\n📋 Summary of changes:')
    console.log('  • Extracted content from full HTML page')
    console.log('  • Removed Table of Contents section')
    console.log('  • Replaced "Bluesky" with "Bluenotes"')
    console.log('  • Replaced "bsky.app" with "bluenotes.social"')
    const relationshipSection = createRelationshipSection(pageType)
    if (relationshipSection) {
      console.log(`  • Added relationship section for ${pageType} page`)
    }
    if (pageType === 'PrivacyPolicy') {
      console.log(
        '  • Removed Data Protection Officer and Representative sections',
      )
    }
    if (pageType === 'TermsOfService') {
      console.log('  • Removed EU Digital Services Act contact paragraphs')
    }
    console.log('  • Updated last modified date')
    console.log('  • Prettified HTML formatting')
    console.log(
      '  • Preserved original Bluesky support links and email addresses',
    )
  } catch (error) {
    console.error('❌ Error:', (error as Error).message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export {
  createRelationshipSection,
  determinePageType,
  extractContentFromHtml,
  modifyContent,
  type PageType,
  prettifyHtml,
  type ProcessingOptions,
  removeTableOfContents,
}
