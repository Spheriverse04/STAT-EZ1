import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ArrowLeftIcon, CogIcon, PlayIcon } from '@heroicons/react/24/outline'
import { ProcessingConfig, DataPreview, ColumnInfo } from '../types'
import DataPreviewComponent from './DataPreview'
import ImputationSettings from './ImputationSettings'
import OutlierSettings from './OutlierSettings'
import RuleSettings from './RuleSettings'
import SchemaMapping from './SchemaMapping'

interface ProcessingOptionsProps {
  file: File | null
  urlData?: any
  onProcess: (config: ProcessingConfig) => void
  onBack: () => void
  isProcessing: boolean
  onMixedColumnsDetected?: (columns: any[]) => void
}

const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({
  file,
  urlData,
  onProcess,
  onBack,
  isProcessing,
  onMixedColumnsDetected
}) => {
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'imputation' | 'outliers' | 'rules' | 'mapping'>('preview')
  
  const { handleSubmit, control, watch, setValue } = useForm<ProcessingConfig>({
    defaultValues: {
      imputation: {
        method: 'mean',
        delete_null_rows: false,
        knn_neighbors: 5,
        column_specific: {}
      },
      outlier_detection: {
        enabled: true,
        method: 'zscore',
        threshold: 3,
        action: 'flag'
      },
      rules: {
        enabled: false,
        custom_rules: []
      },
      weights: {
        enabled: false
      },
      schema_mapping: {}
    }
  })

  useEffect(() => {
    if (file || urlData) {
      loadDataPreview()
    }
  }, [file])

  const loadDataPreview = async () => {
    setLoading(true)
    setUploadError(null)
    
    try {
      const formData = new FormData()
      
      if (file) {
        formData.append('file', file)
      } else if (urlData) {
        formData.append('temp_path', urlData.temp_path)
        formData.append('filename', urlData.filename)
      } else {
        setUploadError('No file or URL data provided')
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const preview: DataPreview = await response.json()
        
        // Ensure all required fields have default values
        const safePreview: DataPreview = {
          columns: preview.columns || [],
          sample_rows: preview.sample_rows || [],
          total_rows: preview.total_rows || 0,
          mixed_columns: preview.mixed_columns || [],
          requires_decisions: preview.requires_decisions || false,
          data_quality_score: preview.data_quality_score || 0,
          recommendations: preview.recommendations || []
        }
        
        setDataPreview(safePreview)
        
        // Check for mixed columns and notify parent
        if (safePreview.mixed_columns && safePreview.mixed_columns.length > 0 && onMixedColumnsDetected) {
          onMixedColumnsDetected(safePreview.mixed_columns)
        }
        
        // Initialize schema mapping with column names
        const mapping: Record<string, string> = {}
        safePreview.columns.forEach(col => {
          mapping[col.name] = col.name
        })
        setValue('schema_mapping', mapping)
      } else {
        const errorData = await response.json()
        console.error('Preview failed:', errorData)
        setUploadError(errorData.error || 'Failed to analyze dataset')
      }
    } catch (error) {
      console.error('Failed to load preview:', error)
      setUploadError('Network error while analyzing dataset')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: ProcessingConfig) => {
    onProcess(data)
  }

  const tabs = [
    { id: 'preview', label: 'Data Preview', icon: '📊' },
    { id: 'imputation', label: 'Missing Values', icon: '🔧' },
    { id: 'outliers', label: 'Outliers', icon: '📈' },
    { id: 'rules', label: 'Rules', icon: '⚙️' },
    { id: 'mapping', label: 'Schema', icon: '🗂️' }
  ] as const

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Analyzing your data...</span>
        </div>
      </div>
    )
  }

  if (uploadError) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
          <p className="text-gray-600 mb-4">{uploadError}</p>
          <button onClick={onBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    )
  }
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Configure Processing</h2>
              <p className="text-gray-600">
                File: {file?.name || urlData?.filename || 'Dataset'}
                {urlData && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    From URL
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <CogIcon className="w-4 h-4" />
            <span>Step 2 of 3</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {activeTab === 'preview' && dataPreview && (
          <DataPreviewComponent preview={dataPreview} />
        )}
        
        {activeTab === 'imputation' && dataPreview && (
          <ImputationSettings 
            control={control} 
            columns={dataPreview.columns.filter(col => col.type === 'numeric')} 
          />
        )}
        
        {activeTab === 'outliers' && (
          <OutlierSettings control={control} />
        )}
        
        {activeTab === 'rules' && dataPreview && (
          <RuleSettings control={control} columns={dataPreview.columns} />
        )}
        
        {activeTab === 'mapping' && dataPreview && (
          <SchemaMapping control={control} columns={dataPreview.columns} />
        )}

        {/* Action Buttons */}
        <div className="card">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Ready to process your data with the configured settings.
              {dataPreview?.requires_decisions && (
                <span className="block mt-1 text-yellow-600 font-medium">
                  ⚠️ Some columns contain mixed data types and may require your input during processing.
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onBack}
                className="btn-secondary"
              >
                Back to Upload
              </button>
              
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    <span>Start Processing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  )
}

export default ProcessingOptions



