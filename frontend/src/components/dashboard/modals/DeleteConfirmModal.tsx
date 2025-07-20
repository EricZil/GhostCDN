import React from 'react';
import { motion } from 'framer-motion';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-gray-900/95 via-red-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Delete File</h3>
              <p className="text-sm text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete <span className="font-semibold text-white">&quot;{fileName}&quot;</span>? 
            This will permanently remove it from your storage.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg border border-red-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-red-500/25"
            >
              Delete File
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};