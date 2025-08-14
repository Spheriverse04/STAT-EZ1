import React from 'react'
import { motion } from 'framer-motion'
import { Control, Controller, useWatch } from 'react-hook-form'
import { ProcessingConfig, ColumnInfo } from '../types'

interface ImputationSettingsProps {
  control: Control<ProcessingConfig>
  columns: ColumnInfo[]
}

const ImputationSettings: React.FC<ImputationSettingsProps> = ({ control, columns }) => {
  const imputationMethod = useWatch({
    control,
    name: 'imputation.method'
  })

  const columnsWithMissing = columns.filter(col => col.missing_count > 0)

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Missing Value Imputation</h3>
      
      {columnsWithMissing.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-success-600 text-4xl mb-2">✓</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Missing Values Detected</h4>
          <p className="text-gray-600">Your dataset is complete and doesn't require imputation.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Global Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Imputation Method
            </label>
            <Controller
              name="imputation.method"
              control={control}
              render={({ field }) => (
                <select {...field} className="select-field">
                  <option value="mean">Mean (Average)</option>
                  <option value="median">Median (Middle Value)</option>
                  <option value="knn">KNN (K-Nearest Neighbors)</option>
                </select>
              )}
            />
            <p className="mt-1 text-sm text-gray-500">
              {imputationMethod === 'mean' && 'Replace missing values with the column average'}
              {imputationMethod === 'median' && 'Replace missing values with the column median'}
              {imputationMethod === 'knn' && 'Use similar rows to predict missing values'}
            </p>
          </div>

          {/* KNN Neighbors Setting */}
          {imputationMethod === 'knn' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Neighbors
              </label>
              <Controller
                name="imputation.knn_neighbors"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="1"
                    max="20"
                    className="input-field w-32"
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                )}
              />
              <p className="mt-1 text-sm text-gray-500">
                Number of similar rows to consider (1-20)
              </p>
            </motion.div>
          )}

          {/* Column-Specific Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Columns with Missing Values ({columnsWithMissing.length})
            </h4>
            
            {columnsWithMissing.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Professional Recommendations:</h5>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>• <strong>Mean:</strong> Best for normally distributed numeric data</div>
                  <div>• <strong>Median:</strong> Robust for skewed data or presence of outliers</div>
                  <div>• <strong>KNN:</strong> Most sophisticated, preserves relationships between variables</div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {columnsWithMissing.map((column) => (
                <div key={column.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{column.name}</div>
                    <div className="text-sm text-gray-600">
                      <span className="text-red-600 font-medium">{column.missing_count}</span> missing values
                      <span className="ml-2 text-gray-500">
                        ({column.missing_count > 0 ? ((column.missing_count / Math.max(column.missing_count + column.unique_count, 1)) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Type: {column.type} • Unique values: {column.unique_count?.toLocaleString() || 0}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Controller
                      name={`imputation.column_specific.${column.name}` as any}
                      control={control}
                      render={({ field }) => (
                        <select 
                          {...field} 
                          className="select-field w-32"
                          defaultValue=""
                        >
                          <option value="">Use Default</option>
                          {column.type === 'numeric' && <option value="mean">Mean</option>}
                          {column.type === 'numeric' && <option value="median">Median</option>}
                          <option value="knn">KNN</option>
                          <option value="mode">Most Frequent</option>
                          <option value="forward_fill">Forward Fill</option>
                          <option value="backward_fill">Backward Fill</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Method Explanations */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Professional Imputation Methods</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div><strong>Mean:</strong> Arithmetic average - ideal for symmetric, normally distributed numeric data</div>
              <div><strong>Median:</strong> Middle value - robust against outliers and skewed distributions</div>
              <div><strong>KNN:</strong> K-Nearest Neighbors - uses similar records to predict missing values</div>
              <div><strong>Most Frequent:</strong> Mode imputation - best for categorical data</div>
              <div><strong>Forward/Backward Fill:</strong> Time-series imputation using adjacent values</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default ImputationSettings
