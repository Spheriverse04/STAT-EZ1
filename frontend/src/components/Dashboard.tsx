import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartBarIcon, PresentationChartBarIcon } from '@heroicons/react/24/outline';
import { AnalysisResult } from '../types';

interface DashboardProps {
  result: AnalysisResult;
}

const Dashboard: React.FC<DashboardProps> = ({ result }) => {
  // Prepare data for missing values chart
  const missingValuesData = Object.entries(result.report.missing_values).map(([column, count]) => ({
    column: column.length > 10 ? column.substring(0, 10) + '...' : column,
    missing: count,
    fullColumn: column
  }));

  // Prepare data for data types pie chart
  const dataTypesCount = Object.values(result.report.data_types).reduce((acc, type) => {
    const category = type.includes('int') || type.includes('float') ? 'Numeric' :
                    type.includes('object') || type.includes('string') ? 'Text' :
                    type.includes('datetime') ? 'DateTime' : 'Other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dataTypesData = Object.entries(dataTypesCount).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card rounded-2xl p-8"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <PresentationChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
        Interactive Data Dashboard
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Missing Values Chart */}
        {missingValuesData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-white p-6 rounded-xl shadow-sm border"
          >
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-red-500" />
              Missing Values by Column
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={missingValuesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="column" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name, props) => [value, 'Missing Values']}
                  labelFormatter={(label) => {
                    const item = missingValuesData.find(d => d.column === label);
                    return item ? item.fullColumn : label;
                  }}
                />
                <Bar dataKey="missing" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Data Types Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-white p-6 rounded-xl shadow-sm border"
        >
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Data Types Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dataTypesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dataTypesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Data Quality Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{result.report.rows.toLocaleString()}</div>
          <div className="text-blue-100">Total Records</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{result.report.columns}</div>
          <div className="text-green-100">Data Columns</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">
            {Object.values(result.report.missing_values).reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-yellow-100">Missing Values</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{result.report.duplicate_rows}</div>
          <div className="text-purple-100">Duplicates</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
