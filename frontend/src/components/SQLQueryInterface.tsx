import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PlayIcon, TableCellsIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { SQLQueryResult } from '../types'

interface SQLQueryInterfaceProps {
  versionId: string
  columns: string[]
}

const SQLQueryInterface: React.FC<SQLQueryInterfaceProps> = ({ versionId, columns }) => {
  const [query, setQuery] = useState('SELECT * FROM dataset LIMIT 10')
  const [result, setResult] = useState<SQLQueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeQuery = async () => {
    if (!query.trim()) return

    setIsExecuting(true)
    setError(null)

    try {
      const response = await fetch('/api/sql-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version_id: versionId,
          query: query.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Query execution failed')
      }
    } catch (err) {
      setError('Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }

  const insertSampleQueries = (sampleQuery: string) => {
    setQuery(sampleQuery)
  }

  const sampleQueries = [
    'SELECT * FROM dataset LIMIT 10',
    'SELECT COUNT(*) as total_rows FROM dataset',
    `SELECT ${columns[0]}, COUNT(*) as count FROM dataset GROUP BY ${columns[0]} ORDER BY count DESC`,
    `SELECT AVG(${columns.find(col => col.toLowerCase().includes('age') || col.toLowerCase().includes('price') || col.toLowerCase().includes('amount')) || columns[0]}) as average FROM dataset`,
    'SELECT * FROM dataset WHERE rowid <= 5'
  ]

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <TableCellsIcon className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SQL Query Interface</h3>
          <p className="text-sm text-gray-600">Execute SQL queries on your dataset</p>
        </div>
      </div>

      {/* Sample Queries */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Queries:</h4>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sampleQuery, index) => (
            <button
              key={index}
              onClick={() => insertSampleQueries(sampleQuery)}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              {sampleQuery.length > 40 ? sampleQuery.substring(0, 40) + '...' : sampleQuery}
            </button>
          ))}
        </div>
      </div>

      {/* Query Editor */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">SQL Query</label>
          <div className="text-xs text-gray-500">Table name: <code className="bg-gray-100 px-1 rounded">dataset</code></div>
        </div>
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Enter your SQL query here..."
          />
          <button
            onClick={executeQuery}
            disabled={isExecuting || !query.trim()}
            className="absolute bottom-3 right-3 btn-primary text-sm py-1 px-3 flex items-center space-x-1"
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Running...</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-3 h-3" />
                <span>Execute</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Available Columns */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Available Columns:</h4>
        <div className="flex flex-wrap gap-1">
          {columns.map((column) => (
            <span
              key={column}
              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200"
              onClick={() => setQuery(prev => prev + ` ${column}`)}
            >
              {column}
            </span>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
            <p className="text-red-700 text-sm font-medium">Query Error</p>
          </div>
          <p className="text-red-600 text-sm mt-1 font-mono">{error}</p>
        </motion.div>
      )}

      {/* Results Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Query Results</h4>
            <div className="text-xs text-gray-500">
              {result.row_count} rows × {result.columns.length} columns
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {result.columns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.data.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {result.columns.map((column) => (
                        <td key={column} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {row[column] === null || row[column] === undefined ? (
                            <span className="text-gray-400 italic">null</span>
                          ) : (
                            String(row[column])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result.row_count > result.data.length && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Showing first {result.data.length} rows of {result.row_count} total results
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

export default SQLQueryInterface
