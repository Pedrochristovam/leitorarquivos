import React, { useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import './PeriodFilter.css'

function PeriodFilter({ enabled, onToggle, referenceDate, onDateChange, monthsBack, onMonthsChange, disabled }) {
  
  const handleDateChange = (e) => {
    onDateChange(e.target.value)
  }

  const handleMonthsChange = (e) => {
    onMonthsChange(parseInt(e.target.value))
  }

  return (
    <div className="period-filter-container">
      <div className="period-filter-header">
        <label className="period-filter-label">
          <Calendar size={18} className="period-icon" />
          Filtro por Período (DT.MANIFESTAÇÃO)
        </label>
        
        <label className="period-toggle">
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
        <div className="period-filter-controls">
          <div className="period-control-group">
            <label className="period-control-label">
              <Calendar size={16} />
              Data de Referência
            </label>
            <input
              type="date"
              value={referenceDate}
              onChange={handleDateChange}
              disabled={disabled}
              className="period-date-input"
            />
          </div>

          <div className="period-control-group">
            <label className="period-control-label">
              <Clock size={16} />
              Meses para Trás
            </label>
            <select
              value={monthsBack}
              onChange={handleMonthsChange}
              disabled={disabled}
              className="period-months-select"
            >
              <option value={1}>1 mês</option>
              <option value={2}>2 meses</option>
              <option value={3}>3 meses</option>
              <option value={4}>4 meses</option>
              <option value={5}>5 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </div>

          <div className="period-info">
            <span className="period-info-text">
              Filtrará contratos de {monthsBack} {monthsBack === 1 ? 'mês' : 'meses'} antes de {referenceDate ? new Date(referenceDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'data selecionada'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeriodFilter





