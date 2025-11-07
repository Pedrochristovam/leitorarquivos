import React from 'react'
import { Download, FileDown } from 'lucide-react'
import './DownloadButton.css'

function DownloadButton({ onClick, filename }) {
  return (
    <button
      type="button"
      className="download-button"
      onClick={onClick}
    >
      <div className="download-content">
        <Download size={24} className="download-icon" />
        <div className="download-text">
          <span className="download-label">Download do Resultado</span>
          <span className="download-filename">Arquivo processado</span>
        </div>
        <FileDown size={20} className="download-arrow" />
      </div>
      <div className="download-shine"></div>
    </button>
  )
}

export default DownloadButton

