"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import PDF viewer components to avoid SSR issues
const PDFViewer = dynamic(() => import('./PDFViewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  )
});

// Import the simple document viewer for text and CSV files
import SimpleDocumentViewer from './SimpleDocumentViewer';

interface DocumentViewerProps {
  src: string;
  type?: string;
  fileName?: string;
  simplifiedView?: boolean;
}

const DocumentViewer = ({ src, type, fileName, simplifiedView = false }: DocumentViewerProps) => {
  const [documentType, setDocumentType] = useState<'pdf' | 'text' | 'csv' | 'other'>('other');
  
  useEffect(() => {
    // Determine document type based on MIME type or file extension
    if (type === 'application/pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf'))) {
      setDocumentType('pdf');
    } else if (type === 'text/plain' || (fileName && fileName.toLowerCase().endsWith('.txt'))) {
      setDocumentType('text');
    } else if (type === 'text/csv' || (fileName && fileName.toLowerCase().endsWith('.csv'))) {
      setDocumentType('csv');
    } else {
      setDocumentType('other');
    }
  }, [type, fileName]);

  // Get a more specific document type for the unsupported message
  const getSpecificDocType = () => {
    if (!fileName) return 'document';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'doc':
      case 'docx':
        return 'Word document';
      case 'xls':
      case 'xlsx':
        return 'Excel spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'PowerPoint presentation';
      case 'odt':
        return 'OpenDocument text';
      case 'ods':
        return 'OpenDocument spreadsheet';
      default:
        return `${extension} document`;
    }
  };

  // Render the appropriate viewer based on document type
  switch (documentType) {
    case 'pdf':
      return (
        <PDFViewer 
          src={src} 
          fileName={fileName}
          simplifiedView={simplifiedView}
        />
      );
    case 'text':
    case 'csv':
      return (
        <SimpleDocumentViewer 
          src={src} 
          type={type} 
          fileName={fileName}
        />
      );
    default:
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
            This {getSpecificDocType()} can&apos;t be previewed directly but can be downloaded.
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
};

export default DocumentViewer; 