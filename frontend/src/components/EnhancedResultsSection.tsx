import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { ProcessingResult, DataSummary, ColumnInfo } from '../types'
import SQLQueryInterface from './SQLQueryInterface'
import VisualizationBuilder from './VisualizationBuilder'
import InteractiveDashboard from './InteractiveDashboard'

interface EnhancedResultsSectionProps {
  result: ProcessingResult
  onNewUpload: () => void
  onReconfigure: () => void
}

const EnhancedResultsSection: React.FC<EnhancedResultsSectionProps> = ({ 
  result, 
  onNewUpload, 
  onReconfigure 
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'sql' | 'visualize' | 'dashboard'>('summary')
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [columns, setColumns] = useState<ColumnInfo[]>([])

  useEffect(() => {
    loadDataSummary()
  }, [result.version_id])

  const loadDataSummary = async () => {
    try {
      const response = await fetch(`/api/data-summary/${result.version_id}`)
      if (response.ok) {
        const summary = await response.json()
        setDataSummary(summary)
        
        // Convert column stats to ColumnInfo format
        const columnInfo: ColumnInfo[] = Object.entries(summary.column_stats).map(([name, stats]: [string, any]) => ({
          name,
          type: stats.type,
          missing_count: stats.missing_count,
          unique_count: stats.unique_count || 0,
          sample_values: []
        }))
        setColumns(columnInfo)
      }
    } catch (error) {
      console.error('Failed to load data summary:', error)
    }
  }

  const downloadFile = () => {
    window.open(result.download_url, '_blank')
  }

  const downloadReport = () => {
    if (result.report_url) {
      window.open(result.report_url, '_blank')
    }
  }

  const tabs = [
    { id: 'summary', label: 'Summary', icon: ChartBarIcon, description: 'Processing overview' },
    { id: 'sql', label: 'SQL Queries', icon: TableCellsIcon, description: 'Query your data' },
    { id: 'visualize', label: 'Visualizations', icon: EyeIcon, description: 'Create charts' },
    { id: 'dashboard', label: 'Dashboard', icon: DocumentTextIcon, description: 'Interactive insights' }
  ] as const

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Success Header */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-success-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Processing Complete!</h2>
            <p className="text-gray-600">Your data has been successfully cleaned and is ready for analysis.</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Version ID:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{result.version_id}</code>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadFile}
            className="btn-primary flex items-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Download Cleaned Data</span>
          </button>
          
          {result.report_url && (
            <button
              onClick={downloadReport}
              className="btn-secondary flex items-center space-x-2"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          )}
          
          <button
            onClick={onReconfigure}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Adjust Settings</span>
          </button>
          
          <button
            onClick={onNewUpload}
            className="btn-secondary"
          >
            Process New File
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Processing Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.rows_original.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">Original Rows</div>
                </div>
                
                <div className="bg-success-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-success-600">
                    {result.summary.rows_cleaned.toLocaleString()}
                  </div>
                  <div className="text-sm text-success-700">Cleaned Rows</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.summary.columns}
                  </div>
                  <div className="text-sm text-purple-700">Columns</div>
                </div>
                
                <div className="bg-warning-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-warning-600">
                    {result.summary.outliers_detected}
                  </div>
                  <div className="text-sm text-warning-700">Outliers Detected</div>
                </div>
              </div>

              {/* Missing Values Comparison */}
              {Object.keys(result.summary.missing_values_before).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Missing Values Treatment</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Column
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Before
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            After
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(result.summary.missing_values_before).map(([column, beforeCount]) => {
                          const afterCount = result.summary.missing_values_after[column] || 0
                          const isFixed = afterCount < beforeCount
                          
                          return (
                            <tr key={column} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {column}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <span className="text-warning-600 font-medium">{beforeCount}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <span className={afterCount === 0 ? 'text-success-600 font-medium' : 'text-warning-600 font-medium'}>
                                  {afterCount}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {isFixed ? (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-success-100 text-success-800 rounded-full">
                                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                                    Fixed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded-full">
                                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                    Remaining
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Processing Audit Trail</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.audit_trail.map((entry, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                      <div className="text-sm text-gray-700 font-mono">{entry}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'sql' && (
          <motion.div
            key="sql"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SQLQueryInterface 
              versionId={result.version_id} 
              columns={columns.map(col => col.name)}
            />
          </motion.div>
        )}

        {activeTab === 'visualize' && (
          <motion.div
            key="visualize"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <VisualizationBuilder 
              versionId={result.version_id} 
              columns={columns}
            />
          </motion.div>
        )}

        {activeTab === 'dashboard' && dataSummary && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <InteractiveDashboard 
              dataSummary={dataSummary}
              versionId={result.version_id}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default EnhancedResultsSection
