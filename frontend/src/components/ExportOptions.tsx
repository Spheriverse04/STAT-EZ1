import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  TableCellsIcon,
  ChartBarIcon,
  CodeBracketIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

interface ExportOptionsProps {
  versionId: string
  filename: string
}

const ExportOptions: React.FC<ExportOptionsProps> = ({ versionId, filename }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  const exportFormats = [
    {
      id: 'csv',
      name: 'CSV',
      description: 'Comma-separated values for Excel and other tools',
      icon: TableCellsIcon,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'excel',
      name: 'Excel',
      description: 'Microsoft Excel format with multiple sheets',
      icon: TableCellsIcon,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'json',
      name: 'JSON',
      description: 'JavaScript Object Notation for web applications',
      icon: CodeBracketIcon,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'pdf_report',
      name: 'PDF Report',
      description: 'Comprehensive analysis report with charts',
      icon: DocumentTextIcon,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: 'summary_dashboard',
      name: 'Dashboard',
      description: 'Interactive HTML dashboard with visualizations',
      icon: ChartBarIcon,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      id: 'api_endpoint',
      name: 'API Access',
      description: 'Generate API endpoint for programmatic access',
      icon: ShareIcon,
      color: 'bg-indigo-100 text-indigo-600'
    }
  ]

  const handleExport = async (format: string) => {
    setIsExporting(format)
    setExportSuccess(null)

    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In real implementation, this would call the backend API
      const response = await fetch(`/api/export/${versionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          filename,
          options: {
            include_metadata: true,
            include_charts: format === 'pdf_report',
            compression: format === 'json' ? 'gzip' : 'none'
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}_export.${format === 'pdf_report' ? 'pdf' : format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setExportSuccess(format)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      // Handle error - show notification
    } finally {
      setIsExporting(null)
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
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <ArrowDownTrayIcon className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Options</h3>
          <p className="text-sm text-gray-600">Download your processed data in various formats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportFormats.map((format) => (
          <motion.div
            key={format.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport(format.id)}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${format.color}`}>
                <format.icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{format.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{format.description}</p>
                
                <button
                  disabled={isExporting === format.id}
                  className="w-full btn-primary text-sm py-2 flex items-center justify-center space-x-2"
                >
                  {isExporting === format.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : exportSuccess === format.id ? (
                    <>
                      <ArrowDownTrayIcon className="w-3 h-3" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-3 h-3" />
                      <span>Export</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Export History */}
      <div className="mt-8 border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-4">Recent Exports</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TableCellsIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-900">{filename}_cleaned.csv</span>
            </div>
            <div className="text-xs text-gray-500">2 minutes ago</div>
          </div>
          
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-900">{filename}_report.pdf</span>
            </div>
            <div className="text-xs text-gray-500">5 minutes ago</div>
          </div>
        </div>
      </div>

      {/* Professional Export Tips */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Professional Export Guidelines</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div>• <strong>CSV:</strong> Best for statistical software (R, SPSS, SAS)</div>
          <div>• <strong>Excel:</strong> Ideal for business reporting and presentations</div>
          <div>• <strong>JSON:</strong> Perfect for web applications and APIs</div>
          <div>• <strong>PDF Report:</strong> Comprehensive documentation for stakeholders</div>
          <div>• <strong>Dashboard:</strong> Interactive exploration for end users</div>
        </div>
      </div>
    </motion.div>
  )
}

export default ExportOptions
