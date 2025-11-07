import React from 'react'
import { Play, Loader2, CheckCircle2 } from 'lucide-react'
import './ProcessButton.css'

function ProcessButton({ onClick, disabled, status }) {
  const getButtonText = () => {
    switch (status) {
      case 'uploading':
        return 'Enviando...'
      case 'processing':
        return 'Processando...'
      case 'success':
        return 'Processado com Sucesso!'
      default:
        return 'Processar Arquivo'
    }
  }

  const getButtonIcon = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 size={20} className="spinner" />
      case 'success':
        return <CheckCircle2 size={20} />
      default:
        return <Play size={20} />
    }
  }

  return (
    <button
      type="button"
      className={`process-button ${status} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled || status === 'uploading' || status === 'processing'}
    >
      <span className="button-content">
        {getButtonIcon()}
        <span>{getButtonText()}</span>
      </span>
      {status === 'processing' && (
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      )}
    </button>
  )
}

export default ProcessButton

