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
    <div className="mt-8">
      <div className="flex items-center mb-6">
        <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h4 className="text-lg font-semibold text-white">Thumbnail Links</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            key: 'small',
            label: 'Small (200px)',
            url: thumbnails.small,
            copyId: 'thumb-small'
          },
          {
            key: 'medium', 
            label: 'Medium (400px)',
            url: thumbnails.medium,
            copyId: 'thumb-medium'
          },
          {
            key: 'large',
            label: 'Large (800px)', 
            url: thumbnails.large,
            copyId: 'thumb-large'
          }
        ].filter(thumb => thumb.url).map(({ label, url, copyId }) => (
          <div key={copyId} className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-300 mb-2">{label}</span>
            <div className="relative flex items-center rounded-xl bg-black/50 border border-gray-800 px-4 py-4 h-full">
              <code className="flex-1 text-sm font-mono text-white truncate bg-transparent pr-3 select-all">
                {url}
              </code>
              <button
                onClick={() => {
                  copyToClipboard(url, copyId);
                }}
                className={`ml-3 w-10 h-10 flex items-center justify-center rounded-xl border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  copied === copyId
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                }`}
                title={`Copy ${label}`}
              >
                {copied === copyId ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {copied === copyId && (
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
        ))}
      </div>
    </div>
  );
} 