import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { ProcessingResult } from '../types'
import SQLQueryInterface from './SQLQueryInterface'
import VisualizationBuilder from './VisualizationBuilder'
import InteractiveDashboard from './InteractiveDashboard'
import DataQualityAssessment from './DataQualityAssessment'
import StatisticalAnalysis from './StatisticalAnalysis'
import ExportOptions from './ExportOptions'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'statistics' | 'sql' | 'visualize' | 'dashboard' | 'export'>('overview')

  const downloadFile = () => {
    window.open(result.download_url, '_blank')
  }

  const downloadReport = () => {
    if (result.report_url) {
      window.open(result.report_url, '_blank')
    }
  }

  // Create mock data summary from result
  const dataSummary = {
    total_rows: result.summary.rows_cleaned || 0,
    total_columns: result.summary.columns || 0,
    numeric_columns: Math.floor((result.summary.columns || 0) * 0.6), // Estimate
    categorical_columns: Math.floor((result.summary.columns || 0) * 0.4), // Estimate
    missing_values: Object.values(result.summary.missing_values_after || {}).reduce((a, b) => a + b, 0),
    duplicate_rows: 0, // Not available in current summary
    memory_usage: (result.summary.rows_cleaned || 0) * (result.summary.columns || 0) * 8, // Estimate
    column_stats: {}
  }

  // Mock data quality metrics
  const qualityMetrics = {
    completeness_score: 92.5,
    consistency_score: 88.0,
    validity_score: 95.2,
    uniqueness_score: 99.1,
    overall_score: 93.7,
    issues: [
      {
        type: 'missing_data' as const,
        severity: 'medium' as const,
        description: 'Some columns have missing values that may impact analysis',
        affected_columns: Object.keys(result.summary.missing_values_after || {}),
        recommendation: 'Consider advanced imputation methods for critical missing values'
      }
    ]
  }

  // Extract column names from summary
  const columns = Object.keys(result.summary.missing_values_before || {}).map(name => ({
    name,
    type: 'numeric' as const,
    missing_count: result.summary.missing_values_after?.[name] || 0,
    unique_count: 0,
    sample_values: []
  }))

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'quality', label: 'Data Quality', icon: CheckCircleIcon },
    { id: 'statistics', label: 'Statistics', icon: ChartBarIcon },
    { id: 'sql', label: 'SQL Query', icon: TableCellsIcon },
    { id: 'visualize', label: 'Visualizations', icon: EyeIcon },
    { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { id: 'export', label: 'Export', icon: ArrowDownTrayIcon }
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Processing Complete!</h2>
            <p className="text-gray-600">Your data has been successfully cleaned and processed.</p>
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
            className="btn-secondary"
          >
            Adjust Settings
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
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2
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
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Processing Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5" />
              <span>Processing Summary</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {result.summary.rows_original?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-blue-700">Original Rows</div>
              </div>
              
              <div className="bg-success-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-success-600">
                  {result.summary.rows_cleaned?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-success-700">Cleaned Rows</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {result.summary.columns || '0'}
                </div>
                <div className="text-sm text-purple-700">Columns</div>
              </div>
              
              <div className="bg-warning-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-warning-600">
                  {result.summary.outliers_detected || '0'}
                </div>
                <div className="text-sm text-warning-700">Outliers Detected</div>
              </div>
            </div>

            {/* Missing Values Comparison */}
            {Object.keys(result.summary.missing_values_before || {}).length > 0 && (
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
                        const afterCount = result.summary.missing_values_after?.[column] || 0
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
          </div>

          {/* Audit Trail */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Audit Trail</h3>
            <div className="space-y-2">
              {result.audit_trail.map((entry, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                  <div className="text-sm text-gray-700 font-mono">{entry}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'quality' && (
        <motion.div
          key="quality"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DataQualityAssessment metrics={qualityMetrics} />
        </motion.div>
      )}

      {activeTab === 'statistics' && (
        <motion.div
          key="statistics"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StatisticalAnalysis 
            versionId={result.version_id} 
            columns={columns.map(col => col.name)}
          />
        </motion.div>
      )}

      {activeTab === 'sql' && (
        <motion.div
          key="sql"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <VisualizationBuilder 
            versionId={result.version_id} 
            columns={columns}
          />
        </motion.div>
      )}

      {activeTab === 'dashboard' && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <InteractiveDashboard 
            dataSummary={dataSummary}
            versionId={result.version_id}
          />
        </motion.div>
      )}

      {activeTab === 'export' && (
        <motion.div
          key="export"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ExportOptions 
            versionId={result.version_id}
            filename={result.cleaned_filename}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

export default EnhancedResultsSection

