'use client';

export default function Webhooks() {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🔔</div>
        <h2 className="text-3xl font-bold text-white mb-4">Webhooks</h2>
        <p className="text-xl text-gray-300 mb-8">Real-time event notifications for your applications</p>
        
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl border border-orange-500/30">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span className="text-orange-300 font-semibold">Coming Soon</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          {
            event: 'file.uploaded',
            description: 'Triggered when a file is successfully uploaded'
          },
          {
            event: 'file.deleted',
            description: 'Triggered when a file is removed from storage'
          },
          {
            event: 'file.processed',
            description: 'Triggered when image processing is complete'
          },
          {
            event: 'quota.exceeded',
            description: 'Triggered when storage or bandwidth limits are reached'
          }
        ].map((webhook, index) => (
          <div key={index} className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <h3 className="text-lg font-semibold text-cyan-300 mb-2 font-mono">{webhook.event}</h3>
            <p className="text-gray-400 text-sm">{webhook.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}