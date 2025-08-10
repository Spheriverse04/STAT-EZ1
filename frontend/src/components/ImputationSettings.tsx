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
            <div className="space-y-3">
              {columnsWithMissing.map((column) => (
                <div key={column.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{column.name}</div>
                    <div className="text-sm text-gray-600">
                      {column.missing_count} missing values ({((column.missing_count / (column.missing_count + column.unique_count)) * 100).toFixed(1)}%)
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
                          <option value="mean">Mean</option>
                          <option value="median">Median</option>
                          <option value="knn">KNN</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Method Explanations */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Imputation Methods Explained</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div><strong>Mean:</strong> Best for normally distributed data without outliers</div>
              <div><strong>Median:</strong> Robust against outliers, good for skewed data</div>
              <div><strong>KNN:</strong> Most sophisticated, considers relationships between variables</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default ImputationSettings
