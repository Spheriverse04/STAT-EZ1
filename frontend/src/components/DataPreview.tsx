import React from 'react'
import { motion } from 'framer-motion'
import { DataPreview } from '../types'

interface DataPreviewProps {
  preview: DataPreview
}

const DataPreviewComponent: React.FC<DataPreviewProps> = ({ preview }) => {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Overview</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-primary-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{preview.total_rows.toLocaleString()}</div>
          <div className="text-sm text-primary-700">Total Rows</div>
        </div>
        
        <div className="bg-success-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-success-600">{preview.columns.length}</div>
          <div className="text-sm text-success-700">Columns</div>
        </div>
        
        <div className="bg-warning-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-warning-600">
            {preview.columns.reduce((sum, col) => sum + col.missing_count, 0).toLocaleString()}
          </div>
          <div className="text-sm text-warning-700">Missing Values</div>
        </div>
      </div>

      {/* Column Information */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Column Details</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missing
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sample Values
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {preview.columns.map((column, index) => (
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
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {column.missing_count > 0 ? (
                      <span className="text-warning-600 font-medium">
                        {column.missing_count} ({((column.missing_count / preview.total_rows) * 100).toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-success-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {column.unique_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="max-w-xs truncate">
                      {column.sample_values.slice(0, 3).map(val => 
                        val === null || val === undefined ? 'null' : String(val)
                      ).join(', ')}
                      {column.sample_values.length > 3 && '...'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Data */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Sample Data (First 5 Rows)</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {preview.columns.map((column, index) => (
                  <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {preview.sample_rows.slice(0, 5).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {preview.columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-4 py-3 text-sm text-gray-600">
                      {row[column.name] === null || row[column.name] === undefined ? (
                        <span className="text-gray-400 italic">null</span>
                      ) : (
                        String(row[column.name])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

export default DataPreviewComponent
