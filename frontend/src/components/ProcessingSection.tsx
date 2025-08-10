import React from 'react';
import { motion } from 'framer-motion';
import { 
  CpuChipIcon, 
  ChartBarIcon, 
  DocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ProcessingSectionProps {
  isProcessing: boolean;
}

const ProcessingSection: React.FC<ProcessingSectionProps> = ({ isProcessing }) => {
  const processingSteps = [
    {
      id: 1,
      title: 'Data Ingestion',
      description: 'Reading and parsing your dataset',
      icon: DocumentCheckIcon,
      status: 'completed'
    },
    {
      id: 2,
      title: 'Quality Analysis',
      description: 'Detecting missing values, duplicates, and anomalies',
      icon: ChartBarIcon,
      status: 'processing'
    },
    {
      id: 3,
      title: 'AI-Enhanced Cleaning',
      description: 'Applying intelligent data cleaning algorithms',
      icon: CpuChipIcon,
      status: 'pending'
    },
    {
      id: 4,
      title: 'Report Generation',
      description: 'Creating comprehensive analysis reports',
      icon: DocumentCheckIcon,
      status: 'pending'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4"
          >
            <CpuChipIcon className="h-8 w-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Data</h2>
          <p className="text-gray-600">
            Our AI-powered system is analyzing and cleaning your dataset. This may take a few moments.
          </p>
        </div>

        <div className="space-y-6">
          {processingSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                step.status === 'completed' 
                  ? 'bg-green-50 border-green-200' 
                  : step.status === 'processing'
                    ? 'bg-blue-50 border-blue-200 processing-animation'
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                step.status === 'completed'
                  ? 'bg-green-500'
                  : step.status === 'processing'
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
              }`}>
                {step.status === 'completed' ? (
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                ) : step.status === 'processing' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <step.icon className="h-6 w-6 text-white" />
                  </motion.div>
                ) : (
                  <ClockIcon className="h-6 w-6 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  step.status === 'completed' 
                    ? 'text-green-900' 
                    : step.status === 'processing'
                      ? 'text-blue-900'
                      : 'text-gray-700'
                }`}>
                  {step.title}
                </h3>
                <p className={`text-sm ${
                  step.status === 'completed' 
                    ? 'text-green-700' 
                    : step.status === 'processing'
                      ? 'text-blue-700'
                      : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>

              {step.status === 'processing' && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                />
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-blue-600 rounded-full"
            />
            <span className="text-sm font-medium">Processing in progress...</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProcessingSection;
