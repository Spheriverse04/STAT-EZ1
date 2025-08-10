import React from 'react';
import { motion } from 'framer-motion';
import { HeartIcon, GlobeAltIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const Footer: React.FC = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="bg-white/80 backdrop-blur-md border-t border-white/20 mt-16"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-gray-900 mb-4">STAT-EZ Platform</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              AI-Augmented Platform for Streamlined Official Statistics. 
              Automating data preparation, estimation, and report writing for MoSPI and statistical organizations.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-4">STATATHON 2025</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <AcademicCapIcon className="h-4 w-4" />
                <span>Problem Statement PS-4</span>
              </div>
              <div className="flex items-center space-x-2">
                <GlobeAltIcon className="h-4 w-4" />
                <span>Software Category</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Key Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automated Data Cleaning</li>
              <li>• AI-Enhanced Processing</li>
              <li>• Interactive Dashboards</li>
              <li>• Version Control & Audit Trails</li>
              <li>• Refine & Re-process Workflows</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-gray-600 text-sm flex items-center justify-center space-x-1">
            <span>Built with</span>
            <HeartIcon className="h-4 w-4 text-red-500" />
            <span>for STATATHON 2025 • Ministry of Statistics and Programme Implementation</span>
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
