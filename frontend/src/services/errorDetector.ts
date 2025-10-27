export interface DetectedError {
  type: 'typescript' | 'runtime' | 'build' | 'dependency' | 'syntax' | 'unknown'
  file?: string
  line?: number
  column?: number
  message: string
  suggestion?: string
}

class ErrorDetector {
  detectErrors(terminalOutput: string[]): DetectedError[] {
    const errors: DetectedError[] = []

    for (const line of terminalOutput) {
      // TypeScript errors
      if (line.includes('error TS')) {
        const match = line.match(/error TS(\d+):\s*(.+)/)
        if (match) {
          errors.push({
            type: 'typescript',
            message: match[2],
            suggestion: this.getTypeScriptFix(match[1])
          })
        }
      }

      // File not found errors
      if (line.includes('Error: ENOENT') || line.includes('Cannot find module')) {
        const moduleMatch = line.match(/Cannot find module ['"](.+?)['"]/)
        errors.push({
          type: 'dependency',
          message: `Missing module: ${moduleMatch ? moduleMatch[1] : 'unknown'}`,
          suggestion: 'Run: npm install'
        })
      }

      // TypeScript JSX errors
      if (line.includes('Cannot use JSX')) {
        errors.push({
          type: 'syntax',
          message: 'JSX syntax error',
          suggestion: 'Ensure file has .tsx extension and proper React imports'
        })
        const fileMatch = line.match(/\((\d+),(\d+)\):/)
        if (fileMatch) {
          errors[errors.length - 1].line = parseInt(fileMatch[1])
          errors[errors.length - 1].column = parseInt(fileMatch[2])
        }
      }

      // Build errors
      if (line.includes('Build failed') || line.includes('failed to compile')) {
        errors.push({
          type: 'build',
          message: 'Build compilation failed',
          suggestion: 'Check TypeScript errors above'
        })
      }

      // Import errors
      if (line.includes('Module not found') || line.includes('TS2307')) {
        errors.push({
          type: 'dependency',
          message: line,
          suggestion: 'Install missing dependency or fix import path'
        })
      }

      // Port already in use
      if (line.includes('EADDRINUSE')) {
        errors.push({
          type: 'runtime',
          message: 'Port already in use',
          suggestion: 'Another process is using this port. Kill it or use a different port.'
        })
      }
    }

    return errors
  }

  private getTypeScriptFix(errorCode: string): string {
    const fixes: Record<string, string> = {
      '2307': 'Module not found - Install dependency or fix import',
      '2304': 'Cannot find name - Add import or define variable',
      '7030': 'Not all code paths return - Add return statements',
      '2322': 'Type mismatch - Fix type annotations',
      '2564': 'Property not initialized - Add initialization',
      '2393': 'Duplicate implementation - Remove duplicate code',
      '2614': 'Module has no exported member - Fix import statement',
      '6133': 'Variable declared but never used - Remove unused variable',
      '2345': 'Type not assignable - Fix type compatibility'
    }

    return fixes[errorCode] || 'Review TypeScript error and fix accordingly'
  }

  async analyzeAndSuggestFixes(errors: DetectedError[]): Promise<Map<string, string[]>> {
    const fixes = new Map<string, string[]>()

    for (const error of errors) {
      const suggestions: string[] = []

      switch (error.type) {
        case 'dependency':
          suggestions.push(`npm install ${this.extractModuleName(error.message)}`)
          break
        case 'typescript':
          suggestions.push(error.suggestion || 'Fix TypeScript error')
          break
        case 'syntax':
          suggestions.push('Add React import: import React from "react"')
          suggestions.push('Ensure file has .tsx extension')
          break
        case 'runtime':
          suggestions.push('Check if port is in use and kill the process')
          suggestions.push('Use a different port')
          break
        case 'build':
          suggestions.push('Fix all TypeScript errors first')
          suggestions.push('Ensure all imports are correct')
          break
      }

      fixes.set(error.file || 'unknown', suggestions)
    }

    return fixes
  }

  private extractModuleName(message: string): string {
    const match = message.match(/module ['"](.+?)['"]/)
    if (match) {
      const module = match[1]
      // Extract just the package name
      const parts = module.split('/')
      return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
    }
    return ''
  }

  generateFixPlan(errors: DetectedError[]): string[] {
    const fixSteps: string[] = []

    for (const error of errors) {
      switch (error.type) {
        case 'dependency':
          fixSteps.push(`Install missing dependency: ${this.extractModuleName(error.message)}`)
          break
        case 'typescript':
          fixSteps.push(`Fix TypeScript error: ${error.message.substring(0, 100)}`)
          break
        case 'syntax':
          fixSteps.push('Fix JSX syntax by adding React import and .tsx extension')
          break
        case 'build':
          fixSteps.push('Review and fix all compilation errors')
          break
        case 'runtime':
          fixSteps.push('Resolve port conflict or runtime error')
          break
      }
    }

    return fixSteps
  }
}

export const errorDetector = new ErrorDetector()
export default errorDetector

