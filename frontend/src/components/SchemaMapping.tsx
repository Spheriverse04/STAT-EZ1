import React from 'react'
import { motion } from 'framer-motion'
import { Control, Controller } from 'react-hook-form'
import { ProcessingConfig, ColumnInfo } from '../types'

interface SchemaMappingProps {
  control: Control<ProcessingConfig>
  columns: ColumnInfo[]
}

const SchemaMapping: React.FC<SchemaMappingProps> = ({ control, columns }) => {
  const standardFields = [
    { key: 'id', label: 'ID/Identifier', description: 'Unique identifier for each record' },
    { key: 'name', label: 'Name', description: 'Person or entity name' },
    { key: 'email', label: 'Email', description: 'Email address' },
    { key: 'phone', label: 'Phone', description: 'Phone number' },
    { key: 'age', label: 'Age', description: 'Age in years' },
    { key: 'gender', label: 'Gender', description: 'Gender classification' },
    { key: 'income', label: 'Income', description: 'Annual income' },
    { key: 'date', label: 'Date', description: 'Date field' },
    { key: 'category', label: 'Category', description: 'Categorical classification' },
    { key: 'score', label: 'Score/Rating', description: 'Numeric score or rating' },
    { key: 'weight', label: 'Weight', description: 'Statistical weight for analysis' },
    { key: 'other', label: 'Other', description: 'Keep original column name' }
  ]

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Schema Mapping</h3>
      <p className="text-gray-600 mb-6">
        Map your columns to standard field types for better analysis and reporting.
      </p>
      
      <div className="space-y-4">
        {columns.map((column) => (
          <div key={column.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{column.name}</div>
              <div className="text-sm text-gray-600">
                Type: {column.type} • {column.unique_count} unique values
                {column.missing_count > 0 && (
                  <span className="text-warning-600 ml-2">
                    • {column.missing_count} missing
                  </span>
                )}
              </div>
            </div>
            
            <div className="ml-4 w-48">
              <Controller
                name={`schema_mapping.${column.name}` as any}
                control={control}
                render={({ field }) => (
                  <select {...field} className="select-field text-sm">
                    {standardFields.map((standardField) => (
                      <option key={standardField.key} value={standardField.key}>
                        {standardField.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Schema Mapping Benefits</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div>• Standardizes column names for consistent reporting</div>
          <div>• Enables automatic validation rules based on field types</div>
          <div>• Improves data integration with other systems</div>
          <div>• Facilitates automated analysis and insights</div>
        </div>
      </div>
    </motion.div>
  )
}

export default SchemaMapping
