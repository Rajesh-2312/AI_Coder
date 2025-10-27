import { errorDetector, type DetectedError } from './errorDetector'

export interface AutoFix {
  action: string
  command?: string
  file?: string
  content?: string
  description: string
  confidence: number
}

class AIErrorFixer {
  private readonly AI_API_URL = 'http://localhost:3000/api/ai/auto-fix'

  /**
   * Detect errors and get AI-powered fixes
   */
  async detectAndFix(terminalOutput: string[]): Promise<AutoFix[]> {
    const errors = errorDetector.detectErrors(terminalOutput)
    
    if (errors.length === 0) {
      return []
    }

    console.log(`🔍 Detected ${errors.length} error(s), requesting AI fix...`)

    // Send errors to AI for analysis
    const fixes = await this.queryAIForFixes(errors, terminalOutput)
    
    return fixes
  }

  /**
   * Query AI model for fixes
   */
  private async queryAIForFixes(errors: DetectedError[], context: string[]): Promise<AutoFix[]> {
    try {
      const response = await fetch(this.AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errors: errors.map(e => ({
            type: e.type,
            file: e.file,
            message: e.message,
            suggestion: e.suggestion
          })),
          context: context.slice(-50) // Last 50 lines for context
        })
      })

      if (!response.ok) {
        console.warn('AI Auto-fix API not available, using fallback fixes')
        return this.generateFallbackFixes(errors)
      }

      const data = await response.json()
      
      if (data.success && data.fixes && Array.isArray(data.fixes)) {
        console.log('✅ Received AI-powered fixes:', data.fixes.length)
        return data.fixes
      }

      return this.generateFallbackFixes(errors)
    } catch (error) {
      console.error('AI Auto-fix API Error:', error)
      return this.generateFallbackFixes(errors)
    }
  }

  /**
   * Generate fallback fixes based on error patterns
   */
  private generateFallbackFixes(errors: DetectedError[]): AutoFix[] {
    const fixes: AutoFix[] = []

    for (const error of errors) {
      switch (error.type) {
        case 'dependency':
          // Extract module name
          const moduleMatch = error.message.match(/Missing module: (.+)/)
          if (moduleMatch) {
            fixes.push({
              action: 'install',
              command: `npm install ${moduleMatch[1]}`,
              description: `Install missing dependency: ${moduleMatch[1]}`,
              confidence: 0.9
            })
          } else {
            fixes.push({
              action: 'install',
              command: 'npm install',
              description: 'Install missing dependencies',
              confidence: 0.7
            })
          }
          break

        case 'typescript':
          if (error.message.includes('Cannot find name')) {
            fixes.push({
              action: 'code',
              description: 'Add missing import or variable declaration',
              confidence: 0.6
            })
          } else if (error.message.includes('already exists')) {
            fixes.push({
              action: 'code',
              description: 'Remove duplicate declaration',
              confidence: 0.8
            })
          }
          break

        case 'build':
          fixes.push({
            action: 'build',
            command: 'npm run build',
            description: 'Rebuild project after fixes',
            confidence: 0.5
          })
          break

        case 'syntax':
          if (error.file) {
            fixes.push({
              action: 'file',
              file: error.file,
              description: 'Fix syntax error in file',
              confidence: 0.7
            })
          }
          break

        case 'runtime':
          if (error.message.includes('Port already in use')) {
            fixes.push({
              action: 'command',
              command: 'netstat -ano | findstr :3000',
              description: 'Find and kill process using port',
              confidence: 0.8
            })
          }
          break
      }
    }

    return fixes
  }

  /**
   * Execute a fix
   */
  async executeFix(fix: AutoFix): Promise<{ success: boolean; output: string }> {
    console.log(`🔧 Executing fix: ${fix.description}`)

    switch (fix.action) {
      case 'install':
      case 'command':
        if (fix.command) {
          return await this.executeCommand(fix.command)
        }
        break

      case 'file':
        if (fix.file && fix.content) {
          return await this.updateFile(fix.file, fix.content)
        }
        break

      case 'code':
        return {
          success: false,
          output: `${fix.description} - Please review the code manually`
        }

      default:
        return {
          success: false,
          output: `Unknown fix action: ${fix.action}`
        }
    }

    return { success: false, output: 'Fix execution failed' }
  }

  /**
   * Execute terminal command
   */
  private async executeCommand(command: string): Promise<{ success: boolean; output: string }> {
    try {
      const response = await fetch('http://localhost:3000/api/execute/ai-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command,
          workingDirectory: 'frontend',
          timeout: 60000,
          description: 'Auto-fix command'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        return { success: true, output: data.stdout || 'Command executed successfully' }
      } else {
        return { success: false, output: data.stderr || data.error || 'Command failed' }
      }
    } catch (error) {
      return { success: false, output: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update file with fix
   */
  private async updateFile(filePath: string, content: string): Promise<{ success: boolean; output: string }> {
    try {
      const response = await fetch('http://localhost:3000/api/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePath,
          content
        })
      })

      const data = await response.json()
      
      if (data.success) {
        return { success: true, output: `File ${filePath} updated successfully` }
      } else {
        return { success: false, output: 'Failed to update file' }
      }
    } catch (error) {
      return { success: false, output: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const aiErrorFixer = new AIErrorFixer()
export default aiErrorFixer

