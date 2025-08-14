import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import UploadSection from './components/UploadSection'
import ProcessingOptions from './components/ProcessingOptions'
import EnhancedResultsSection from './components/EnhancedResultsSection'
import VersionHistory from './components/VersionHistory'
import MixedColumnDecisions from './components/MixedColumnDecisions'
import { ProcessingConfig, ProcessingResult, DatasetVersion } from './types'

function App() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'results'>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [urlData, setUrlData] = useState<any>(null)
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig | null>(null)
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [versions, setVersions] = useState<DatasetVersion[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [mixedColumns, setMixedColumns] = useState<any[]>([])
  const [showMixedColumnDecisions, setShowMixedColumnDecisions] = useState(false)
  const [columnDecisions, setColumnDecisions] = useState<Record<string, any>>({})

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    setUrlData(null)
    setCurrentStep('configure')
  }

  const handleURLUpload = (data: any) => {
    setUrlData(data)
    setUploadedFile(null)
    setCurrentStep('configure')
  }

  const handleProcessingStart = async (config: ProcessingConfig) => {
    setProcessingConfig(config)
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      
      if (uploadedFile) {
        formData.append('file', uploadedFile)
      } else if (urlData) {
        formData.append('temp_path', urlData.temp_path)
        formData.append('filename', urlData.filename)
      }
      
      formData.append('config', JSON.stringify(config))
      formData.append('column_decisions', JSON.stringify(columnDecisions))

      const response = await fetch('/api/process-with-decisions', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      const result: ProcessingResult = await response.json()
      setProcessingResult(result)
      setCurrentStep('results')
      
      // Add to version history
      const newVersion: DatasetVersion = {
        id: result.version_id,
        timestamp: new Date().toISOString(),
        filename: result.cleaned_filename,
        config,
        summary: result.summary,
        auditTrail: result.audit_trail
      }
      setVersions(prev => [newVersion, ...prev])
      
    } catch (error) {
      console.error('Processing error:', error)
      alert(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMixedColumnDecisions = (decisions: Record<string, any>) => {
    setColumnDecisions(decisions)
    setShowMixedColumnDecisions(false)
    // Continue with processing
  }

  const handleSkipMixedColumns = () => {
    // Use safe defaults for all mixed columns
    const safeDecisions: Record<string, any> = {}
    mixedColumns.forEach(col => {
      const safeOption = col.suggestions.find((s: any) => s.confidence === 'safe') || col.suggestions[0]
      safeDecisions[col.column_name] = safeOption
    })
    setColumnDecisions(safeDecisions)
    setShowMixedColumnDecisions(false)
  }

  const handleVersionSwitch = (versionId: string) => {
    const version = versions.find(v => v.id === versionId)
    if (version) {
      // Create a mock ProcessingResult from the version
      const mockResult: ProcessingResult = {
        version_id: version.id,
        original_filename: version.filename,
        cleaned_filename: version.filename,
        summary: version.summary,
        audit_trail: version.auditTrail,
        download_url: `/api/download/${version.filename}`
      }
      setProcessingResult(mockResult)
      setProcessingConfig(version.config)
      setCurrentStep('results')
    }
  }
  const handleNewUpload = () => {
    setCurrentStep('upload')
    setUploadedFile(null)
    setUrlData(null)
    setProcessingConfig(null)
    setProcessingResult(null)
    setMixedColumns([])
    setColumnDecisions({})
  }

  const handleReconfigure = () => {
    setCurrentStep('configure')
    setProcessingResult(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {currentStep === 'upload' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <UploadSection onFileUpload={handleFileUpload} onURLUpload={handleURLUpload} />
                </motion.div>
              )}

              {currentStep === 'configure' && (uploadedFile || urlData) && (
                <motion.div
                  key="configure"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProcessingOptions
                    file={uploadedFile}
                    urlData={urlData}
                    onProcess={handleProcessingStart}
                    onBack={handleNewUpload}
                    isProcessing={isProcessing}
                    onMixedColumnsDetected={(columns) => {
                      setMixedColumns(columns)
                      if (columns.length > 0) {
                        setShowMixedColumnDecisions(true)
                      }
                    }}
                  />
                </motion.div>
              )}

              {currentStep === 'results' && processingResult && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <EnhancedResultsSection
                    result={processingResult}
                    onNewUpload={handleNewUpload}
                    onReconfigure={handleReconfigure}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <VersionHistory 
              versions={versions} 
              onVersionSwitch={handleVersionSwitch}
            />
          </div>
        </div>

        {/* Mixed Column Decisions Modal */}
        {showMixedColumnDecisions && mixedColumns.length > 0 && (
          <MixedColumnDecisions
            mixedColumns={mixedColumns}
            onDecisionsMade={handleMixedColumnDecisions}
            onSkip={handleSkipMixedColumns}
          />
        )}
      </main>
    </div>
  )
}

export default App



