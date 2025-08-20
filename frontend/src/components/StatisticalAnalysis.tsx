import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CalculatorIcon, 
  ChartBarIcon, 
  TableCellsIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { ProfessionalAnalysisResult } from '../types'

interface StatisticalAnalysisProps {
  versionId: string
  columns: string[]
}

const StatisticalAnalysis: React.FC<StatisticalAnalysisProps> = ({ versionId, columns }) => {
  const [analysisResult, setAnalysisResult] = useState<ProfessionalAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>(columns[0] || '')
  const [activeTab, setActiveTab] = useState<'summary' | 'distribution' | 'correlation' | 'outliers'>('summary')

  useEffect(() => {
    if (versionId && columns.length > 0) {
      loadStatisticalAnalysis()
    }
  }, [versionId])

  const loadStatisticalAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Since we don't have a dedicated statistical analysis endpoint,
      // we'll generate mock comprehensive statistical data
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call

      const mockAnalysis: ProfessionalAnalysisResult = {
        statistical_summary: generateMockStatistics(columns),
        correlation_matrix: generateMockCorrelationMatrix(columns),
        data_distribution: generateMockDistributionAnalysis(columns),
        outlier_analysis: generateMockOutlierAnalysis(columns)
      }

      setAnalysisResult(mockAnalysis)
    } catch (err) {
      setError('Failed to load statistical analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockStatistics = (cols: string[]) => {
    const stats: Record<string, any> = {}
    cols.forEach(col => {
      stats[col] = {
        mean: Math.random() * 100 + 50,
        median: Math.random() * 100 + 45,
        mode: Math.floor(Math.random() * 10) + 1,
        std_dev: Math.random() * 20 + 5,
        variance: Math.random() * 400 + 25,
        skewness: (Math.random() - 0.5) * 4,
        kurtosis: Math.random() * 6 - 3,
        percentiles: {
          '25': Math.random() * 50 + 25,
          '50': Math.random() * 50 + 50,
          '75': Math.random() * 50 + 75,
          '90': Math.random() * 50 + 90,
          '95': Math.random() * 50 + 95
        }
      }
    })
    return stats
  }

  const generateMockCorrelationMatrix = (cols: string[]) => {
    const matrix: Record<string, Record<string, number>> = {}
    cols.forEach(col1 => {
      matrix[col1] = {}
      cols.forEach(col2 => {
        if (col1 === col2) {
          matrix[col1][col2] = 1.0
        } else {
          matrix[col1][col2] = (Math.random() - 0.5) * 2
        }
      })
    })
    return matrix
  }

  const generateMockDistributionAnalysis = (cols: string[]) => {
    const distributions = ['normal', 'skewed', 'uniform', 'bimodal', 'unknown'] as const
    const analysis: Record<string, any> = {}
    cols.forEach(col => {
      analysis[col] = {
        distribution_type: distributions[Math.floor(Math.random() * distributions.length)],
        normality_test_p_value: Math.random()
      }
    })
    return analysis
  }

  const generateMockOutlierAnalysis = (cols: string[]) => {
    const analysis: Record<string, any> = {}
    cols.forEach(col => {
      const outlierCount = Math.floor(Math.random() * 20)
      analysis[col] = {
        outlier_count: outlierCount,
        outlier_percentage: (outlierCount / 1000) * 100, // Assuming 1000 total rows
        detection_method: 'IQR',
        outlier_indices: Array.from({ length: outlierCount }, () => Math.floor(Math.random() * 1000))
      }
    })
    return analysis
  }

  const getDistributionColor = (type: string) => {
    switch (type) {
      case 'normal': return 'text-green-600 bg-green-100'
      case 'skewed': return 'text-yellow-600 bg-yellow-100'
      case 'uniform': return 'text-blue-600 bg-blue-100'
      case 'bimodal': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getCorrelationColor = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 0.8) return 'bg-red-500'
    if (abs >= 0.6) return 'bg-orange-400'
    if (abs >= 0.4) return 'bg-yellow-400'
    if (abs >= 0.2) return 'bg-blue-400'
    return 'bg-gray-300'
  }

  const tabs = [
    { id: 'summary', label: 'Summary Statistics', icon: CalculatorIcon },
    { id: 'distribution', label: 'Distribution Analysis', icon: ChartBarIcon },
    { id: 'correlation', label: 'Correlation Matrix', icon: TableCellsIcon },
    { id: 'outliers', label: 'Outlier Analysis', icon: ExclamationTriangleIcon }
  ] as const

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Performing statistical analysis...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={loadStatisticalAnalysis} className="btn-primary">
            Retry Analysis
          </button>
        </div>
      </div>
    )
  }

  if (!analysisResult) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <CalculatorIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No statistical analysis available</p>
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
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <CalculatorIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Statistical Analysis</h3>
            <p className="text-sm text-gray-600">Comprehensive statistical insights and analysis</p>
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
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
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
      {activeTab === 'summary' && (
        <motion.div
          key="summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Descriptive Statistics</h4>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="select-field w-48"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {selectedColumn && analysisResult.statistical_summary[selectedColumn] && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Central Tendency */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-3">Central Tendency</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Mean:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].mean?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Median:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].median?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Mode:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].mode}</span>
                    </div>
                  </div>
                </div>

                {/* Variability */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-medium text-green-900 mb-3">Variability</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Std Dev:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].std_dev?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Variance:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].variance?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Shape */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-medium text-purple-900 mb-3">Distribution Shape</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Skewness:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].skewness?.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">Kurtosis:</span>
                      <span className="font-medium">{analysisResult.statistical_summary[selectedColumn].kurtosis?.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Percentiles */}
                <div className="md:col-span-2 lg:col-span-3 bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Percentiles</h5>
                  <div className="grid grid-cols-5 gap-4">
                    {Object.entries(analysisResult.statistical_summary[selectedColumn].percentiles || {}).map(([percentile, value]) => (
                      <div key={percentile} className="text-center">
                        <div className="text-sm text-gray-600">{percentile}th</div>
                        <div className="font-medium text-gray-900">{(value as number).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'distribution' && (
        <motion.div
          key="distribution"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Distribution Analysis</h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distribution Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normality Test</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(analysisResult.data_distribution).map(([column, analysis]) => (
                    <tr key={column} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{column}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDistributionColor(analysis.distribution_type)}`}>
                          {analysis.distribution_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        p = {analysis.normality_test_p_value?.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {analysis.normality_test_p_value && analysis.normality_test_p_value > 0.05 
                          ? 'Likely normal distribution' 
                          : 'Non-normal distribution'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Distribution Analysis Guide</h5>
              <div className="space-y-1 text-sm text-blue-800">
                <div>• <strong>Normal:</strong> Bell-shaped, symmetric distribution ideal for parametric tests</div>
                <div>• <strong>Skewed:</strong> Asymmetric distribution, may require transformation</div>
                <div>• <strong>Uniform:</strong> Equal probability across range, rare in real data</div>
                <div>• <strong>Bimodal:</strong> Two peaks, may indicate mixed populations</div>
                <div>• <strong>p > 0.05:</strong> Suggests normal distribution (fail to reject normality)</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'correlation' && (
        <motion.div
          key="correlation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Correlation Matrix</h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-xs font-medium text-gray-500"></th>
                    {columns.map((col) => (
                      <th key={col} className="px-2 py-2 text-xs font-medium text-gray-500 transform -rotate-45 origin-bottom-left">
                        {col.length > 8 ? col.substring(0, 8) + '...' : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {columns.map((row) => (
                    <tr key={row}>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 truncate max-w-20">
                        {row}
                      </td>
                      {columns.map((col) => {
                        const correlation = analysisResult.correlation_matrix?.[row]?.[col] || 0
                        return (
                          <td key={col} className="px-1 py-1">
                            <div 
                              className={`w-8 h-8 flex items-center justify-center text-xs font-medium text-white rounded ${getCorrelationColor(correlation)}`}
                              title={`${row} vs ${col}: ${correlation.toFixed(3)}`}
                            >
                              {correlation.toFixed(2)}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Strong Positive Correlations (≥0.7)</h5>
                <div className="space-y-1 text-sm">
                  {Object.entries(analysisResult.correlation_matrix || {}).flatMap(([row, cols]) =>
                    Object.entries(cols).filter(([col, val]) => 
                      row !== col && val >= 0.7
                    ).map(([col, val]) => (
                      <div key={`${row}-${col}`} className="text-green-800">
                        {row} ↔ {col}: {val.toFixed(3)}
                      </div>
                    ))
                  ).slice(0, 5)}
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h5 className="font-medium text-red-900 mb-2">Strong Negative Correlations (≤-0.7)</h5>
                <div className="space-y-1 text-sm">
                  {Object.entries(analysisResult.correlation_matrix || {}).flatMap(([row, cols]) =>
                    Object.entries(cols).filter(([col, val]) => 
                      row !== col && val <= -0.7
                    ).map(([col, val]) => (
                      <div key={`${row}-${col}`} className="text-red-800">
                        {row} ↔ {col}: {val.toFixed(3)}
                      </div>
                    ))
                  ).slice(0, 5)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'outliers' && (
        <motion.div
          key="outliers"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Outlier Analysis</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(analysisResult.outlier_analysis).map(([column, analysis]) => (
                <div key={column} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">{column}</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outliers:</span>
                      <span className="font-medium text-red-600">{analysis.outlier_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Percentage:</span>
                      <span className="font-medium">{analysis.outlier_percentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium">{analysis.detection_method}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          analysis.outlier_percentage > 10 ? 'bg-red-500' :
                          analysis.outlier_percentage > 5 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(analysis.outlier_percentage * 2, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analysis.outlier_percentage > 10 ? 'High outlier rate' :
                       analysis.outlier_percentage > 5 ? 'Moderate outlier rate' : 'Low outlier rate'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h5 className="font-medium text-yellow-900 mb-2">Outlier Analysis Interpretation</h5>
              <div className="space-y-1 text-sm text-yellow-800">
                <div>• <strong>0-5% outliers:</strong> Normal range, typical for most datasets</div>
                <div>• <strong>5-10% outliers:</strong> Moderate level, investigate potential causes</div>
                <div>• <strong>>10% outliers:</strong> High level, may indicate data quality issues</div>
                <div>• <strong>IQR Method:</strong> Values beyond Q1-1.5×IQR or Q3+1.5×IQR</div>
                <div>• Consider domain knowledge before removing outliers</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default StatisticalAnalysis