import React from 'react';
import { motion } from 'framer-motion';

interface MessageForm {
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface SystemMessageModalProps {
  isOpen: boolean;
  messageForm: MessageForm;
  setMessageForm: React.Dispatch<React.SetStateAction<MessageForm>>;
  onClose: () => void;
  onCreateMessage: () => void;
}

export const SystemMessageModal: React.FC<SystemMessageModalProps> = ({
  isOpen,
  messageForm,
  setMessageForm,
  onClose,
  onCreateMessage
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Create System Message</h3>
              <p className="text-sm text-gray-400">Send an announcement to all users on the main page</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Message Title</label>
              <input
                type="text"
                value={messageForm.title}
                onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter message title..."
                className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Message Content</label>
              <textarea
                value={messageForm.content}
                onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your message content..."
                rows={4}
                className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Message Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'INFO', label: 'Information', color: 'blue', description: 'General announcements' },
                  { value: 'WARNING', label: 'Warning', color: 'yellow', description: 'Important notices' },
                  { value: 'CRITICAL', label: 'Critical', color: 'red', description: 'Urgent alerts' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setMessageForm(prev => ({ ...prev, type: type.value as 'INFO' | 'WARNING' | 'CRITICAL' }))}
                    className={`p-3 rounded-lg border transition-all ${
                      messageForm.type === type.value
                        ? `border-${type.color}-500 bg-${type.color}-500/20`
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                      type.color === 'blue' ? 'bg-blue-500' :
                      type.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <p className="text-sm font-medium text-white">{type.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onCreateMessage}
              disabled={!messageForm.title || !messageForm.content}
              className="flex-1 px-4 py-2.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg border border-blue-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Message
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};