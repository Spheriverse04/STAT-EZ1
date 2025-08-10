import React from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline'

const Header: React.FC = () => {
  return (
    <motion.header 
      className="bg-white shadow-sm border-b border-gray-200"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl">
              <ChartBarIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">STAT-EZ</h1>
              <p className="text-gray-600 text-sm">Intelligent Data Processing Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <CpuChipIcon className="w-4 h-4" />
            <span>AI-Powered Analytics</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

export default Header
