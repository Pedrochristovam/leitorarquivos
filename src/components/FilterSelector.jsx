import React from 'react'
import { Filter } from 'lucide-react'
import './FilterSelector.css'

function FilterSelector({ value, onChange, disabled }) {
  const options = [
    { value: 'auditado', label: 'Auditado (AUDI)' },
    { value: 'nauditado', label: 'Não Auditado (NAUD)' },
    { value: 'todos', label: 'Todos' }
  ]

  return (
    <div className="filter-selector-container">
      <label className="filter-label">
        <Filter size={18} className="filter-icon" />
        Tipo de Filtro
      </label>
      
      <div className="filter-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-option ${value === option.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
          >
            <span className="option-label">{option.label}</span>
            {value === option.value && (
              <span className="check-mark">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default FilterSelector

