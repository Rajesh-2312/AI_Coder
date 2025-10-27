import React from 'react'
import ToDoList from './components/ToDoList'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>ToDoList</h1>
        <ToDoList />
      </header>
    </div>
  )
}

export default App