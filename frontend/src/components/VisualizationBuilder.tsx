import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import Plot from 'react-plotly.js'
import { VisualizationConfig, ColumnInfo } from '../types'

interface VisualizationBuilderProps {
  versionId: string
  columns: ColumnInfo[]
}

const VisualizationBuilder: React.FC<VisualizationBuilderProps> = ({ versionId, columns }) => {
  const [config, setConfig] = useState<VisualizationConfig>({
    chart_type: 'histogram',
    x_column: columns[0]?.name || '',
    y_column: '',
    color_column: ''
  })
  const [chartData, setChartData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateVisualization = async () => {
    if (!config.x_column) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version_id: versionId,
          chart_type: config.chart_type,
          x_column: config.x_column,
          y_column: config.y_column || null,
          color_column: config.color_column || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setChartData(data.chart_data)
      } else {
        setError(data.error || 'Visualization generation failed')
      }
    } catch (err) {
      setError('Failed to generate visualization')
    } finally {
      setIsGenerating(false)
    }
  }

  const chartTypes = [
    { value: 'histogram', label: 'Histogram', description: 'Distribution of values' },
    { value: 'bar', label: 'Bar Chart', description: 'Compare categories' },
    { value: 'pie', label: 'Pie Chart', description: 'Part-to-whole relationships' },
    { value: 'scatter', label: 'Scatter Plot', description: 'Relationship between variables' },
    { value: 'line', label: 'Line Chart', description: 'Trends over time' },
    { value: 'box', label: 'Box Plot', description: 'Distribution and outliers' }
  ]

  const numericColumns = columns.filter(col => col.type === 'numeric')
  const allColumns = columns

  const requiresYColumn = ['scatter', 'line'].includes(config.chart_type)

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <ChartBarIcon className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Interactive Visualizations</h3>
          <p className="text-sm text-gray-600">Create customizable charts and graphs</p>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          {/* Chart Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <div className="grid grid-cols-2 gap-2">
              {chartTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConfig(prev => ({ ...prev, chart_type: type.value as any }))}
                  className={`
                    p-3 text-left border rounded-lg transition-all
                    ${config.chart_type === type.value
                      ? 'border-green-500 bg-green-50 text-green-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }
                  `}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Column Selections */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis Column</label>
              <select
                value={config.x_column}
                onChange={(e) => setConfig(prev => ({ ...prev, x_column: e.target.value }))}
                className="select-field"
              >
                <option value="">Select column...</option>
                {allColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            {(requiresYColumn || config.chart_type === 'bar') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y-Axis Column {requiresYColumn && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={config.y_column}
                  onChange={(e) => setConfig(prev => ({ ...prev, y_column: e.target.value }))}
                  className="select-field"
                >
                  <option value="">Select column...</option>
                  {numericColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color By (Optional)</label>
              <select
                value={config.color_column}
                onChange={(e) => setConfig(prev => ({ ...prev, color_column: e.target.value }))}
                className="select-field"
              >
                <option value="">None</option>
                {allColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Chart Preview</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>Type:</strong> {chartTypes.find(t => t.value === config.chart_type)?.label}</div>
            <div><strong>X-Axis:</strong> {config.x_column || 'Not selected'}</div>
            {config.y_column && <div><strong>Y-Axis:</strong> {config.y_column}</div>}
            {config.color_column && <div><strong>Color:</strong> {config.color_column}</div>}
          </div>
          
          <button
            onClick={generateVisualization}
            disabled={isGenerating || !config.x_column || (requiresYColumn && !config.y_column)}
            className="mt-4 btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Generate Chart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Chart Display */}
      {chartData && (
        <motion.div
          className="border border-gray-200 rounded-lg p-4 bg-white"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Plot
            data={chartData.data}
            layout={{
              ...chartData.layout,
              autosize: true,
              margin: { l: 50, r: 50, t: 50, b: 50 }
            }}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
              displaylogo: false
            }}
            style={{ width: '100%', height: '500px' }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

export default VisualizationBuilder
