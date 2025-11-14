import React, { useRef, useState } from 'react'
import { Upload, File, X, Plus } from 'lucide-react'
import './MultiFileUpload.css'

function MultiFileUpload({ files, onFilesChange, disabled, bankType }) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const excelFiles = selectedFiles.filter(file => file.name.endsWith('.xlsx'))
    
    if (excelFiles.length > 0) {
      onFilesChange([...files, ...excelFiles])
    } else {
      alert('Por favor, selecione arquivos Excel (.xlsx)')
    }
    
    // Reset input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    const excelFiles = droppedFiles.filter(file => file.name.endsWith('.xlsx'))
    
    if (excelFiles.length > 0) {
      onFilesChange([...files, ...excelFiles])
    } else {
      alert('Por favor, solte arquivos Excel (.xlsx)')
    }
  }

  const handleRemove = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="multi-file-upload-container">
      <label className="multi-file-upload-label">
        Selecione arquivos Excel para {bankType === 'bemge' ? 'BEMGE' : 'MINAS CAIXA'}
      </label>
      
      <div
        className={`multi-file-upload-area ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          multiple
          onChange={handleFileChange}
          disabled={disabled}
          className="file-input"
        />
        
        {files.length === 0 ? (
          <div className="upload-placeholder">
            <Upload size={48} className="upload-icon" />
            <div className="upload-text">
              <p className="upload-main-text">Arraste e solte os arquivos aqui</p>
              <p className="upload-sub-text">ou clique para selecionar múltiplos arquivos</p>
            </div>
          </div>
        ) : (
          <div className="files-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <File size={20} className="file-icon" />
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(index)
                    }}
                    aria-label="Remover arquivo"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {!disabled && (
              <button
                type="button"
                className="add-more-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClick()
                }}
              >
                <Plus size={20} />
                <span>Adicionar mais arquivos</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {files.length > 0 && (
        <p className="files-count">{files.length} arquivo(s) selecionado(s)</p>
      )}
    </div>
  )
}

export default MultiFileUpload


