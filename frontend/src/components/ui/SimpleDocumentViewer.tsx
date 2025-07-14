"use client";

import { useState, useEffect } from 'react';

interface SimpleDocumentViewerProps {
  src: string;
  type?: string;
  fileName?: string;
}

const SimpleDocumentViewer = ({ src, type, fileName }: SimpleDocumentViewerProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Check if the file is a text file
  const isTextFile = type === 'text/plain' || 
    (fileName && fileName.toLowerCase().endsWith('.txt'));
  
  // Check if file is CSV
  const isCsv = type === 'text/csv' || 
    (fileName && fileName.toLowerCase().endsWith('.csv'));

  useEffect(() => {
    if (isTextFile || isCsv) {
      fetch(src)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch text file');
          }
          return response.text();
        })
        .then(data => {
          setContent(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading text file:', err);
          setError(true);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [src, isTextFile, isCsv]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center">
        <div className="bg-purple-600/20 p-6 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Preview Not Available</h3>
        <p className="text-gray-400 mb-4">
          This {isTextFile ? "text file" : isCsv ? "CSV file" : "document"} couldn&apos;t be previewed in the browser.
        </p>
        <a 
          href={src} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in New Tab
        </a>
      </div>
    );
  }

  // Text file viewer
  if (isTextFile && content !== null) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 w-full h-full overflow-auto max-h-[70vh]">
        <div className="bg-gray-900 px-4 py-2 flex items-center justify-between mb-3 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-white font-medium truncate max-w-[200px]">
              {fileName || "Text Document"}
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
        <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm bg-gray-900/50 p-4 rounded-b-lg overflow-auto max-h-[60vh]">
          {content}
        </pre>
      </div>
    );
  }

  // CSV file viewer
  if (isCsv && content !== null) {
    // Parse CSV and display as a table
    const rows = content.split('\n').filter(row => row.trim() !== '').map(row => row.split(','));
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);

    return (
      <div className="bg-gray-800 rounded-lg p-4 w-full h-full overflow-auto max-h-[70vh]">
        <div className="bg-gray-900 px-4 py-2 flex items-center justify-between mb-3 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-white font-medium truncate max-w-[200px]">
              {fileName || "CSV Document"}
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
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full text-sm text-left text-gray-200">
            <thead className="text-xs uppercase bg-gray-700">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-2 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback for other document types
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center">
      <div className="bg-purple-600/20 p-6 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-medium text-white mb-2">Preview Not Available</h3>
      <p className="text-gray-400 mb-4">
        {fileName || "Document file"}
      </p>
      <p className="text-purple-400 text-sm mb-4">
        This document type can&apos;t be previewed directly but can be downloaded.
      </p>
      <a 
        href={src} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open in New Tab
      </a>
    </div>
  );
};

export default SimpleDocumentViewer; 