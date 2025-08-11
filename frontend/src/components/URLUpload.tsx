import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { LinkIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline'

interface URLUploadProps {
  onURLUpload: (data: any) => void
  isLoading: boolean
}

const URLUpload: React.FC<URLUploadProps> = ({ onURLUpload, isLoading }) => {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url.trim()) {
      setError('Please enter a valid URL')
      return
    }

    try {
      const response = await fetch('/api/download-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (data.success) {
        onURLUpload(data)
      } else {
        setError(data.error || 'Failed to download file from URL')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    }
  }

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <LinkIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upload from URL</h3>
          <p className="text-sm text-gray-600">For large datasets, provide a direct download link</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dataset URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-field"
            placeholder="https://example.com/dataset.csv"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports CSV, XLS, and XLSX files. Make sure the URL is publicly accessible.
          </p>
        </div>

        {error && (
          <motion.div
            className="p-3 bg-red-50 border border-red-200 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <CloudArrowDownIcon className="w-4 h-4" />
              <span>Download & Analyze</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Supported Sources</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div>• Direct file links (CSV, Excel)</div>
          <div>• Cloud storage links (Google Drive, Dropbox)</div>
          <div>• Government data portals</div>
          <div>• Research datasets</div>
        </div>
      </div>
    </motion.div>
  )
}

export default URLUpload
