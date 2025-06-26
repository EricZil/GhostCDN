"use client";

interface ThumbnailLinksProps {
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  } | null;
  copied: string | false;
  copyToClipboard: (text: string, type: string) => void;
}

export default function ThumbnailLinks({ thumbnails, copied, copyToClipboard }: ThumbnailLinksProps) {
  if (!thumbnails) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center mb-3">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-2 shadow-[0_0_8px_rgba(124,58,237,0.5)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8v8m0 0h8m-8 0v-8m0 0h8" />
          </svg>
        </div>
        <h4 className="text-base font-medium text-white">Thumbnail Links</h4>
      </div>
      
      {/* Small thumbnail */}
      {thumbnails.small && (
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-xs font-semibold text-gray-400 mb-1 ml-1 select-none">Small (200px)</span>
          <div className="relative flex items-center rounded-xl bg-gradient-to-br from-[rgba(30,30,45,0.7)] to-[rgba(20,20,30,0.95)] border border-gray-800/60 shadow-[0_2px_12px_rgba(124,58,237,0.08)] px-4 py-3">
            <input 
              type="text" 
              value={thumbnails.small} 
              readOnly 
              className="flex-1 text-xs md:text-sm font-mono text-gray-100 truncate bg-transparent pr-2 border-0 focus:outline-none focus:ring-0 select-all"
            />
            <button 
              onClick={() => {
                if (thumbnails.small) {
                  copyToClipboard(thumbnails.small, 'thumb-small');
                }
              }}
              className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                copied === 'thumb-small'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
              }`}
              title="Copy thumbnail link"
            >
              {copied === 'thumb-small' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4m-4-8v4m0 0l-3-3m3 3l3-3" />
                </svg>
              )}
            </button>
            {/* Copy notification */}
            {copied === 'thumb-small' && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                <div className="bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-md px-3 py-1.5 rounded shadow-lg text-white text-xs flex items-center space-x-2 animate-fade-in-down">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Medium thumbnail */}
      {thumbnails.medium && (
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-xs font-semibold text-gray-400 mb-1 ml-1 select-none">Medium (400px)</span>
          <div className="relative flex items-center rounded-xl bg-gradient-to-br from-[rgba(30,30,45,0.7)] to-[rgba(20,20,30,0.95)] border border-gray-800/60 shadow-[0_2px_12px_rgba(124,58,237,0.08)] px-4 py-3">
            <input 
              type="text" 
              value={thumbnails.medium} 
              readOnly 
              className="flex-1 text-xs md:text-sm font-mono text-gray-100 truncate bg-transparent pr-2 border-0 focus:outline-none focus:ring-0 select-all"
            />
            <button 
              onClick={() => {
                if (thumbnails.medium) {
                  copyToClipboard(thumbnails.medium, 'thumb-medium');
                }
              }}
              className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                copied === 'thumb-medium'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
              }`}
              title="Copy thumbnail link"
            >
              {copied === 'thumb-medium' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4m-4-8v4m0 0l-3-3m3 3l3-3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Large thumbnail */}
      {thumbnails.large && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-400 mb-1 ml-1 select-none">Large (800px)</span>
          <div className="relative flex items-center rounded-xl bg-gradient-to-br from-[rgba(30,30,45,0.7)] to-[rgba(20,20,30,0.95)] border border-gray-800/60 shadow-[0_2px_12px_rgba(124,58,237,0.08)] px-4 py-3">
            <input 
              type="text" 
              value={thumbnails.large} 
              readOnly 
              className="flex-1 text-xs md:text-sm font-mono text-gray-100 truncate bg-transparent pr-2 border-0 focus:outline-none focus:ring-0 select-all"
            />
            <button 
              onClick={() => {
                if (thumbnails.large) {
                  copyToClipboard(thumbnails.large, 'thumb-large');
                }
              }}
              className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                copied === 'thumb-large'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
              }`}
              title="Copy thumbnail link"
            >
              {copied === 'thumb-large' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4m-4-8v4m0 0l-3-3m3 3l3-3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 