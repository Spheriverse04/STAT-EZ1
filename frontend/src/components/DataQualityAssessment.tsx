import React from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { DataQualityMetrics } from '../types'

interface DataQualityAssessmentProps {
  metrics: DataQualityMetrics
}

const DataQualityAssessment: React.FC<DataQualityAssessmentProps> = ({ metrics }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'medium': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'low': return <InformationCircleIcon className="w-5 h-5 text-blue-500" />
      default: return <CheckCircleIcon className="w-5 h-5 text-green-500" />
    }
  }

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Quality Assessment</h3>
          <p className="text-sm text-gray-600">Professional data quality evaluation</p>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Quality Score</span>
          <span className={`px-3 py-1 rounded-full text-lg font-bold ${getScoreColor(metrics.overall_score)}`}>
            {metrics.overall_score.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              metrics.overall_score >= 90 ? 'bg-green-500' :
              metrics.overall_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${metrics.overall_score}%` }}
          ></div>
        </div>
      </div>

      {/* Quality Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold mb-1 ${getScoreColor(metrics.completeness_score).split(' ')[0]}`}>
            {metrics.completeness_score.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Completeness</div>
          <div className="text-xs text-gray-500 mt-1">Data availability</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold mb-1 ${getScoreColor(metrics.consistency_score).split(' ')[0]}`}>
            {metrics.consistency_score.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Consistency</div>
          <div className="text-xs text-gray-500 mt-1">Format uniformity</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold mb-1 ${getScoreColor(metrics.validity_score).split(' ')[0]}`}>
            {metrics.validity_score.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Validity</div>
          <div className="text-xs text-gray-500 mt-1">Data correctness</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold mb-1 ${getScoreColor(metrics.uniqueness_score).split(' ')[0]}`}>
            {metrics.uniqueness_score.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Uniqueness</div>
          <div className="text-xs text-gray-500 mt-1">Duplicate detection</div>
        </div>
      </div>

      {/* Issues and Recommendations */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Quality Issues & Recommendations</h4>
        
        {metrics.issues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h5 className="text-lg font-medium text-gray-900 mb-2">Excellent Data Quality!</h5>
            <p className="text-gray-600">No significant quality issues detected in your dataset.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.issues.map((issue, index) => (
              <motion.div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start space-x-3">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-medium text-gray-900">{issue.type.replace(/_/g, ' ').toUpperCase()}</h5>
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                          issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}
                      `}>
                        {issue.severity} priority
                      </span>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-2">{issue.description}</p>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      Affected columns: {issue.affected_columns.join(', ')}
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <InformationCircleIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-medium text-blue-900 mb-1">Recommendation:</div>
                          <div className="text-xs text-blue-800">{issue.recommendation}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Professional Insights */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Professional Data Quality Insights</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <div>• Data quality scores above 90% indicate production-ready datasets</div>
          <div>• Completeness is the most critical dimension for statistical analysis</div>
          <div>• Consistency issues can significantly impact analytical results</div>
          <div>• Regular quality monitoring prevents data degradation over time</div>
        </div>
      </div>
    </motion.div>
  )
}

export default DataQualityAssessment
