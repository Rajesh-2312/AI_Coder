import { useState, useEffect, useCallback, useRef } from 'react';

interface TerminalOutput {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'command';
  content: string;
  timestamp: Date;
  executionId?: string;
  exitCode?: number;
}

interface CommandExecution {
  id: string;
  command: string;
  args: string[];
  workingDirectory?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output: TerminalOutput[];
}

interface TerminalStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
  lastCommand?: string;
}

interface SandboxStatus {
  activeProcesses: number;
  sandboxDir: string;
  allowedCommands: string[];
}

export const useTerminal = (backendUrl: string = 'http://localhost:3000') => {
  const [outputs, setOutputs] = useState<TerminalOutput[]>([]);
  const [currentExecution, setCurrentExecution] = useState<CommandExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TerminalStats>({
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageExecutionTime: 0
  });
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>({
    activeProcesses: 0,
    sandboxDir: '',
    allowedCommands: []
  });

  const executionHistory = useRef<CommandExecution[]>([]);
  const apiUrl = `${backendUrl}/api/execute`;

  // Generic API call function
  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    }
  }, [apiUrl]);

  // Add output to terminal
  const addOutput = useCallback((output: Omit<TerminalOutput, 'id' | 'timestamp'>) => {
    const newOutput: TerminalOutput = {
      id: `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...output
    };
    
    setOutputs(prev => [...prev, newOutput]);
    return newOutput;
  }, []);

  // Execute command
  const executeCommand = useCallback(async (
    command: string,
    args: string[] = [],
    workingDirectory?: string
  ) => {
    if (isExecuting) {
      setError('Another command is already running');
      return;
    }

    setIsExecuting(true);
    setError(null);

    // Create execution record
    const execution: CommandExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command,
      args,
      workingDirectory,
      status: 'running',
      startTime: new Date(),
      output: []
    };

    setCurrentExecution(execution);
    executionHistory.current.push(execution);

    // Add command to output
    addOutput({
      type: 'command',
      content: `$ ${command} ${args.join(' ')}`,
      executionId: execution.id
    });

    try {
      const result = await apiCall<{
        success: boolean;
        stdout: string;
        stderr: string;
        exitCode: number;
        executionId: string;
      }>('/', {
        method: 'POST',
        body: JSON.stringify({
          command,
          args,
          workingDirectory
        })
      });

      // Update execution with results
      execution.status = result.success ? 'completed' : 'failed';
      execution.endTime = new Date();
      execution.exitCode = result.exitCode;

      // Add outputs
      if (result.stdout) {
        addOutput({
          type: 'stdout',
          content: result.stdout,
          executionId: result.executionId,
          exitCode: result.exitCode
        });
      }

      if (result.stderr) {
        addOutput({
          type: 'stderr',
          content: result.stderr,
          executionId: result.executionId,
          exitCode: result.exitCode
        });
      }

      // Add completion message
      addOutput({
        type: 'system',
        content: `Command completed with exit code ${result.exitCode}`,
        executionId: result.executionId,
        exitCode: result.exitCode
      });

      // Update stats
      setStats(prev => {
        const newStats = { ...prev };
        newStats.totalCommands++;
        
        if (result.success) {
          newStats.successfulCommands++;
        } else {
          newStats.failedCommands++;
        }
        
        newStats.lastCommand = command;
        
        // Calculate average execution time
        const executionTime = execution.endTime!.getTime() - execution.startTime.getTime();
        const totalTime = (prev.averageExecutionTime * (prev.totalCommands - 1)) + executionTime;
        newStats.averageExecutionTime = totalTime / newStats.totalCommands;
        
        return newStats;
      });

      setCurrentExecution(null);
      return result;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      
      addOutput({
        type: 'stderr',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionId: execution.id
      });

      setStats(prev => ({
        ...prev,
        totalCommands: prev.totalCommands + 1,
        failedCommands: prev.failedCommands + 1,
        lastCommand: command
      }));

      setCurrentExecution(null);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, apiCall, addOutput]);

  // Kill active process
  const killProcess = useCallback(async (executionId: string) => {
    try {
      await apiCall('/kill', {
        method: 'POST',
        body: JSON.stringify({ executionId })
      });

      // Update current execution
      if (currentExecution?.id === executionId) {
        currentExecution.status = 'cancelled';
        currentExecution.endTime = new Date();
        setCurrentExecution(null);
        setIsExecuting(false);
      }

      addOutput({
        type: 'system',
        content: `Process ${executionId} killed`,
        executionId
      });

    } catch (error) {
      console.error('Failed to kill process:', error);
      throw error;
    }
  }, [apiCall, currentExecution, addOutput]);

  // Kill all processes
  const killAllProcesses = useCallback(async () => {
    try {
      await apiCall('/kill-all', {
        method: 'POST'
      });

      if (currentExecution) {
        currentExecution.status = 'cancelled';
        currentExecution.endTime = new Date();
        setCurrentExecution(null);
        setIsExecuting(false);
      }

      addOutput({
        type: 'system',
        content: 'All processes killed'
      });

    } catch (error) {
      console.error('Failed to kill all processes:', error);
      throw error;
    }
  }, [apiCall, currentExecution, addOutput]);

  // Get sandbox status
  const getSandboxStatus = useCallback(async () => {
    try {
      const result = await apiCall<SandboxStatus>('/status');
      setSandboxStatus(result);
      return result;
    } catch (error) {
      console.error('Failed to get sandbox status:', error);
      throw error;
    }
  }, [apiCall]);

  // Clear terminal output
  const clearOutput = useCallback(() => {
    setOutputs([]);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get execution history
  const getExecutionHistory = useCallback(() => {
    return executionHistory.current;
  }, []);

  // Get execution by ID
  const getExecutionById = useCallback((id: string) => {
    return executionHistory.current.find(exec => exec.id === id);
  }, []);

  // Common command shortcuts
  const shortcuts = {
    ls: (path?: string) => executeCommand('ls', path ? [path] : []),
    pwd: () => executeCommand('pwd'),
    cd: (path: string) => executeCommand('cd', [path]),
    cat: (file: string) => executeCommand('cat', [file]),
    mkdir: (path: string) => executeCommand('mkdir', [path]),
    touch: (file: string) => executeCommand('touch', [file]),
    rm: (path: string) => executeCommand('rm', [path]),
    npm: (args: string[]) => executeCommand('npm', args),
    git: (args: string[]) => executeCommand('git', args),
    node: (file: string) => executeCommand('node', [file])
  };

  // Auto-load sandbox status on mount
  useEffect(() => {
    getSandboxStatus();
  }, [getSandboxStatus]);

  // Periodic status updates
  useEffect(() => {
    const interval = setInterval(() => {
      getSandboxStatus();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [getSandboxStatus]);

  return {
    // State
    outputs,
    currentExecution,
    isExecuting,
    error,
    stats,
    sandboxStatus,
    
    // Command execution
    executeCommand,
    killProcess,
    killAllProcesses,
    
    // Utilities
    clearOutput,
    clearError,
    getExecutionHistory,
    getExecutionById,
    getSandboxStatus,
    
    // Shortcuts
    shortcuts,
    
    // Helpers
    getLastOutput: () => outputs[outputs.length - 1],
    getOutputCount: () => outputs.length,
    getSuccessfulCommands: () => stats.successfulCommands,
    getFailedCommands: () => stats.failedCommands,
    getSuccessRate: () => {
      if (stats.totalCommands === 0) return 0;
      return (stats.successfulCommands / stats.totalCommands) * 100;
    }
  };
};

