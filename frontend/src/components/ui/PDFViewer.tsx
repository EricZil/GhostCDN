"use client";

import { useState } from 'react';

interface PDFViewerProps {
  src: string;
  fileName?: string;
  simplifiedView?: boolean;
}

const PDFViewer = ({ src, fileName, simplifiedView = false }: PDFViewerProps) => {
  const [error, setError] = useState(false);

  // Handle iframe errors
  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center">
        <div className="bg-purple-600/20 p-6 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-white mb-2">PDF Preview Not Available</h3>
        <p className="text-gray-400 mb-4">
          This PDF couldn&apos;t be previewed in the browser.
        </p>
        <a 
          href={src} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open PDF in New Tab
        </a>
      </div>
    );
  }

  if (simplifiedView) {
    // Simple PDF preview for upload component
    return (
      <div className="w-full h-full max-h-[60vh] overflow-auto bg-gray-800 rounded-lg">
        <div className="flex flex-col h-full">
          {/* PDF Header */}
          <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-white font-medium truncate max-w-[200px]">
                {fileName || "PDF Document"}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <a 
                href={src} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open
              </a>
            </div>
          </div>
          
          {/* PDF Content */}
          <div className="flex-grow bg-gray-800 p-4">
            <iframe
              src={`${src}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0 rounded-lg"
              style={{ height: '400px' }}
              onError={handleError}
              title={fileName || "PDF Document"}
            />
          </div>
        </div>
      </div>
    );
  } else {
    // Enhanced PDF viewer for file view page
    return (
      <div className="w-full h-[70vh] bg-gray-800 rounded-lg overflow-hidden">
        <div className="flex flex-col h-full">
          {/* PDF Viewer Header */}
          <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-white font-medium truncate max-w-[200px]">
                {fileName || "PDF Document"}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <a 
                href={src} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open
              </a>
            </div>
          </div>
          
          {/* PDF Content */}
          <div className="flex-grow bg-gray-800 p-4 h-full">
            <iframe
              src={src}
              className="w-full h-full border-0 rounded-lg"
              style={{ height: '100%', minHeight: '600px' }}
              onError={handleError}
              title={fileName || "PDF Document"}
            />
          </div>
        </div>
      </div>
    );
  }
};

export default PDFViewer; 