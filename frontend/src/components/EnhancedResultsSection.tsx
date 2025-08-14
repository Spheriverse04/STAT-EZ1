import React from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, TableCellsIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { DatasetProcessingResult } from '../types'

interface EnhancedResultsSectionProps {
  result: DatasetProcessingResult
}

const EnhancedResultsSection: React.FC<EnhancedResultsSectionProps> = ({ result }) => {
  const summary = result?.summary ?? {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Original Rows</div>
          <div className="text-2xl font-bold text-blue-600">
            {summary?.rows_original?.toLocaleString?.() ?? '0'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Cleaned Rows</div>
          <div className="text-2xl font-bold text-green-600">
            {summary?.rows_cleaned?.toLocaleString?.() ?? '0'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Columns</div>
          <div className="text-2xl font-bold text-purple-600">
            {summary?.columns ?? '0'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Outliers Detected</div>
          <div className="text-2xl font-bold text-yellow-600">
            {summary?.outliers_detected ?? '0'}
          </div>
        </div>
      </div>

      {/* Missing Values Comparison */}
      <div className="card p-4">
        <div className="flex items-center space-x-2 mb-4">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
          <h4 className="font-semibold">Missing Values</h4>
        </div>
        {Object.keys(summary?.missing_values_before ?? {}).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(summary?.missing_values_before ?? {}).map(([column, beforeCount]) => {
              const afterCount = summary?.missing_values_after?.[column] ?? 0
              const isFixed = afterCount < (beforeCount ?? 0)
              return (
                <div key={column} className="flex justify-between text-sm">
                  <span className="text-gray-700">{column}</span>
                  <span className={isFixed ? 'text-green-600' : 'text-gray-600'}>
                    {beforeCount ?? 0} → {afterCount}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No missing values detected</p>
        )}
      </div>

      {/* Additional Charts */}
      <div className="card p-4 lg:col-span-2">
        <div className="flex items-center space-x-2 mb-4">
          <ChartBarIcon className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold">Data Distribution</h4>
        </div>
        <p className="text-sm text-gray-500">Charts go here...</p>
      </div>
    </div>
  )
}

export default EnhancedResultsSection

