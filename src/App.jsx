import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import FilterSelector from './components/FilterSelector'
import ProcessButton from './components/ProcessButton'
import StatusIndicator from './components/StatusIndicator'
import DownloadButton from './components/DownloadButton'
import HistoryPanel from './components/HistoryPanel'
import './App.css'
import axios from 'axios'

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
      
      // Usa URL relativa que funciona tanto em dev (com proxy) quanto em produção
      const apiUrl = '/upload/'
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      })

      // Cria URL para download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      setStatus('success')

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
      if (error.response) {
        // Erro HTTP
        if (error.response.data instanceof Blob) {
          // Tenta ler como texto JSON
          error.response.data.text().then(text => {
            try {
              const errorData = JSON.parse(text)
              setErrorMessage(errorData.detail || errorData.erro || 'Erro ao processar arquivo')
            } catch {
              setErrorMessage(error.response.status === 400 
                ? 'Arquivo inválido ou erro no processamento' 
                : 'Erro ao processar arquivo')
            }
          }).catch(() => {
            setErrorMessage(error.response.status === 400 
              ? 'Arquivo inválido ou erro no processamento' 
              : 'Erro ao processar arquivo')
          })
        } else if (error.response.data?.detail) {
          setErrorMessage(error.response.data.detail)
        } else if (typeof error.response.data === 'object' && error.response.data?.erro) {
          setErrorMessage(error.response.data.erro)
        } else {
          setErrorMessage('Erro ao processar arquivo')
        }
      } else if (error.request) {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique se o servidor está rodando na porta 8010.')
      } else {
        setErrorMessage('Erro ao processar arquivo: ' + (error.message || 'Erro desconhecido'))
      }
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

