import React from 'react'
import { History, FileText, Clock, CheckCircle2 } from 'lucide-react'
import './HistoryPanel.css'

function HistoryPanel({ history }) {
  if (history.length === 0) {
    return null
  }

  const getFilterLabel = (filterType) => {
    const labels = {
      auditado: 'Auditado (AUDI)',
      nauditado: 'Não Auditado (NAUD)',
      todos: 'Todos'
    }
    return labels[filterType] || filterType
  }

  const getFilenamesLabel = (filenames) => {
    if (!filenames || filenames.length === 0) {
      return 'Arquivos não informados'
    }
    if (filenames.length === 1) {
      return filenames[0]
    }
    return filenames.join(', ')
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <History size={20} className="history-icon" />
        <h3 className="history-title">Histórico de Processamentos</h3>
        <span className="history-count">{history.length}</span>
      </div>
      
      <div className="history-list">
        {history.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-item-icon">
              <FileText size={18} />
            </div>
            <div className="history-item-content">
              <div className="history-item-main">
                <span className="history-filename">{getFilenamesLabel(item.filenames)}</span>
                <span className="history-status">
                  <CheckCircle2 size={14} />
                  {item.status === 'success' ? 'Sucesso' : 'Erro'}
                </span>
              </div>
              <div className="history-item-details">
                <span className="history-filter">{getFilterLabel(item.filterType)}</span>
                <span className="history-separator">•</span>
                <span className="history-date">
                  <Clock size={12} />
                  {item.date}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryPanel

