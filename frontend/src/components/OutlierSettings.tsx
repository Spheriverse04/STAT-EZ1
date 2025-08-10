import React from 'react'
import { motion } from 'framer-motion'
import { Control, Controller, useWatch } from 'react-hook-form'
import { ProcessingConfig } from '../types'

interface OutlierSettingsProps {
  control: Control<ProcessingConfig>
}

const OutlierSettings: React.FC<OutlierSettingsProps> = ({ control }) => {
  const outlierEnabled = useWatch({
    control,
    name: 'outlier_detection.enabled'
  })

  const outlierMethod = useWatch({
    control,
    name: 'outlier_detection.method'
  })

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Outlier Detection</h3>
      
      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-gray-900">Enable Outlier Detection</h4>
            <p className="text-sm text-gray-600">Automatically identify and handle unusual values</p>
          </div>
          <Controller
            name="outlier_detection.enabled"
            control={control}
            render={({ field }) => (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={field.value}
                  onChange={field.onChange}
                />
                <div className={`
                  w-11 h-6 rounded-full transition-colors
                  ${field.value ? 'bg-primary-600' : 'bg-gray-200'}
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow transform transition-transform
                    ${field.value ? 'translate-x-5' : 'translate-x-0'}
                  `} />
                </div>
              </label>
            )}
          />
        </div>

        {outlierEnabled && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Detection Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detection Method
              </label>
              <Controller
                name="outlier_detection.method"
                control={control}
                render={({ field }) => (
                  <select {...field} className="select-field">
                    <option value="zscore">Z-Score (Standard Deviations)</option>
                    <option value="iqr">IQR (Interquartile Range)</option>
                  </select>
                )}
              />
              <p className="mt-1 text-sm text-gray-500">
                {outlierMethod === 'zscore' 
                  ? 'Identifies values that are unusually far from the mean'
                  : 'Identifies values outside the typical range (Q1-1.5*IQR to Q3+1.5*IQR)'
                }
              </p>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {outlierMethod === 'zscore' ? 'Z-Score Threshold' : 'IQR Multiplier'}
              </label>
              <Controller
                name="outlier_detection.threshold"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-4">
                    <input
                      {...field}
                      type="number"
                      step="0.1"
                      min={outlierMethod === 'zscore' ? '1' : '0.5'}
                      max={outlierMethod === 'zscore' ? '5' : '3'}
                      className="input-field w-32"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                    <span className="text-sm text-gray-600">
                      {outlierMethod === 'zscore' 
                        ? '(Typical: 2-3 standard deviations)'
                        : '(Typical: 1.5 times IQR)'
                      }
                    </span>
                  </div>
                )}
              />
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action for Outliers
              </label>
              <Controller
                name="outlier_detection.action"
                control={control}
                render={({ field }) => (
                  <select {...field} className="select-field">
                    <option value="flag">Flag Only (Keep in Dataset)</option>
                    <option value="remove">Remove from Dataset</option>
                  </select>
                )}
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose whether to remove outliers or just mark them for review
              </p>
            </div>

            {/* Method Explanations */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Detection Methods Explained</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <div>
                  <strong>Z-Score:</strong> Measures how many standard deviations away from the mean. 
                  Values beyond ±3 are typically considered outliers.
                </div>
                <div>
                  <strong>IQR:</strong> Uses quartiles to define normal range. 
                  More robust for skewed data and doesn't assume normal distribution.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default OutlierSettings
