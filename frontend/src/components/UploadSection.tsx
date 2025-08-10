import React, { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { useDropzone } from 'react-dropzone'

interface UploadSectionProps {
  onFileUpload: (file: File) => void
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileUpload }) => {
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null)
    
    if (rejectedFiles.length > 0) {
      setUploadError('Please upload a valid CSV or Excel file')
      return
    }
    
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0])
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  })

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Dataset</h2>
        <p className="text-gray-600">
          Upload your CSV or Excel file to begin intelligent data processing
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject 
            ? 'border-primary-400 bg-primary-50' 
            : isDragReject 
            ? 'border-error-400 bg-error-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${isDragActive && !isDragReject 
              ? 'bg-primary-100' 
              : isDragReject 
              ? 'bg-error-100'
              : 'bg-gray-100'
            }
          `}>
            {isDragReject ? (
              <DocumentIcon className="w-8 h-8 text-error-600" />
            ) : (
              <CloudArrowUpIcon className={`
                w-8 h-8 
                ${isDragActive ? 'text-primary-600' : 'text-gray-600'}
              `} />
            )}
          </div>
          
          <div>
            {isDragActive ? (
              isDragReject ? (
                <p className="text-error-600 font-medium">Invalid file type</p>
              ) : (
                <p className="text-primary-600 font-medium">Drop your file here</p>
              )
            ) : (
              <>
                <p className="text-gray-900 font-medium mb-1">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-gray-500 text-sm">
                  Supports CSV, XLS, XLSX files up to 50MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <motion.div
          className="mt-4 p-4 bg-error-50 border border-error-200 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-error-600 text-sm">{uploadError}</p>
        </motion.div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-primary-600 font-semibold text-sm">1</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Upload</h3>
          <p className="text-gray-600 text-sm">Select your dataset file</p>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-gray-600 font-semibold text-sm">2</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Configure</h3>
          <p className="text-gray-600 text-sm">Set processing options</p>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-gray-600 font-semibold text-sm">3</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Download</h3>
          <p className="text-gray-600 text-sm">Get cleaned results</p>
        </div>
      </div>
    </motion.div>
  )
}

export default UploadSection
