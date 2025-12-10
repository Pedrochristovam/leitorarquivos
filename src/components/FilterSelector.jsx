import React from 'react'
import { Filter, FileSpreadsheet } from 'lucide-react'
import './FilterSelector.css'

function FilterSelector({ value, onChange, disabled, fileType, onFileTypeChange }) {
  const auditOptions = [
    { value: 'auditado', label: 'Auditado (AUDI)' },
    { value: 'nauditado', label: 'Não Auditado (NAUD)' },
    { value: 'todos', label: 'Todos' }
  ]

  const fileTypeOptions = [
    { value: '3026-11', label: '3026-11' },
    { value: '3026-12', label: '3026-12' },
    { value: '3026-15', label: '3026-15' },
    { value: 'todos', label: 'Todos os Tipos' }
  ]

  return (
    <div className="filter-selector-container">
      {/* Filtro de Tipo de Arquivo */}
      <div className="filter-group">
        <label className="filter-label">
          <FileSpreadsheet size={18} className="filter-icon" />
          Tipo de Planilha
        </label>
        
        <div className="filter-options file-type-options">
          {fileTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-option ${fileType === option.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onFileTypeChange && onFileTypeChange(option.value)}
              disabled={disabled}
            >
              <span className="option-label">{option.label}</span>
              {fileType === option.value && (
                <span className="check-mark">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de Auditado */}
      <div className="filter-group">
        <label className="filter-label">
          <Filter size={18} className="filter-icon" />
          Filtro de Auditoria
        </label>
        
        <div className="filter-options">
          {auditOptions.map((option) => (
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
    </div>
  )
}

export default FilterSelector

