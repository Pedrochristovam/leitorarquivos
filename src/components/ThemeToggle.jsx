import React from 'react'
import { Sun, Moon } from 'lucide-react'
import './ThemeToggle.css'

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label="Alternar tema"
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      <div className={`theme-toggle-slider ${theme === 'light' ? 'light' : ''}`}>
        <div className="theme-toggle-icon">
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </div>
      </div>
    </button>
  )
}

export default ThemeToggle

