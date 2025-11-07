import React, { useRef, useState } from 'react'
import { Upload, File, X } from 'lucide-react'
import './FileUpload.css'

function FileUpload({ file, onFileSelect, disabled }) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
      onFileSelect(selectedFile)
    } else {
      alert('Por favor, selecione um arquivo Excel (.xlsx)')
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

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      onFileSelect(droppedFile)
    } else {
      alert('Por favor, solte um arquivo Excel (.xlsx)')
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="file-upload-container">
      <label className="file-upload-label">Selecione o arquivo Excel</label>
      
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          disabled={disabled}
          className="file-input"
        />
        
        {!file ? (
          <div className="upload-placeholder">
            <Upload size={48} className="upload-icon" />
            <div className="upload-text">
              <p className="upload-main-text">Arraste e solte o arquivo aqui</p>
              <p className="upload-sub-text">ou clique para selecionar</p>
            </div>
          </div>
        ) : (
          <div className="file-selected">
            <File size={32} className="file-icon" />
            <div className="file-info">
              <p className="file-name">{file.name}</p>
              <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!disabled && (
              <button
                type="button"
                className="remove-file-btn"
                onClick={handleRemove}
                aria-label="Remover arquivo"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FileUpload

