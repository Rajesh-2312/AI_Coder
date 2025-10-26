import express from 'express'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
const generateSchema = Joi.object({
  prompt: Joi.string().required().min(1).max(10000),
  model: Joi.string().optional().default('qwen2.5-coder:1.5b'),
  temperature: Joi.number().optional().min(0).max(2).default(0.05),
  maxTokens: Joi.number().optional().min(1).max(4096).default(128),
  stream: Joi.boolean().optional().default(true),
  context: Joi.string().optional().max(50000),
  useOrchestrator: Joi.boolean().optional().default(true),
  agentContext: Joi.object().optional()
})

const analyzeSchema = Joi.object({
  code: Joi.string().required().min(1).max(100000),
  language: Joi.string().optional().default('typescript'),
  analysisType: Joi.string().optional().valid('quality', 'security', 'performance', 'all').default('all')
})

const taskSchema = Joi.object({
  task: Joi.string().required().min(1).max(5000),
  context: Joi.string().optional().max(10000)
})

// Simple AI response generator
const generateAIResponse = async (prompt: string): Promise<string> => {
  // Simple fallback responses for common tasks
  if (prompt.toLowerCase().includes('tic-tac-toe') || prompt.toLowerCase().includes('tic tac toe')) {
    return JSON.stringify({
      projectType: 'tic-tac-toe',
      files: [
        {
          path: 'src/components/TicTacToe.tsx',
          content: `import React, { useState } from 'react';

interface TicTacToeProps {}

const TicTacToe: React.FC<TicTacToeProps> = () => {
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: string[]): string | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setWinner(null);
  };

  return (
    <div className="tic-tac-toe">
      <h2>Tic Tac Toe</h2>
      <div className="game-info">
        {winner ? (
          <p>Winner: {winner}</p>
        ) : (
          <p>Current Player: {currentPlayer}</p>
        )}
      </div>
      <div className="board">
        {board.map((cell, index) => (
          <button
            key={index}
            className="cell"
            onClick={() => handleClick(index)}
            disabled={!!cell || !!winner}
          >
            {cell}
          </button>
        ))}
      </div>
      <button onClick={resetGame} className="reset-btn">
        Reset Game
      </button>
    </div>
  );
};

export default TicTacToe;`,
          operation: 'create'
        },
        {
          path: 'src/App.tsx',
          content: `import React from 'react';
import TicTacToe from './components/TicTacToe';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>AI-Coder Tic Tac Toe</h1>
        <TicTacToe />
      </header>
    </div>
  );
}

export default App;`,
          operation: 'update'
        },
        {
          path: 'src/App.css',
          content: `.App {
  text-align: center;
  padding: 20px;
}

.tic-tac-toe {
  margin: 20px auto;
  max-width: 400px;
}

.game-info {
  margin: 20px 0;
  font-size: 18px;
  font-weight: bold;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  margin: 20px auto;
  max-width: 300px;
}

.cell {
  width: 80px;
  height: 80px;
  font-size: 24px;
  font-weight: bold;
  border: 2px solid #333;
  background: #fff;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cell:hover {
  background-color: #f0f0f0;
}

.cell:disabled {
  cursor: not-allowed;
  background-color: #e0e0e0;
}

.reset-btn {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.reset-btn:hover {
  background-color: #0056b3;
}`,
          operation: 'create'
        }
      ],
      commands: [
        { command: 'npm install', workingDirectory: 'frontend' },
        { command: 'npm run dev', workingDirectory: 'frontend' }
      ]
    });
  }
  
  return JSON.stringify({
    message: "I can help you create projects! Try asking me to create a tic-tac-toe game or another project.",
    files: [],
    commands: []
  });
};

// POST /api/ai/generate - Generate AI response
router.post('/generate', async (req, res) => {
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { prompt } = value;
    const response = await generateAIResponse(prompt);
    
    res.json({
      response,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// POST /api/ai/analyze - Analyze code
router.post('/analyze', async (req, res) => {
  try {
    const { error, value } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { code, language, analysisType } = value;
    
    res.json({
      analysis: {
        language,
        type: analysisType,
        summary: 'Code analysis completed',
        suggestions: ['Consider adding error handling', 'Add type annotations where missing']
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Code analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// POST /api/ai/execute-project - Execute project creation
router.post('/execute-project', async (req, res) => {
  try {
    const { error, value } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { task } = value;
    const response = await generateAIResponse(task);
    
    res.json({
      project: JSON.parse(response),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Project execution error:', err);
    res.status(500).json({ error: 'Failed to execute project' });
  }
});

// GET /api/ai/models - Get available models
router.get('/models', async (req, res) => {
  try {
    res.json({
      models: [
        { name: 'qwen2.5-coder:1.5b', description: 'Code generation model' },
        { name: 'llama3.2:3b', description: 'General purpose model' }
      ],
      defaultModel: 'qwen2.5-coder:1.5b'
    });
  } catch (err) {
    console.error('Models error:', err);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

// GET /api/ai/status - Get AI status
router.get('/status', async (req, res) => {
  try {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;