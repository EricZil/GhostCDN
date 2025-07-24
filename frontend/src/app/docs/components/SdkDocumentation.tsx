'use client';

export default function SdkDocumentation() {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🛠️</div>
        <h2 className="text-3xl font-bold text-white mb-4">SDKs & Libraries</h2>
        <p className="text-xl text-gray-300 mb-8">Official client libraries for popular programming languages</p>
        
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl border border-orange-500/30">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span className="text-orange-300 font-semibold">Coming Soon</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'JavaScript/Node.js', icon: '🟨', status: 'Planned' },
          { name: 'Python', icon: '🐍', status: 'Planned' },
          { name: 'Go', icon: '🔵', status: 'Planned' },
          { name: 'PHP', icon: '🐘', status: 'Planned' },
          { name: 'Java', icon: '☕', status: 'Planned' },
          { name: 'C#/.NET', icon: '🔷', status: 'Planned' }
        ].map((sdk, index) => (
          <div key={index} className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="text-3xl mb-3">{sdk.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{sdk.name}</h3>
            <span className="text-sm text-orange-400 font-medium">{sdk.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}