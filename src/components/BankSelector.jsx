import React from 'react'
import { Building2 } from 'lucide-react'
import './BankSelector.css'

function BankSelector({ value, onChange, disabled }) {
  return (
    <div className="bank-selector-container">
      <label className="bank-selector-label">
        <Building2 size={18} />
        Selecione o Banco
      </label>
      <div className="bank-options">
        <button
          type="button"
          className={`bank-option ${value === 'bemge' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && onChange('bemge')}
          disabled={disabled}
        >
          <div className="bank-option-content">
            <div className="bank-option-icon">🏦</div>
            <div className="bank-option-text">
              <span className="bank-name">BEMGE</span>
              <span className="bank-desc">Banco do Estado de Minas Gerais</span>
            </div>
          </div>
        </button>
        
        <button
          type="button"
          className={`bank-option ${value === 'minas_caixa' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && onChange('minas_caixa')}
          disabled={disabled}
        >
          <div className="bank-option-content">
            <div className="bank-option-icon">🏛️</div>
            <div className="bank-option-text">
              <span className="bank-name">MINAS CAIXA</span>
              <span className="bank-desc">Caixa Econômica de Minas Gerais</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default BankSelector

