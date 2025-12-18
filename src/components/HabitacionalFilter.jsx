import React, { useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import './HabitacionalFilter.css'

function HabitacionalFilter({ enabled, onToggle, referenceDate, onDateChange, monthsBack, onMonthsChange, disabled, label }) {
  const displayLabel = label || "Filtro por Data Habitacional (Coluna W) - 3026-11"
  
  const handleDateChange = (e) => {
    onDateChange(e.target.value)
  }

  const handleMonthsChange = (e) => {
    onMonthsChange(parseInt(e.target.value))
  }

  return (
    <div className="habitacional-filter-container">
      <div className="habitacional-filter-header">
        <label className="habitacional-filter-label">
          <Calendar size={18} className="habitacional-icon" />
          {displayLabel}
        </label>
        
        <label className="habitacional-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">{enabled ? 'Ativado' : 'Desativado'}</span>
        </label>
      </div>

      {enabled && (
        <div className="habitacional-filter-controls">
          <div className="habitacional-control-group">
            <label className="habitacional-control-label">
              <Calendar size={16} />
              Data de Referência
            </label>
            <input
              type="date"
              value={referenceDate}
              onChange={handleDateChange}
              disabled={disabled}
              className="habitacional-date-input"
            />
          </div>

          <div className="habitacional-control-group">
            <label className="habitacional-control-label">
              <Clock size={16} />
              Meses para Trás
            </label>
            <select
              value={monthsBack}
              onChange={handleMonthsChange}
              disabled={disabled}
              className="habitacional-months-select"
            >
              <option value={1}>1 mês</option>
              <option value={2}>2 meses (Padrão)</option>
              <option value={3}>3 meses</option>
              <option value={4}>4 meses</option>
              <option value={5}>5 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </div>

          <div className="habitacional-info">
            <span className="habitacional-info-text">
              Filtrará contratos com Data Habitacional dos últimos {monthsBack} {monthsBack === 1 ? 'mês' : 'meses'} antes de {referenceDate ? new Date(referenceDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'data selecionada'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default HabitacionalFilter

