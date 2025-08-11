import React from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { DataSummary } from '../types'

interface InteractiveDashboardProps {
  dataSummary: DataSummary
  versionId: string
}

const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({ dataSummary, versionId }) => {
  const dataQualityScore = Math.round(
    ((dataSummary.total_rows * dataSummary.total_columns - dataSummary.missing_values) / 
     (dataSummary.total_rows * dataSummary.total_columns)) * 100
  )

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{dataSummary.total_rows.toLocaleString()}</div>
              <div className="text-blue-100">Total Records</div>
            </div>
            <TableCellsIcon className="w-8 h-8 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{dataSummary.total_columns}</div>
              <div className="text-green-100">Data Columns</div>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{dataSummary.numeric_columns}</div>
              <div className="text-purple-100">Numeric Columns</div>
            </div>
            <InformationCircleIcon className="w-8 h-8 text-purple-200" />
          </div>
        </motion.div>

        <motion.div
          className={`p-6 rounded-xl text-white ${
            dataQualityScore >= 90 
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : dataQualityScore >= 70
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{dataQualityScore}%</div>
              <div className="opacity-90">Data Quality</div>
            </div>
            {dataQualityScore >= 90 ? (
              <CheckCircleIcon className="w-8 h-8 opacity-80" />
            ) : (
              <ExclamationTriangleIcon className="w-8 h-8 opacity-80" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Data Quality Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="bg-white p-6 rounded-xl shadow-sm border"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Composition</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Numeric Columns</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(dataSummary.numeric_columns / dataSummary.total_columns) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{dataSummary.numeric_columns}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Categorical Columns</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(dataSummary.categorical_columns / dataSummary.total_columns) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{dataSummary.categorical_columns}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Missing Values</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${(dataSummary.missing_values / (dataSummary.total_rows * dataSummary.total_columns)) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{dataSummary.missing_values.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-xl shadow-sm border"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dataset Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completeness</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(dataQualityScore)}`}>
                {dataQualityScore}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Duplicate Rows</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                dataSummary.duplicate_rows === 0 ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
              }`}>
                {dataSummary.duplicate_rows}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Memory Usage</span>
              <span className="text-sm font-medium text-gray-900">
                {formatBytes(dataSummary.memory_usage)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Column Statistics */}
      <motion.div
        className="bg-white p-6 rounded-xl shadow-sm border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Column Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statistics</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(dataSummary.column_stats).map(([columnName, stats]) => (
                <tr key={columnName} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{columnName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-medium rounded-full
                      ${stats.type === 'numeric' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                    `}>
                      {stats.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {stats.missing_count > 0 ? (
                      <span className="text-red-600 font-medium">{stats.missing_count}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {stats.type === 'numeric' ? (
                      <div className="space-y-1">
                        {stats.mean !== null && <div>Mean: {stats.mean?.toFixed(2)}</div>}
                        {stats.min !== null && stats.max !== null && (
                          <div>Range: {stats.min?.toFixed(2)} - {stats.max?.toFixed(2)}</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>Unique: {stats.unique_count}</div>
                        {stats.most_frequent && <div>Most frequent: {stats.most_frequent}</div>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default InteractiveDashboard
