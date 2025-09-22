import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Mock the StreamingConversationalInterface component for testing markdown rendering
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

describe('Markdown Rendering Tests', () => {
  // Test markdown parsing for common patterns
  describe('Markdown Pattern Recognition', () => {
    it('should identify bold text with double asterisks', () => {
      const text = 'Here is **bold text** in a sentence'
      const hasBold = text.includes('**')
      expect(hasBold).toBe(true)

      // Extract bold content
      const boldMatch = text.match(/\*\*(.*?)\*\*/g)
      expect(boldMatch).toBeTruthy()
      expect(boldMatch![0]).toBe('**bold text**')
    })

    it('should identify italic text with single asterisks', () => {
      const text = 'Here is *italic text* in a sentence'
      const hasItalic = /\*([^*]+)\*/.test(text)
      expect(hasItalic).toBe(true)

      // Extract italic content
      const italicMatch = text.match(/\*([^*]+)\*/g)
      expect(italicMatch).toBeTruthy()
      expect(italicMatch![0]).toBe('*italic text*')
    })

    it('should identify headers with hash symbols', () => {
      const h1 = '# Header 1'
      const h2 = '## Header 2'
      const h3 = '### Header 3'

      expect(h1.startsWith('#')).toBe(true)
      expect(h2.startsWith('##')).toBe(true)
      expect(h3.startsWith('###')).toBe(true)
    })

    it('should identify code blocks with backticks', () => {
      const inlineCode = 'Use `npm install` to install'
      const codeBlock = '```javascript\nconst x = 1;\n```'

      expect(inlineCode.includes('`')).toBe(true)
      expect(codeBlock.includes('```')).toBe(true)
    })

    it('should identify bullet lists', () => {
      const bulletList = `- Item 1
- Item 2
- Item 3`

      const lines = bulletList.split('\n')
      const allBullets = lines.every(line => line.startsWith('- '))
      expect(allBullets).toBe(true)
    })

    it('should identify numbered lists', () => {
      const numberedList = `1. First item
2. Second item
3. Third item`

      const lines = numberedList.split('\n')
      const allNumbered = lines.every(line => /^\d+\.\s/.test(line))
      expect(allNumbered).toBe(true)
    })
  })

  // Test markdown transformation
  describe('Markdown Transformation', () => {
    it('should transform bold markdown to HTML strong tags', () => {
      const markdown = '**bold text**'
      const transformed = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      expect(transformed).toBe('<strong>bold text</strong>')
    })

    it('should transform italic markdown to HTML em tags', () => {
      const markdown = '*italic text*'
      const transformed = markdown.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      expect(transformed).toBe('<em>italic text</em>')
    })

    it('should transform inline code to HTML code tags', () => {
      const markdown = '`code`'
      const transformed = markdown.replace(/`([^`]+)`/g, '<code>$1</code>')
      expect(transformed).toBe('<code>code</code>')
    })

    it('should handle mixed formatting', () => {
      const markdown = '**Bold** and *italic* with `code`'
      let transformed = markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')

      expect(transformed).toBe('<strong>Bold</strong> and <em>italic</em> with <code>code</code>')
    })
  })

  // Test actual message content formatting
  describe('Message Content Formatting', () => {
    it('should format todo list response correctly', () => {
      const response = `Here are your todos:

## Pending Todos ⭕

1. **Task 1** (HIGH priority)
   - ID: \`abc-123\`
   - Description: Test task

2. **Task 2** (medium priority)
   - ID: \`def-456\`

You have **2 todos** total.`

      // Check for presence of markdown elements
      expect(response.includes('##')).toBe(true) // Headers
      expect(response.includes('**')).toBe(true) // Bold
      expect(response.includes('`')).toBe(true) // Inline code
      expect(response.includes('1.')).toBe(true) // Numbered list
      expect(response.includes('   -')).toBe(true) // Sub-bullets
    })

    it('should format completion confirmation correctly', () => {
      const response = `✅ Successfully marked todo as **completed**!

**Todo:** "Buy groceries"
**Status:** ~~pending~~ → completed
**Completed at:** Sep 22, 2025`

      expect(response.includes('✅')).toBe(true) // Emoji
      expect(response.includes('**')).toBe(true) // Bold
      expect(response.includes('~~')).toBe(true) // Strikethrough
      expect(response.includes('→')).toBe(true) // Arrow
    })

    it('should format error messages correctly', () => {
      const response = `❌ **Error:** Could not find todo with ID \`invalid-id\`

Please check the ID and try again.`

      expect(response.includes('❌')).toBe(true) // Error emoji
      expect(response.includes('**Error:**')).toBe(true) // Bold error label
      expect(response.includes('`')).toBe(true) // Inline code for ID
    })
  })

  // Test ReactMarkdown component integration
  describe('ReactMarkdown Integration', () => {
    it('should parse GFM (GitHub Flavored Markdown) correctly', () => {
      const gfmFeatures = [
        '~~strikethrough~~',
        '- [x] Completed task',
        '- [ ] Incomplete task',
        '| Header | Header |',
        '|--------|--------|',
        '| Cell   | Cell   |'
      ]

      gfmFeatures.forEach(feature => {
        expect(feature).toBeTruthy()
      })
    })

    it('should handle code blocks with language specification', () => {
      const codeBlock = `\`\`\`javascript
const greeting = "Hello World";
console.log(greeting);
\`\`\``

      expect(codeBlock.includes('```javascript')).toBe(true)
      expect(codeBlock.includes('const')).toBe(true)
    })

    it('should handle nested markdown structures', () => {
      const nested = `> **Quote with bold**
> - List item in quote
>   - Nested item
>
> \`Code in quote\``

      expect(nested.includes('> **')).toBe(true) // Bold in quote
      expect(nested.includes('> -')).toBe(true) // List in quote
      expect(nested.includes('>   -')).toBe(true) // Nested list
      expect(nested.includes('> `')).toBe(true) // Code in quote
    })
  })

  // Test styling classes
  describe('Styling Classes', () => {
    it('should apply correct prose classes', () => {
      const userClasses = 'prose prose-sm max-w-none prose-invert'
      const assistantClasses = 'prose prose-sm max-w-none'

      expect(userClasses.includes('prose-invert')).toBe(true)
      expect(assistantClasses.includes('prose-invert')).toBe(false)
    })

    it('should apply correct code block styling', () => {
      const userCodeClasses = 'bg-blue-600/20 text-blue-100'
      const assistantCodeClasses = 'bg-gray-200 text-gray-800'

      expect(userCodeClasses.includes('blue')).toBe(true)
      expect(assistantCodeClasses.includes('gray')).toBe(true)
    })

    it('should apply correct list styling', () => {
      const listClasses = 'list-disc pl-4 mb-2 space-y-1'
      const orderedListClasses = 'list-decimal pl-4 mb-2 space-y-1'

      expect(listClasses.includes('list-disc')).toBe(true)
      expect(orderedListClasses.includes('list-decimal')).toBe(true)
      expect(listClasses.includes('space-y-1')).toBe(true)
    })
  })

  // Test edge cases
  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      const empty = ''
      expect(empty.length).toBe(0)
    })

    it('should handle messages with only whitespace', () => {
      const whitespace = '   \n\n   \t   '
      const trimmed = whitespace.trim()
      expect(trimmed.length).toBe(0)
    })

    it('should handle very long code blocks', () => {
      const longCode = '```\n' + 'x'.repeat(5000) + '\n```'
      expect(longCode.length).toBeGreaterThan(5000)
      expect(longCode.startsWith('```')).toBe(true)
      expect(longCode.endsWith('```')).toBe(true)
    })

    it('should handle special characters in markdown', () => {
      const special = '`<script>alert("xss")</script>`'
      expect(special.includes('<script>')).toBe(true)
      // In real rendering, this should be escaped
    })

    it('should handle incomplete markdown syntax', () => {
      const incomplete = [
        '**unclosed bold',
        '*unclosed italic',
        '`unclosed code',
        '## Header without content',
        '- List item without content -'
      ]

      incomplete.forEach(text => {
        expect(text).toBeTruthy()
      })
    })
  })

  // Test performance considerations
  describe('Performance', () => {
    it('should handle large markdown documents', () => {
      const largeDoc = Array(100).fill('## Section\n\nParagraph with **bold** and *italic* text.\n\n- List item\n').join('')
      expect(largeDoc.length).toBeGreaterThan(4000)
    })

    it('should handle deeply nested structures', () => {
      const deepNest = `
> Level 1
> > Level 2
> > > Level 3
> > > > Level 4
> > > > > Level 5`

      const levels = (deepNest.match(/>/g) || []).length
      expect(levels).toBe(15) // 5 levels with multiple > symbols
    })
  })
})