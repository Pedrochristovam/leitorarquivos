import React, { useState } from 'react'
import MultiFileUpload from './components/MultiFileUpload'
import BankSelector from './components/BankSelector'
import ProcessButton from './components/ProcessButton'
import StatusIndicator from './components/StatusIndicator'
import HistoryPanel from './components/HistoryPanel'
import './App.css'

const API_URL = "https://leitorback-2.onrender.com"

function App() {
  const [files, setFiles] = useState([])
  const [bankType, setBankType] = useState(null) // 'bemge' ou 'minas_caixa'
  const [status, setStatus] = useState('idle') // idle, uploading, processing, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])
  const [resultData, setResultData] = useState(null) // Para armazenar os resultados do processamento
  const [downloadUrl, setDownloadUrl] = useState(null) // URL para download da planilha consolidada

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles)
    setStatus('idle')
    setErrorMessage('')
    setResultData(null)
  }

  const handleBankChange = (bank) => {
    setBankType(bank)
    setFiles([]) // Limpa arquivos ao trocar de banco
    setStatus('idle')
    setErrorMessage('')
    setResultData(null)
  }

  const handleProcess = async () => {
    if (!bankType) {
      setErrorMessage('Por favor, selecione o banco (BEMGE ou MINAS CAIXA)')
      return
    }

    if (files.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um arquivo Excel')
      return
    }

    setStatus('uploading')
    setErrorMessage('')
    setResultData(null)
    setDownloadUrl(null)

    const formData = new FormData()
    formData.append('bank_type', bankType)
    
    // Adiciona todos os arquivos
    files.forEach((file, index) => {
      formData.append(`files`, file)
    })

    try {
      setStatus('processing')
      
      // Cria um AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutos de timeout (múltiplos arquivos)
      
      const response = await fetch(`${API_URL}/processar_contratos/`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        // NÃO definir Content-Type manualmente - o browser faz isso automaticamente
      })
      
      clearTimeout(timeoutId)

      // Verifica se houve erro HTTP
      if (!response.ok) {
        // Backend retorna JSON quando há erro
        try {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.erro || 'Erro ao processar arquivos')
        } catch (jsonError) {
          // Se não conseguir ler como JSON, lança erro genérico
          if (jsonError instanceof Error && jsonError.message) {
            throw jsonError
          }
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
      }

      // Verifica o content-type
      const contentType = response.headers.get("content-type") || ""
      
      if (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        // Backend retorna arquivo Excel consolidado
        const blob = await response.blob()
        
        if (blob.size === 0) {
          throw new Error('Arquivo gerado está vazio')
        }

        const url = window.URL.createObjectURL(blob)
        setDownloadUrl(url)
        
        // Faz download automático
        const a = document.createElement("a")
        a.href = url
        a.download = `3026_${bankType.toUpperCase()}_CONSOLIDADO_${Date.now()}.xlsx`
        document.body.appendChild(a)
        a.click()
        a.remove()

        setTimeout(() => {
          window.URL.revokeObjectURL(url)
        }, 100)

        setResultData({
          message: 'Processamento concluído com sucesso!',
          total_files: files.length,
          bank: bankType
        })
      } else {
        // Backend retorna JSON com os resultados
        const result = await response.json()
        
        if (result.erro) {
          throw new Error(result.erro)
        }

        setResultData(result)
      }

      setStatus('success')

      // Adiciona ao histórico
      const historyItem = {
        id: Date.now(),
        filenames: files.map(f => f.name),
        bankType: bankType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'success',
        result: resultData
      }
      setHistory([historyItem, ...history])
      
    } catch (error) {
      setStatus('error')
      
      // Trata diferentes tipos de erro
      if (error.name === 'AbortError') {
        setErrorMessage('Tempo de processamento excedido. Os arquivos podem ser muito grandes ou o servidor está lento.')
      } else if (error.message) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Erro ao processar arquivos. Verifique sua conexão com a internet e se o servidor está online.')
      }
      
      // Adiciona ao histórico com erro
      const historyItem = {
        id: Date.now(),
        filenames: files.map(f => f.name),
        bankType: bankType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'error'
      }
      setHistory([historyItem, ...history])
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `3026_${bankType.toUpperCase()}_CONSOLIDADO_${new Date().getTime()}.xlsx`
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
          <BankSelector 
            value={bankType} 
            onChange={handleBankChange}
            disabled={status === 'uploading' || status === 'processing'}
          />

          {bankType && (
            <MultiFileUpload 
              files={files} 
              onFilesChange={handleFilesChange}
              disabled={status === 'uploading' || status === 'processing'}
              bankType={bankType}
            />
          )}

          <ProcessButton 
            onClick={handleProcess}
            disabled={!bankType || files.length === 0 || status === 'uploading' || status === 'processing'}
            status={status}
          />

          <StatusIndicator 
            status={status}
            errorMessage={errorMessage}
          />

          {status === 'success' && resultData && (
            <div className="result-display">
              <h3>Processamento Concluído!</h3>
              <div className="result-info">
                <p><strong>Banco:</strong> {bankType === 'bemge' ? 'BEMGE' : 'MINAS CAIXA'}</p>
                <p><strong>Arquivos Processados:</strong> {resultData.total_files || files.length}</p>
                {resultData.total_contratos && (
                  <p><strong>Total de Contratos:</strong> {resultData.total_contratos}</p>
                )}
                {resultData.total_auditados && (
                  <p><strong>Contratos Auditados:</strong> {resultData.total_auditados}</p>
                )}
                {resultData.total_nauditados && (
                  <p><strong>Contratos Não Auditados:</strong> {resultData.total_nauditados}</p>
                )}
                {resultData.total_repetidos && (
                  <p><strong>Contratos Repetidos:</strong> {resultData.total_repetidos}</p>
                )}
                {downloadUrl && (
                  <button 
                    onClick={handleDownload}
                    className="download-consolidated-btn"
                  >
                    📥 Baixar Planilha Consolidada
                  </button>
                )}
              </div>
            </div>
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

