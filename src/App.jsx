import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import FilterSelector from './components/FilterSelector'
import ProcessButton from './components/ProcessButton'
import StatusIndicator from './components/StatusIndicator'
import DownloadButton from './components/DownloadButton'
import HistoryPanel from './components/HistoryPanel'
import './App.css'

const API_URL = "https://leitorback-2.onrender.com"

function App() {
  const [file, setFile] = useState(null)
  const [filterType, setFilterType] = useState('auditado')
  const [status, setStatus] = useState('idle') // idle, uploading, processing, success, error
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setStatus('idle')
    setErrorMessage('')
    setDownloadUrl(null)
  }

  const handleFilterChange = (filter) => {
    setFilterType(filter)
  }

  const handleProcess = async () => {
    if (!file) {
      setErrorMessage('Por favor, selecione um arquivo')
      return
    }

    setStatus('uploading')
    setErrorMessage('')
    setDownloadUrl(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipo', filterType)

    try {
      setStatus('processing')
      
      const response = await fetch(`${API_URL}/upload/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        // Tenta ler erro como JSON
        try {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.erro || 'Erro ao processar arquivo')
        } catch (jsonError) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resultado_${filterType}_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()

      setStatus('success')
      setDownloadUrl(url)

      // Adiciona ao histórico
      const historyItem = {
        id: Date.now(),
        filename: file.name,
        filterType: filterType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'success'
      }
      setHistory([historyItem, ...history])
      
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Erro ao processar arquivo. Verifique sua conexão com a internet.')
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `resultado_${filterType}_${new Date().getTime()}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  React.useEffect(() => {
    // Define tema claro como padrão permanente
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  return (
    <div className="app-container">
      
      <div className="main-card">
        <div className="header">
          <h1 className="title">
            <span className="title-icon">📊</span>
            Sistema de Contratos 3026
          </h1>
          <p className="subtitle">Processe e filtre planilhas de contratos de forma eficiente</p>
        </div>

        <div className="content">
          <FileUpload 
            file={file} 
            onFileSelect={handleFileSelect}
            disabled={status === 'uploading' || status === 'processing'}
          />

          <FilterSelector 
            value={filterType} 
            onChange={handleFilterChange}
            disabled={status === 'uploading' || status === 'processing'}
          />

          <ProcessButton 
            onClick={handleProcess}
            disabled={!file || status === 'uploading' || status === 'processing'}
            status={status}
          />

          <StatusIndicator 
            status={status}
            errorMessage={errorMessage}
          />

          {status === 'success' && downloadUrl && (
            <DownloadButton 
              onClick={handleDownload}
              filename={file?.name}
            />
          )}
        </div>
      </div>

      {history.length > 0 && (
        <HistoryPanel history={history} />
      )}

      <footer className="footer">
        <p>© 2024 Sistema de Contratos 3026 - Desenvolvido com React</p>
      </footer>
    </div>
  )
}

export default App

