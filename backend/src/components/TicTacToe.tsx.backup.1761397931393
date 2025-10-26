import React, { useState } from 'react'

interface TicTacToeProps {}

const TicTacToe: React.FC<TicTacToeProps> = () => {
  const [board, setBoard] = useState<string[]>(Array(9).fill(''))
  const [isXNext, setIsXNext] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)

  const calculateWinner = (squares: string[]): string | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ]

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const handleClick = (index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = isXNext ? 'X' : 'O'
    setBoard(newBoard)
    setIsXNext(!isXNext)

    const gameWinner = calculateWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(''))
    setIsXNext(true)
    setWinner(null)
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-8">
      <h1 className="text-3xl font-bold text-blue-600">Tic Tac Toe</h1>
      
      <div className="grid grid-cols-3 gap-1">
        {Array(9).fill(null).map((_, index) => (
          <button
            key={index}
            className="w-16 h-16 border-2 border-gray-300 text-2xl font-bold hover:bg-gray-100 bg-white"
            onClick={() => handleClick(index)}
          >
            {board[index]}
          </button>
        ))}
      </div>
      
      <div className="text-center">
        {winner ? (
          <div>
            <p className="text-xl font-semibold text-green-600 mb-2">
              Winner: {winner}!
            </p>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Play Again
            </button>
          </div>
        ) : (
          <p className="text-lg text-gray-700">
            Next player: {isXNext ? 'X' : 'O'}
          </p>
        )}
      </div>
    </div>
  )
}

export default TicTacToe