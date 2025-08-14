import React from 'react'
import { motion } from 'framer-motion'
import { Control, Controller, useWatch, useFieldArray } from 'react-hook-form'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ProcessingConfig, ColumnInfo } from '../types'

interface RuleSettingsProps {
  control: Control<ProcessingConfig>
  columns: ColumnInfo[]
}

const RuleSettings: React.FC<RuleSettingsProps> = ({ control, columns }) => {
  const rulesEnabled = useWatch({
    control,
    name: 'rules.enabled'
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rules.custom_rules'
  })

  const addRule = () => {
    append({
      column: columns[0]?.name || '',
      condition: 'greater_than',
      action: 'flag',
      value: ''
    })
  }

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Rules</h3>
      
      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-gray-900">Enable Custom Rules</h4>
            <p className="text-sm text-gray-600">Apply business logic and data validation rules</p>
          </div>
          <Controller
            name="rules.enabled"
            control={control}
            render={({ field }) => (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={field.value}
                  onChange={field.onChange}
                />
                <div className={`
                  w-11 h-6 rounded-full transition-colors
                  ${field.value ? 'bg-primary-600' : 'bg-gray-200'}
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow transform transition-transform
                    ${field.value ? 'translate-x-5' : 'translate-x-0'}
                  `} />
                </div>
              </label>
            )}
          />
        </div>

        {rulesEnabled && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Rules List */}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  className="p-4 border border-gray-200 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* Column Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Column
                      </label>
                      <Controller
                        name={`rules.custom_rules.${index}.column`}
                        control={control}
                        render={({ field }) => (
                          <select {...field} className="select-field text-sm">
                            {columns.map((col) => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Condition
                      </label>
                      <Controller
                        name={`rules.custom_rules.${index}.condition`}
                        control={control}
                        render={({ field }) => (
                          <select {...field} className="select-field text-sm">
                            <option value="greater_than">Greater than</option>
                            <option value="less_than">Less than</option>
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not equals</option>
                            <option value="contains">Contains</option>
                            <option value="not_contains">Not contains</option>
                            <option value="is_null">Is null</option>
                            <option value="is_not_null">Is not null</option>
                          </select>
                        )}
                      />
                    </div>

                    {/* Value */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <Controller
                        name={`rules.custom_rules.${index}.value`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className="input-field text-sm"
                            placeholder="Enter value"
                          />
                        )}
                      />
                    </div>

                    {/* Action */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Action
                      </label>
                      <Controller
                        name={`rules.custom_rules.${index}.action`}
                        control={control}
                        render={({ field }) => (
                          <select {...field} className="select-field text-sm">
                            <option value="flag">Flag</option>
                            <option value="remove">Remove</option>
                            <option value="transform">Transform</option>
                          </select>
                        )}
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-error-600 hover:text-error-700 hover:bg-error-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add Rule Button */}
            <button
              type="button"
              onClick={addRule}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Rule</span>
            </button>

            {/* Rules Examples */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Professional Data Validation Rules</h4>
              <div className="space-y-1 text-sm text-green-800">
                <div><strong>Data Quality Rules:</strong></div>
                <div>• Age > 120 or Age < 0 → Flag (biologically impossible)</div>
                <div>• Income < 0 → Flag/Remove (negative income anomaly)</div>
                <div>• Email not contains "@" → Flag (invalid format)</div>
                <div>• Phone length ≠ 10 → Flag (invalid phone format)</div>
                <div><strong>Business Logic Rules:</strong></div>
                <div>• End_Date < Start_Date → Flag (temporal inconsistency)</div>
                <div>• Status = "test" or "demo" → Remove (test data)</div>
                <div>• Salary > 1000000 → Flag (potential outlier)</div>
                <div><strong>Statistical Rules:</strong></div>
                <div>• Value > Mean + 3×StdDev → Flag (statistical outlier)</div>
              </div>
            </div>
            
            {/* Rule Templates */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Quick Rule Templates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => append({
                    column: 'age',
                    condition: 'greater_than',
                    action: 'flag',
                    value: '120'
                  })}
                  className="text-left p-2 bg-white rounded border hover:bg-blue-50 text-sm"
                >
                  <strong>Age Validation</strong><br/>
                  <span className="text-gray-600">Flag unrealistic ages</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => append({
                    column: 'email',
                    condition: 'not_contains',
                    action: 'flag',
                    value: '@'
                  })}
                  className="text-left p-2 bg-white rounded border hover:bg-blue-50 text-sm"
                >
                  <strong>Email Format</strong><br/>
                  <span className="text-gray-600">Validate email addresses</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => append({
                    column: 'status',
                    condition: 'equals',
                    action: 'remove',
                    value: 'test'
                  })}
                  className="text-left p-2 bg-white rounded border hover:bg-blue-50 text-sm"
                >
                  <strong>Remove Test Data</strong><br/>
                  <span className="text-gray-600">Clean test records</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => append({
                    column: 'income',
                    condition: 'less_than',
                    action: 'flag',
                    value: '0'
                  })}
                  className="text-left p-2 bg-white rounded border hover:bg-blue-50 text-sm"
                >
                  <strong>Income Validation</strong><br/>
                  <span className="text-gray-600">Flag negative income</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default RuleSettings
