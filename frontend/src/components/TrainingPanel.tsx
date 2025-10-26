import React, { useState, useEffect } from 'react'
import { trainingService, TrainingExample, TrainingStats, AgentTask } from '../services/trainingService'

interface TrainingPanelProps {
  onClose?: () => void
}

export const TrainingPanel: React.FC<TrainingPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'examples' | 'train' | 'test'>('stats')
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [examples, setExamples] = useState<TrainingExample[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Training form state
  const [trainingInput, setTrainingInput] = useState('')
  const [trainingSuccessRate, setTrainingSuccessRate] = useState(1.0)

  // Test form state
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    loadStats()
    loadExamples()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const result = await trainingService.getTrainingStats()
      if (result.success && result.stats) {
        setStats(result.stats)
      } else {
        setMessage(`Failed to load stats: ${result.error}`)
      }
    } catch (error) {
      setMessage(`Error loading stats: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const loadExamples = async () => {
    try {
      setLoading(true)
      const result = await trainingService.getTrainingExamples()
      if (result.success && result.examples) {
        setExamples(result.examples)
      } else {
        setMessage(`Failed to load examples: ${result.error}`)
      }
    } catch (error) {
      setMessage(`Error loading examples: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickTrain = async () => {
    if (!trainingInput.trim()) {
      setMessage('Please enter a training input')
      return
    }

    try {
      setLoading(true)
      setMessage('')
      
      const result = await trainingService.quickTrain(trainingInput, trainingSuccessRate)
      
      if (result.success) {
        setMessage(`✅ ${result.message}`)
        setTrainingInput('')
        await loadStats()
        await loadExamples()
      } else {
        setMessage(`❌ ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    if (!testInput.trim()) {
      setMessage('Please enter a test input')
      return
    }

    try {
      setLoading(true)
      setMessage('')
      
      const result = await trainingService.generateAgentPlan(testInput)
      
      if (result.success) {
        setTestResult(result)
        if (result.example) {
          setMessage(`✅ Found matching example: "${result.example.userInput}" (Confidence: ${Math.round((result.confidence || 0) * 100)}%)`)
        } else {
          setMessage('⚠️ No matching example found')
        }
      } else {
        setMessage(`❌ ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const renderStats = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Training Statistics</h3>
      
      {stats ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold text-primary">{stats.totalExamples}</div>
            <div className="text-sm text-muted-foreground">Total Examples</div>
          </div>
          
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold text-primary">{stats.totalSessions}</div>
            <div className="text-sm text-muted-foreground">Training Sessions</div>
          </div>
          
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold text-primary">{Math.round(stats.averageSuccessRate * 100)}%</div>
            <div className="text-sm text-muted-foreground">Average Success Rate</div>
          </div>
          
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold text-primary">{stats.topTechnologies.length}</div>
            <div className="text-sm text-muted-foreground">Technologies</div>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">Loading statistics...</div>
      )}

      {stats && (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Top Technologies</h4>
          <div className="space-y-2">
            {stats.topTechnologies.slice(0, 5).map((tech, index) => (
              <div key={tech.technology} className="flex justify-between items-center">
                <span className="text-sm text-foreground">{tech.technology}</span>
                <span className="text-sm text-muted-foreground">{tech.count} examples</span>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-foreground">Recent Examples</h4>
          <div className="space-y-2">
            {stats.recentExamples.map((example) => (
              <div key={example.id} className="bg-card p-3 rounded border">
                <div className="text-sm font-medium text-foreground">{example.userInput}</div>
                <div className="text-xs text-muted-foreground">
                  {example.projectType} • {Math.round(example.successRate * 100)}% success
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderExamples = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Training Examples</h3>
        <button
          onClick={loadExamples}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {examples.map((example) => (
          <div key={example.id} className="bg-card p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-foreground">{example.userInput}</div>
              <div className="text-xs text-muted-foreground">
                {Math.round(example.successRate * 100)}% success
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              {example.projectType} • {example.technologies.join(', ')}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {example.agentTasks.length} agent tasks
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderTrain = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Quick Train Model</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Training Input
          </label>
          <input
            type="text"
            value={trainingInput}
            onChange={(e) => setTrainingInput(e.target.value)}
            placeholder="e.g., create a calculator app"
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Success Rate (0.0 - 1.0)
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={trainingSuccessRate}
            onChange={(e) => setTrainingSuccessRate(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        
        <button
          onClick={handleQuickTrain}
          disabled={loading || !trainingInput.trim()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Training...' : 'Quick Train'}
        </button>
      </div>
    </div>
  )

  const renderTest = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Test Model</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Test Input
          </label>
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="e.g., create a tic-tac-toe game"
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        
        <button
          onClick={handleTest}
          disabled={loading || !testInput.trim()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Model'}
        </button>
      </div>

      {testResult && (
        <div className="bg-card p-4 rounded-lg border">
          <h4 className="font-semibold text-foreground mb-2">Test Result</h4>
          
          {testResult.example ? (
            <div className="space-y-2">
              <div className="text-sm text-foreground">
                <strong>Matched Example:</strong> {testResult.example.userInput}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Confidence:</strong> {Math.round((testResult.confidence || 0) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Project Type:</strong> {testResult.example.projectType}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Technologies:</strong> {testResult.example.technologies.join(', ')}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No matching example found for this input.
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">AI Model Training</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'stats', label: 'Stats', icon: '📊' },
          { id: 'examples', label: 'Examples', icon: '📚' },
          { id: 'train', label: 'Train', icon: '🎓' },
          { id: 'test', label: 'Test', icon: '🧪' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'examples' && renderExamples()}
        {activeTab === 'train' && renderTrain()}
        {activeTab === 'test' && renderTest()}
      </div>

      {/* Message */}
      {message && (
        <div className="p-4 border-t border-border">
          <div className={`text-sm p-2 rounded ${
            message.includes('✅') ? 'bg-green-100 text-green-800' :
            message.includes('❌') ? 'bg-red-100 text-red-800' :
            message.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainingPanel
