import React from 'react'
import { motion } from 'framer-motion'
import { DataPreview } from '../types'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface DataPreviewProps {
  preview: DataPreview
}

const DataPreviewComponent: React.FC<DataPreviewProps> = ({ preview }) => {
  // Safe number formatting with fallbacks
  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '0'
    return value.toLocaleString()
  }

  const formatPercentage = (value: number, total: number): string => {
    if (!total || total === 0) return '0.0%'
    return ((value / total) * 100).toFixed(1) + '%'
  }

  // Calculate data quality metrics
  const totalCells = (preview.total_rows || 0) * (preview.columns?.length || 0)
  const totalMissingValues = preview.columns?.reduce((sum, col) => sum + (col.missing_count || 0), 0) || 0
  const dataCompleteness = totalCells > 0 ? ((totalCells - totalMissingValues) / totalCells) * 100 : 100
  
  // Categorize columns by data quality
  const highQualityColumns = preview.columns?.filter(col => (col.missing_count || 0) === 0) || []
  const mediumQualityColumns = preview.columns?.filter(col => {
    const missingRatio = (col.missing_count || 0) / (preview.total_rows || 1)
    return missingRatio > 0 && missingRatio <= 0.1
  }) || []
  const lowQualityColumns = preview.columns?.filter(col => {
    const missingRatio = (col.missing_count || 0) / (preview.total_rows || 1)
    return missingRatio > 0.1
  }) || []

  // Detect potential issues
  const potentialIssues = []
  if (totalMissingValues > 0) {
    potentialIssues.push(`${formatNumber(totalMissingValues)} missing values detected`)
  }
  if (lowQualityColumns.length > 0) {
    potentialIssues.push(`${lowQualityColumns.length} columns with >10% missing data`)
  }
  if (preview.columns?.some(col => col.unique_count === 1)) {
    potentialIssues.push('Constant columns detected (may need removal)')
  }
  if (preview.columns?.some(col => col.unique_count === preview.total_rows)) {
    potentialIssues.push('Potential identifier columns detected')
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Executive Summary */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Dataset Overview</h3>
            <p className="text-sm text-gray-600">Professional data quality assessment</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
            <div className="text-2xl font-bold">{formatNumber(preview.total_rows)}</div>
            <div className="text-blue-100 text-sm">Total Records</div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
            <div className="text-2xl font-bold">{preview.columns?.length || 0}</div>
            <div className="text-green-100 text-sm">Data Columns</div>
          </div>
          
          <div className={`p-4 rounded-lg text-white ${
            dataCompleteness >= 95 
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : dataCompleteness >= 80
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="text-2xl font-bold">{dataCompleteness.toFixed(1)}%</div>
            <div className="opacity-90 text-sm">Data Completeness</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
            <div className="text-2xl font-bold">{formatNumber(totalCells)}</div>
            <div className="text-purple-100 text-sm">Total Data Points</div>
          </div>
        </div>

        {/* Data Quality Assessment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-900">High Quality</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{highQualityColumns.length}</div>
            <div className="text-green-700 text-sm">Complete columns (0% missing)</div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="font-medium text-yellow-900">Medium Quality</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{mediumQualityColumns.length}</div>
            <div className="text-yellow-700 text-sm">Columns with ≤10% missing</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="font-medium text-red-900">Needs Attention</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{lowQualityColumns.length}</div>
            <div className="text-red-700 text-sm">Columns with 10% missing</div>
          </div>
        </div>
      </div>

      {/* Potential Issues Alert */}
      {potentialIssues.length > 0 && (
        <motion.div
          className="card border-l-4 border-yellow-400 bg-yellow-50"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-2">Data Quality Issues Detected</h4>
              <ul className="space-y-1">
                {potentialIssues.map((issue, index) => (
                  <li key={index} className="text-yellow-800 text-sm">• {issue}</li>
                ))}
              </ul>
              <p className="text-yellow-700 text-sm mt-2">
                These issues will be addressed during the cleaning process.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Professional Column Analysis */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Column Analysis</h4>
            <p className="text-sm text-gray-600">Detailed breakdown of each data column</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completeness
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cardinality
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sample Values
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {preview.columns?.map((column, index) => {
                const missingRatio = (column.missing_count || 0) / (preview.total_rows || 1)
                const completeness = (1 - missingRatio) * 100
                const uniqueRatio = (column.unique_count || 0) / (preview.total_rows || 1)
                
                // Calculate quality score (0-100)
                let qualityScore = completeness
                if (uniqueRatio === 1 && (preview.total_rows || 0) > 1) qualityScore -= 20 // Likely identifier
                if (uniqueRatio === 0) qualityScore -= 30 // Constant column
                qualityScore = Math.max(0, Math.min(100, qualityScore))

                const getQualityColor = (score: number) => {
                  if (score >= 90) return 'text-green-600 bg-green-100'
                  if (score >= 70) return 'text-yellow-600 bg-yellow-100'
                  return 'text-red-600 bg-red-100'
                }

                const getCardinalityLabel = (ratio: number, total: number) => {
                  if (ratio === 1 && total > 1) return 'Unique (ID?)'
                  if (ratio === 0) return 'Constant'
                  if (ratio < 0.1) return 'Low'
                  if (ratio < 0.5) return 'Medium'
                  return 'High'
                }

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {column.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-medium rounded-full
                        ${column.type === 'numeric' ? 'bg-blue-100 text-blue-800' :
                          column.type === 'categorical' ? 'bg-green-100 text-green-800' :
                          column.type === 'datetime' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {column.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              completeness >= 95 ? 'bg-green-500' :
                              completeness >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${completeness}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium w-12">
                          {completeness.toFixed(0)}%
                        </span>
                      </div>
                      {(column.missing_count || 0) > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {formatNumber(column.missing_count)} missing
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">{formatNumber(column.unique_count)}</span>
                        <span className="text-gray-400 ml-1">
                          ({formatPercentage(column.unique_count || 0, preview.total_rows || 1)})
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {getCardinalityLabel(uniqueRatio, preview.total_rows || 0)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getQualityColor(qualityScore)}`}>
                        {qualityScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(column.sample_values || []).slice(0, 3).map((val, idx) => (
                            <span 
                              key={idx}
                              className="inline-block bg-gray-100 px-2 py-1 rounded text-xs font-mono"
                            >
                              {val === null || val === undefined ? 'null' : String(val)}
                            </span>
                          ))}
                          {(column.sample_values || []).length > 3 && (
                            <span className="text-xs text-gray-400">+{(column.sample_values || []).length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              }) || []}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Data Preview */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <EyeIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Data Sample</h4>
            <p className="text-sm text-gray-600">First 5 rows of your dataset</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row #
                </th>
                {preview.columns?.map((column, index) => (
                  <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.name}
                  </th>
                )) || []}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(preview.sample_rows || []).slice(0, 5).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-500">
                    {rowIndex + 1}
                  </td>
                  {preview.columns?.map((column, colIndex) => (
                    <td key={colIndex} className="px-4 py-3 text-sm text-gray-600">
                      {row[column.name] === null || row[column.name] === undefined ? (
                        <span className="text-red-400 italic font-medium">null</span>
                      ) : (
                        <span className="font-mono">{String(row[column.name])}</span>
                      )}
                    </td>
                  )) || []}
                </tr>
              )) || []}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professional Recommendations */}
      <div className="card border-l-4 border-blue-400 bg-blue-50">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Professional Recommendations</h4>
            <div className="space-y-2 text-blue-800 text-sm">
              {dataCompleteness < 95 && (
                <div>• Consider imputation strategies for missing values to improve data completeness</div>
              )}
              {lowQualityColumns.length > 0 && (
                <div>• Evaluate columns with &gt;10% missing data - consider removal or advanced imputation</div>
              )}
              {preview.columns?.some(col => col.unique_count === 1) && (
                <div>• Remove constant columns as they provide no analytical value</div>
              )}
              {preview.columns?.some(col => col.unique_count === preview.total_rows) && (
                <div>• Identify and handle unique identifier columns appropriately</div>
              )}
              <div>• Enable outlier detection to identify and handle anomalous values</div>
              <div>• Consider data type optimization for better performance and storage</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default DataPreviewComponent
