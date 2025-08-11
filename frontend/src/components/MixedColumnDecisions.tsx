import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ExclamationTriangleIcon, 
  LightBulbIcon, 
  CheckCircleIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline'

interface MixedColumnAnalysis {
  column_name: string
  sample_values: any[]
  analysis: {
    numeric_ratio: number
    text_ratio: number
    date_ratio: number
    mixed_ratio: number
  }
  suggestions: Array<{
    action: string
    confidence: string
    description: string
    reasoning: string
  }>
}

interface MixedColumnDecisionsProps {
  mixedColumns: MixedColumnAnalysis[]
  onDecisionsMade: (decisions: Record<string, any>) => void
  onSkip: () => void
}

const MixedColumnDecisions: React.FC<MixedColumnDecisionsProps> = ({
  mixedColumns,
  onDecisionsMade,
  onSkip
}) => {
  const [decisions, setDecisions] = useState<Record<string, any>>({})
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0)

  const currentColumn = mixedColumns[currentColumnIndex]

  const handleDecision = (columnName: string, decision: any) => {
    setDecisions(prev => ({
      ...prev,
      [columnName]: decision
    }))
  }

  const nextColumn = () => {
    if (currentColumnIndex < mixedColumns.length - 1) {
      setCurrentColumnIndex(prev => prev + 1)
    } else {
      // All decisions made
      onDecisionsMade(decisions)
    }
  }

  const skipColumn = () => {
    // Use the safest option (keep as text)
    const safeOption = currentColumn.suggestions.find(s => s.confidence === 'safe') || currentColumn.suggestions[0]
    handleDecision(currentColumn.column_name, safeOption)
    nextColumn()
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'safe': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (mixedColumns.length === 0) {
    return null
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">Data Analysis Decision Required</h2>
              <p className="text-gray-600">
                Column {currentColumnIndex + 1} of {mixedColumns.length}: We found mixed data types that need your input
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {currentColumnIndex + 1} / {mixedColumns.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentColumnIndex + 1) / mixedColumns.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Current Column Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column Information */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Column: <code className="bg-gray-200 px-2 py-1 rounded">{currentColumn.column_name}</code>
                </h3>
                
                {/* Data Type Analysis */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Numeric Values:</span>
                    <span className="font-medium">{(currentColumn.analysis.numeric_ratio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Text Values:</span>
                    <span className="font-medium">{(currentColumn.analysis.text_ratio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Date Values:</span>
                    <span className="font-medium">{(currentColumn.analysis.date_ratio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Mixed Alphanumeric:</span>
                    <span className="font-medium">{(currentColumn.analysis.mixed_ratio * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Sample Values */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sample Values:</h4>
                  <div className="bg-white p-3 rounded border">
                    <div className="flex flex-wrap gap-2">
                      {currentColumn.sample_values.map((value, index) => (
                        <span 
                          key={index}
                          className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-mono"
                        >
                          {String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-4">
                <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Recommended Actions</h3>
              </div>

              {currentColumn.suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => {
                    handleDecision(currentColumn.column_name, suggestion)
                    nextColumn()
                  }}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{suggestion.description}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                      {suggestion.confidence}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{suggestion.reasoning}</p>
                  <div className="flex items-center text-blue-600 text-sm">
                    <span>Choose this option</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <button
              onClick={onSkip}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Skip All & Use Safe Defaults
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={skipColumn}
                className="btn-secondary"
              >
                Skip This Column
              </button>
              
              {Object.keys(decisions).length === mixedColumns.length && (
                <button
                  onClick={() => onDecisionsMade(decisions)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Apply All Decisions</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default MixedColumnDecisions
