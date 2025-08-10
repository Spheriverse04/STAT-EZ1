import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClockIcon, DocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { DatasetVersion } from '../types'
import { format } from 'date-fns'

interface VersionHistoryProps {
  versions: DatasetVersion[]
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions }) => {
  if (versions.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <ClockIcon className="w-5 h-5" />
          <span>Version History</span>
        </h3>
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No processing history yet</p>
          <p className="text-gray-400 text-sm">Upload and process a file to see versions here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <ClockIcon className="w-5 h-5" />
        <span>Version History</span>
      </h3>
      
      <div className="space-y-3">
        <AnimatePresence>
          {versions.map((version, index) => (
            <motion.div
              key={version.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900 text-sm">
                    Version {versions.length - index}
                  </span>
                  {index === 0 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                      Latest
                    </span>
                  )}
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-xs text-gray-600 mb-2">
                {format(new Date(version.timestamp), 'MMM dd, yyyy HH:mm')}
              </div>
              
              <div className="text-sm text-gray-700 mb-2">
                {version.filename}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Rows:</span>
                  <span className="ml-1 font-medium">{version.summary.rows_cleaned.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Outliers:</span>
                  <span className="ml-1 font-medium">{version.summary.outliers_detected}</span>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Method: {version.config.imputation.method}
                {version.config.outlier_detection.enabled && (
                  <span className="ml-2">• Outlier detection: {version.config.outlier_detection.method}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default VersionHistory
