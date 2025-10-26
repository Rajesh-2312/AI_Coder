import { AgentStatus } from './WebSocketAgent'

export interface CodeAnalysisResult {
  syntax: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
  complexity: {
    cyclomatic: number
    cognitive: number
    maintainability: number
  }
  metrics: {
    linesOfCode: number
    functions: number
    classes: number
    imports: number
  }
  suggestions: string[]
  security: {
    vulnerabilities: string[]
    bestPractices: string[]
  }
}

export class CodeAnalysisAgent {
  private status: AgentStatus

  constructor() {
    this.status = {
      name: 'CodeAnalysisAgent',
      status: 'active',
      lastActivity: new Date(),
      connections: 0
    }
  }

  async analyzeCode(code: string, language: string = 'typescript'): Promise<CodeAnalysisResult> {
    this.status.lastActivity = new Date()
    
    try {
      // Basic syntax analysis
      const syntax = this.analyzeSyntax(code, language)
      
      // Complexity analysis
      const complexity = this.analyzeComplexity(code)
      
      // Code metrics
      const metrics = this.calculateMetrics(code)
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(code, language)
      
      // Security analysis
      const security = this.analyzeSecurity(code, language)
      
      return {
        syntax,
        complexity,
        metrics,
        suggestions,
        security
      }
    } catch (error) {
      console.error('Code analysis error:', error)
      throw new Error('Failed to analyze code')
    }
  }

  private analyzeSyntax(code: string, language: string) {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic syntax checks
    if (language === 'typescript' || language === 'javascript') {
      // Check for missing semicolons
      const lines = code.split('\n')
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('//')) {
          warnings.push(`Line ${index + 1}: Consider adding semicolon`)
        }
      })
      
      // Check for console.log statements
      if (code.includes('console.log')) {
        warnings.push('Consider removing console.log statements in production code')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private analyzeComplexity(code: string) {
    const lines = code.split('\n')
    let cyclomaticComplexity = 1
    let cognitiveComplexity = 0
    
    // Simple complexity calculation
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?']
    
    lines.forEach(line => {
      complexityKeywords.forEach(keyword => {
        const matches = (line.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length
        cyclomaticComplexity += matches
        cognitiveComplexity += matches * 2
      })
    })
    
    const maintainability = Math.max(0, 100 - (cyclomaticComplexity * 5) - (cognitiveComplexity * 2))
    
    return {
      cyclomatic: cyclomaticComplexity,
      cognitive: cognitiveComplexity,
      maintainability: Math.round(maintainability)
    }
  }

  private calculateMetrics(code: string) {
    const lines = code.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim().length > 0)
    
    const functions = (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>/g) || []).length
    const classes = (code.match(/class\s+\w+/g) || []).length
    const imports = (code.match(/import\s+.*from|require\s*\(/g) || []).length
    
    return {
      linesOfCode: nonEmptyLines.length,
      functions,
      classes,
      imports
    }
  }

  private generateSuggestions(code: string, language: string): string[] {
    const suggestions: string[] = []
    
    if (language === 'typescript' || language === 'javascript') {
      // Check for TypeScript usage
      if (language === 'javascript' && code.includes('function')) {
        suggestions.push('Consider migrating to TypeScript for better type safety')
      }
      
      // Check for modern syntax
      if (code.includes('var ')) {
        suggestions.push('Use let or const instead of var for better scoping')
      }
      
      // Check for arrow functions
      if (code.includes('function(') && !code.includes('=>')) {
        suggestions.push('Consider using arrow functions for shorter syntax')
      }
      
      // Check for async/await
      if (code.includes('.then(') && !code.includes('async')) {
        suggestions.push('Consider using async/await instead of .then() for better readability')
      }
    }
    
    return suggestions
  }

  private analyzeSecurity(code: string, language: string) {
    const vulnerabilities: string[] = []
    const bestPractices: string[] = []
    
    // Check for common security issues
    if (code.includes('eval(')) {
      vulnerabilities.push('Avoid using eval() as it can execute arbitrary code')
    }
    
    if (code.includes('innerHTML') && !code.includes('textContent')) {
      vulnerabilities.push('Be careful with innerHTML to prevent XSS attacks')
    }
    
    if (code.includes('localStorage') || code.includes('sessionStorage')) {
      bestPractices.push('Consider encrypting sensitive data before storing in browser storage')
    }
    
    return {
      vulnerabilities,
      bestPractices
    }
  }

  getStatus(): AgentStatus {
    return { ...this.status }
  }
}

