import React, { useState } from 'react'
import MultiFileUpload from './components/MultiFileUpload'
import BankSelector from './components/BankSelector'
import FilterSelector from './components/FilterSelector'
import PeriodFilter from './components/PeriodFilter'
import HabitacionalFilter from './components/HabitacionalFilter'
import ProcessButton from './components/ProcessButton'
import StatusIndicator from './components/StatusIndicator'
import HistoryPanel from './components/HistoryPanel'
import './App.css'

const API_URL = "https://leitorback-2.onrender.com"

function App() {
  const [files, setFiles] = useState([])
  const [bankType, setBankType] = useState(null) // 'bemge' ou 'minas_caixa'
  const [filterType, setFilterType] = useState('todos') // 'auditado', 'nauditado', 'todos'
  const [fileType, setFileType] = useState('todos') // '3026-11', '3026-12', '3026-15', 'todos'
  const [status, setStatus] = useState('idle') // idle, uploading, processing, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])
  const [resultData, setResultData] = useState(null) // Para armazenar os resultados do processamento
  const [downloadUrl, setDownloadUrl] = useState(null) // URL para download da planilha consolidada
  
  // Estados para filtro de período (DT.MANIFESTAÇÃO)
  const [periodFilterEnabled, setPeriodFilterEnabled] = useState(false)
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]) // Data atual
  const [monthsBack, setMonthsBack] = useState(2) // Padrão: 2 meses
  
  // Estados para filtro de Data Habitacional (Coluna W) - 3026-11 BEMGE
  const [habitacionalFilterEnabled, setHabitacionalFilterEnabled] = useState(false)
  const [habitacionalReferenceDate, setHabitacionalReferenceDate] = useState(new Date().toISOString().split('T')[0])
  const [habitacionalMonthsBack, setHabitacionalMonthsBack] = useState(2) // Padrão: 2 meses
  
  // Estados para filtro MINAS CAIXA 3026-11 (Coluna Y)
  const [minasCaixa3026_11FilterEnabled, setMinasCaixa3026_11FilterEnabled] = useState(false)
  const [minasCaixa3026_11ReferenceDate, setMinasCaixa3026_11ReferenceDate] = useState(new Date().toISOString().split('T')[0])
  const [minasCaixa3026_11MonthsBack, setMinasCaixa3026_11MonthsBack] = useState(2)
  
  // Estados para filtro MINAS CAIXA 3026-15 (Coluna AB)
  const [minasCaixa3026_15FilterEnabled, setMinasCaixa3026_15FilterEnabled] = useState(false)
  const [minasCaixa3026_15ReferenceDate, setMinasCaixa3026_15ReferenceDate] = useState(new Date().toISOString().split('T')[0])
  const [minasCaixa3026_15MonthsBack, setMinasCaixa3026_15MonthsBack] = useState(2)

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
    setFileType('todos')
  }

  const handleFilterChange = (filter) => {
    setFilterType(filter)
  }

  const handleFileTypeChange = (type) => {
    setFileType(type)
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
    formData.append('filter_type', filterType) // Adiciona o filtro de auditado/não auditado
    formData.append('file_type', fileType) // Adiciona o tipo de arquivo (3026-11, 3026-12, 3026-15)
    
    // Adiciona filtro de período (DT.MANIFESTAÇÃO)
    formData.append('period_filter_enabled', periodFilterEnabled ? 'true' : 'false')
    if (periodFilterEnabled) {
      formData.append('reference_date', referenceDate)
      formData.append('months_back', monthsBack.toString())
    }
    
    // Adiciona filtro de Data Habitacional - 3026-11
    const is3026_11 = files.some(f => f.name.toUpperCase().includes('3026-11'))
    const is3026_15 = files.some(f => f.name.toUpperCase().includes('3026-15'))
    
    // BEMGE 3026-11 - Coluna W
    const shouldShowHabitacionalBEMGE = bankType === 'bemge' && is3026_11
    // MINAS CAIXA 3026-11 - Coluna Y
    const shouldShowMinasCaixa3026_11 = bankType === 'minas_caixa' && is3026_11
    
    // Usar o filtro correto conforme o banco (backend diferencia pelo bank_type)
    if (shouldShowHabitacionalBEMGE) {
      formData.append('habitacional_filter_enabled', habitacionalFilterEnabled ? 'true' : 'false')
      if (habitacionalFilterEnabled) {
        formData.append('habitacional_reference_date', habitacionalReferenceDate)
        formData.append('habitacional_months_back', habitacionalMonthsBack.toString())
      }
    } else if (shouldShowMinasCaixa3026_11) {
      formData.append('habitacional_filter_enabled', minasCaixa3026_11FilterEnabled ? 'true' : 'false')
      if (minasCaixa3026_11FilterEnabled) {
        formData.append('habitacional_reference_date', minasCaixa3026_11ReferenceDate)
        formData.append('habitacional_months_back', minasCaixa3026_11MonthsBack.toString())
      }
    } else {
      formData.append('habitacional_filter_enabled', 'false')
    }
    
    // 3026-15 - Coluna AB (BEMGE e MINAS CAIXA)
    const shouldShow3026_15Filter = is3026_15
    if (shouldShow3026_15Filter) {
      // BEMGE usa os mesmos parâmetros mas apenas para filtro de data
      if (bankType === 'bemge') {
        formData.append('minas_caixa_3026_15_filter_enabled', habitacionalFilterEnabled ? 'true' : 'false')
        if (habitacionalFilterEnabled) {
          formData.append('minas_caixa_3026_15_reference_date', habitacionalReferenceDate)
          formData.append('minas_caixa_3026_15_months_back', habitacionalMonthsBack.toString())
        }
      } else {
        // MINAS CAIXA usa seus próprios parâmetros
        formData.append('minas_caixa_3026_15_filter_enabled', minasCaixa3026_15FilterEnabled ? 'true' : 'false')
        if (minasCaixa3026_15FilterEnabled) {
          formData.append('minas_caixa_3026_15_reference_date', minasCaixa3026_15ReferenceDate)
          formData.append('minas_caixa_3026_15_months_back', minasCaixa3026_15MonthsBack.toString())
        }
      }
    } else {
      formData.append('minas_caixa_3026_15_filter_enabled', 'false')
    }
    
    // Adiciona todos os arquivos
    files.forEach((file, index) => {
      formData.append(`files`, file)
    })

    try {
      setStatus('processing')
      let resultPayload = null
      
      // Cria um AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutos de timeout (múltiplos arquivos)
      
      // Tenta primeiro o novo endpoint, depois o antigo como fallback
      let response
      try {
        response = await fetch(`${API_URL}/processar_contratos/`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
          // NÃO definir Content-Type manualmente - o browser faz isso automaticamente
        })
        
        // Se o endpoint retornar 404, tenta o fallback
        if (response.status === 404) {
          console.warn('Endpoint /processar_contratos/ não encontrado, tentando /upload/')
          // Remove bank_type e files, usa apenas um arquivo e filter_type
          const fallbackFormData = new FormData()
          if (files.length > 0) {
            fallbackFormData.append('file', files[0])
            fallbackFormData.append('tipo', filterType === 'todos' ? 'auditado' : filterType)
          }
          response = await fetch(`${API_URL}/upload/`, {
            method: "POST",
            body: fallbackFormData,
            signal: controller.signal,
          })
        }
      } catch (fetchError) {
        // Se houver erro de conexão, tenta o fallback
        if (fetchError.name !== 'AbortError' && !fetchError.message.includes('404')) {
          console.warn('Erro ao conectar com /processar_contratos/, tentando /upload/')
          const fallbackFormData = new FormData()
          if (files.length > 0) {
            fallbackFormData.append('file', files[0])
            fallbackFormData.append('tipo', filterType === 'todos' ? 'auditado' : filterType)
          }
          response = await fetch(`${API_URL}/upload/`, {
            method: "POST",
            body: fallbackFormData,
            signal: controller.signal,
          })
        } else {
          throw fetchError
        }
      }
      
      clearTimeout(timeoutId)

      // Verifica se houve erro HTTP
      if (!response.ok) {
        // Backend retorna JSON quando há erro
        let errorMessage = `Erro ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.erro || errorMessage
        } catch (jsonError) {
          // Se não conseguir ler como JSON, tenta ler como texto
          try {
            const textError = await response.text()
            if (textError) {
              errorMessage = textError
            }
          } catch (textError) {
            // Mantém a mensagem padrão
          }
        }
        throw new Error(errorMessage)
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
        const filtroNome = filterType === 'auditado' ? 'AUD' : filterType === 'nauditado' ? 'NAUD' : 'TODOS'
        const tipoArquivo = fileType === 'todos' ? '' : `_${fileType}`
        a.download = `3026${tipoArquivo}_${bankType.toUpperCase()}_${filtroNome}_FILTRADO_${Date.now()}.xlsx`
        document.body.appendChild(a)
        a.click()
        a.remove()

        setTimeout(() => {
          window.URL.revokeObjectURL(url)
        }, 100)

        const payload = {
          message: 'Processamento concluído com sucesso!',
          total_files: files.length,
          bank: bankType
        }
        setResultData(payload)
        resultPayload = payload
      } else {
        // Backend retorna JSON com os resultados
        const result = await response.json()
        
        if (result.erro) {
          throw new Error(result.erro)
        }

        setResultData(result)
        resultPayload = result
      }

      setStatus('success')

      // Adiciona ao histórico
      const historyItem = {
        id: Date.now(),
        filenames: files.map(f => f.name),
        bankType: bankType,
        filterType: filterType,
        fileType: fileType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'success',
        result: resultPayload
      }
      setHistory([historyItem, ...history])
      
    } catch (error) {
      setStatus('error')
      
      // Trata diferentes tipos de erro
      if (error.name === 'AbortError') {
        setErrorMessage('Tempo de processamento excedido. Os arquivos podem ser muito grandes ou o servidor está lento.')
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrorMessage('Erro de conexão: Não foi possível conectar ao servidor. Verifique se o servidor está online e se a URL está correta.')
      } else if (error.message) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Erro ao processar arquivos. Verifique sua conexão com a internet e se o servidor está online.')
      }
      
      // Log do erro para debug
      console.error('Erro ao processar:', error)
      
      // Adiciona ao histórico com erro
      const historyItem = {
        id: Date.now(),
        filenames: files.map(f => f.name),
        bankType: bankType,
        filterType: filterType,
        fileType: fileType,
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
      const filtroNome = filterType === 'auditado' ? 'AUD' : filterType === 'nauditado' ? 'NAUD' : 'TODOS'
      const tipoArquivo = fileType === 'todos' ? '' : `_${fileType}`
      link.download = `3026${tipoArquivo}_${bankType.toUpperCase()}_${filtroNome}_FILTRADO_${new Date().getTime()}.xlsx`
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
            <>
              <MultiFileUpload 
                files={files} 
                onFilesChange={handleFilesChange}
                disabled={status === 'uploading' || status === 'processing'}
                bankType={bankType}
              />

              <FilterSelector 
                value={filterType} 
                onChange={handleFilterChange}
                fileType={fileType}
                onFileTypeChange={handleFileTypeChange}
                disabled={status === 'uploading' || status === 'processing'}
              />

              <PeriodFilter
                enabled={periodFilterEnabled}
                onToggle={setPeriodFilterEnabled}
                referenceDate={referenceDate}
                onDateChange={setReferenceDate}
                monthsBack={monthsBack}
                onMonthsChange={setMonthsBack}
                disabled={status === 'uploading' || status === 'processing'}
              />

              {/* Filtro de Data Habitacional - 3026-11 BEMGE (Coluna W) */}
              {bankType === 'bemge' && files.some(f => f.name.toUpperCase().includes('3026-11')) && (
                <HabitacionalFilter
                  enabled={habitacionalFilterEnabled}
                  onToggle={setHabitacionalFilterEnabled}
                  referenceDate={habitacionalReferenceDate}
                  onDateChange={setHabitacionalReferenceDate}
                  monthsBack={habitacionalMonthsBack}
                  onMonthsChange={setHabitacionalMonthsBack}
                  disabled={status === 'uploading' || status === 'processing'}
                  label="Filtro por Data Habitacional (Coluna W) - 3026-11"
                />
              )}
              
              {/* Filtro MINAS CAIXA 3026-11 (Coluna Y) */}
              {bankType === 'minas_caixa' && files.some(f => f.name.toUpperCase().includes('3026-11')) && (
                <HabitacionalFilter
                  enabled={minasCaixa3026_11FilterEnabled}
                  onToggle={setMinasCaixa3026_11FilterEnabled}
                  referenceDate={minasCaixa3026_11ReferenceDate}
                  onDateChange={setMinasCaixa3026_11ReferenceDate}
                  monthsBack={minasCaixa3026_11MonthsBack}
                  onMonthsChange={setMinasCaixa3026_11MonthsBack}
                  disabled={status === 'uploading' || status === 'processing'}
                  label="Filtro por Data Habitacional (Coluna Y) - 3026-11"
                />
              )}
              
              {/* Filtro 3026-15 (Coluna AB) - BEMGE e MINAS CAIXA */}
              {files.some(f => f.name.toUpperCase().includes('3026-15')) && (
                bankType === 'bemge' ? (
                  <HabitacionalFilter
                    enabled={habitacionalFilterEnabled}
                    onToggle={setHabitacionalFilterEnabled}
                    referenceDate={habitacionalReferenceDate}
                    onDateChange={setHabitacionalReferenceDate}
                    monthsBack={habitacionalMonthsBack}
                    onMonthsChange={setHabitacionalMonthsBack}
                    disabled={status === 'uploading' || status === 'processing'}
                    label="Filtro por Data (Coluna AB) - 3026-15"
                  />
                ) : (
                  <HabitacionalFilter
                    enabled={minasCaixa3026_15FilterEnabled}
                    onToggle={setMinasCaixa3026_15FilterEnabled}
                    referenceDate={minasCaixa3026_15ReferenceDate}
                    onDateChange={setMinasCaixa3026_15ReferenceDate}
                    monthsBack={minasCaixa3026_15MonthsBack}
                    onMonthsChange={setMinasCaixa3026_15MonthsBack}
                    disabled={status === 'uploading' || status === 'processing'}
                    label="Filtro por Data (Coluna AB) - 3026-15"
                  />
                )
              )}
            </>
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
                <p><strong>Filtro:</strong> {
                  filterType === 'auditado' ? 'Auditado (AUD)' : 
                  filterType === 'nauditado' ? 'Não Auditado (NAUD)' : 
                  'Todos'
                }</p>
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
                    Baixar Planilha Consolidada
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

