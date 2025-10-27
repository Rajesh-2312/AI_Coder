import { memo } from 'react'

interface SimpleCodeEditorProps {
  value: string
  language?: string
  onChange?: (value: string | undefined) => void
  className?: string
}

// Simple textarea-based editor for immediate use
const SimpleCodeEditor = memo<SimpleCodeEditorProps>(({ 
  value, 
  language = 'typescript',
  onChange,
  className = ''
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full h-full bg-[#1e1e1e] text-[#cccccc] font-mono text-sm p-4 border-none outline-none resize-none ${className}`}
      style={{ 
        fontSize: '14px', 
        lineHeight: '1.5',
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
      }}
      spellCheck={false}
    />
  )
})

SimpleCodeEditor.displayName = 'SimpleCodeEditor'

export default SimpleCodeEditor

