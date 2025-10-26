import sandbox from './sandbox'

/**
 * Test file demonstrating Secure Sandbox usage
 */

async function testSandbox() {
  console.log('🧪 Testing Secure Sandbox...\n')

  // Test 1: Basic command execution
  console.log('1️⃣ Testing Basic Command Execution...')
  try {
    const result = await sandbox.runCommand('echo', ['Hello, World!'])
    console.log('Result:', result)
    console.log('')
  } catch (error) {
    console.error('Error:', error.message)
    console.log('')
  }

  // Test 2: Command with streaming output
  console.log('2️⃣ Testing Streaming Output...')
  try {
    const result = await sandbox.runCommand(
      'node',
      ['-e', 'console.log("Line 1"); console.log("Line 2"); console.log("Line 3");'],
      (data) => {
        console.log(`[${data.type}] ${data.content.trim()}`)
      }
    )
    console.log('Streaming Result:', result)
    console.log('')
  } catch (error) {
    console.error('Error:', error.message)
    console.log('')
  }

  // Test 3: Unsafe command blocking
  console.log('3️⃣ Testing Unsafe Command Blocking...')
  try {
    const result = await sandbox.runCommand('rm', ['-rf', '/'])
    console.log('Result:', result)
  } catch (error) {
    console.log('✅ Blocked unsafe command:', error.message)
  }
  console.log('')

  // Test 4: Command timeout
  console.log('4️⃣ Testing Command Timeout...')
  try {
    const result = await sandbox.runCommand(
      'node',
      ['-e', 'setTimeout(() => console.log("Done"), 2000)'],
      undefined,
      { timeout: 1000 } // 1 second timeout
    )
    console.log('Result:', result)
  } catch (error) {
    console.log('✅ Command timed out:', error.message)
  }
  console.log('')

  // Test 5: Process cancellation
  console.log('5️⃣ Testing Process Cancellation...')
  try {
    const processPromise = sandbox.runCommand(
      'node',
      ['-e', 'setTimeout(() => console.log("Done"), 5000)'],
      (data) => {
        console.log(`[${data.type}] ${data.content.trim()}`)
      }
    )

    // Cancel after 1 second
    setTimeout(() => {
      const status = sandbox.getStatus()
      if (status.processIds.length > 0) {
        const killed = sandbox.killProcess(status.processIds[0])
        console.log('Process killed:', killed)
      }
    }, 1000)

    const result = await processPromise
    console.log('Cancellation Result:', result)
  } catch (error) {
    console.log('✅ Process cancelled:', error.message)
  }
  console.log('')

  // Test 6: Multiple concurrent processes
  console.log('6️⃣ Testing Concurrent Processes...')
  try {
    const promises = []
    for (let i = 0; i < 3; i++) {
      promises.push(
        sandbox.runCommand('echo', [`Process ${i + 1}`])
      )
    }

    const results = await Promise.all(promises)
    console.log('Concurrent Results:', results.map(r => r.stdout.trim()))
    console.log('')
  } catch (error) {
    console.error('Error:', error.message)
    console.log('')
  }

  // Test 7: Execution logs
  console.log('7️⃣ Testing Execution Logs...')
  const logs = sandbox.getExecutionLogs(10)
  console.log('Recent logs:', logs.length)
  logs.forEach((log, index) => {
    console.log(`${index + 1}. ${log.command} ${log.args.join(' ')} - ${log.success ? 'SUCCESS' : 'FAILED'} (${log.executionTime}ms)`)
  })
  console.log('')

  // Test 8: Sandbox status
  console.log('8️⃣ Testing Sandbox Status...')
  const status = sandbox.getStatus()
  console.log('Status:', status)
  console.log('')

  console.log('✅ All tests completed!')
}

// Example usage functions
export function exampleUsage() {
  console.log('📚 Secure Sandbox Usage Examples:\n')

  // Example 1: Basic command execution
  console.log('Example 1: Basic Command Execution')
  console.log(`
sandbox.runCommand('dir', ['/a'])
  .then(result => {
    console.log('Success:', result.success)
    console.log('Output:', result.stdout)
    console.log('Error:', result.stderr)
  })
  .catch(error => {
    console.error('Error:', error.message)
  })
`)

  // Example 2: Streaming output
  console.log('Example 2: Streaming Output')
  console.log(`
sandbox.runCommand('npm', ['install'], (data) => {
  console.log(\`[\${data.type}] \${data.content}\`)
})
`)

  // Example 3: With options
  console.log('Example 3: With Options')
  console.log(`
sandbox.runCommand('node', ['script.js'], undefined, {
  timeout: 30000,
  workingDirectory: '/path/to/project',
  environment: { NODE_ENV: 'development' },
  maxOutputLength: 50000
})
`)

  // Example 4: Process management
  console.log('Example 4: Process Management')
  console.log(`
// Start a long-running process
const processPromise = sandbox.runCommand('npm', ['run', 'build'])

// Cancel after 30 seconds
setTimeout(() => {
  const status = sandbox.getStatus()
  status.processIds.forEach(processId => {
    sandbox.killProcess(processId)
  })
}, 30000)

// Or kill all processes
sandbox.killAllProcesses()
`)

  // Example 5: Security features
  console.log('Example 5: Security Features')
  console.log(`
// These commands will be blocked:
sandbox.runCommand('sudo', ['rm', '-rf', '/'])  // Blocked
sandbox.runCommand('shutdown', ['-h', 'now'])   // Blocked
sandbox.runCommand('format', ['C:'])            // Blocked

// Allow unsafe commands (use with caution)
sandbox.runCommand('sudo', ['dir'], undefined, { allowUnsafe: true })
`)

  // Example 6: Event handling
  console.log('Example 6: Event Handling')
  console.log(`
sandbox.on('stdout', (data) => {
  console.log('STDOUT:', data.content)
})

sandbox.on('stderr', (data) => {
  console.log('STDERR:', data.content)
})

sandbox.on('complete', (data) => {
  console.log('Process completed:', data.result.success)
})

sandbox.on('error', (data) => {
  console.error('Process error:', data.error)
})

sandbox.on('timeout', (data) => {
  console.log('Process timed out:', data.processId)
})
`)

  console.log('')
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSandbox().catch(console.error)
}

export { testSandbox }

