import { useState, useCallback } from 'react';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface ExecutionOptions {
  language?: string;
  timeout?: number;
  workingDirectory?: string;
}

export const useCodeExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

  const executeCode = useCallback(async (
    code: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> => {
    setIsExecuting(true);
    setLastResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/execute/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: options.language || 'javascript',
          timeout: options.timeout || 30000,
          workingDirectory: options.workingDirectory || '/tmp'
        }),
      });

      const result = await response.json();
      
      setLastResult(result);
      return result;
    } catch (error: any) {
      const errorResult: ExecutionResult = {
        success: false,
        output: '',
        error: error.message || 'Execution failed'
      };
      
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const executeFile = useCallback(async (
    filename: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> => {
    setIsExecuting(true);
    setLastResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/execute/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          language: options.language || 'javascript',
          timeout: options.timeout || 30000,
          workingDirectory: options.workingDirectory || '/tmp'
        }),
      });

      const result = await response.json();
      
      setLastResult(result);
      return result;
    } catch (error: any) {
      const errorResult: ExecutionResult = {
        success: false,
        output: '',
        error: error.message || 'File execution failed'
      };
      
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const getLanguageFromFilename = useCallback((filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[ext || ''] || 'javascript';
  }, []);

  return {
    isExecuting,
    lastResult,
    executeCode,
    executeFile,
    getLanguageFromFilename
  };
};
