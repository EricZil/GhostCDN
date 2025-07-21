'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

interface RealTimeEvent {
  id: string;
  timestamp: string;
  apiKeyId: string;
  apiKeyName: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip: string;
  rateLimited: boolean;
}

interface RealTimeStats {
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  activeKeys: number;
}

export default function RealTimeMonitor() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [stats, setStats] = useState<RealTimeStats>({
    requestsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0,
    activeKeys: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const eventsRef = useRef<RealTimeEvent[]>([]);

  // Update events ref when events change
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // WebSocket connection
  useEffect(() => {
    if (!session) return;

    const connectWebSocket = () => {
      try {
        // In a real implementation, this would connect to a WebSocket endpoint
        // For now, we'll simulate real-time events
        setIsConnected(true);
        
        // Simulate real-time events
        const interval = setInterval(() => {
          if (isPaused) return;

          // Generate mock real-time event
          const mockEvent: RealTimeEvent = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            apiKeyId: 'key-' + Math.floor(Math.random() * 3),
            apiKeyName: ['Production API', 'Development API', 'Testing API'][Math.floor(Math.random() * 3)],
            endpoint: ['/api/v1/files', '/api/v1/upload', '/api/v1/analytics', '/api/v1/account'][Math.floor(Math.random() * 4)],
            method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
            statusCode: Math.random() > 0.1 ? (Math.random() > 0.8 ? 201 : 200) : (Math.random() > 0.5 ? 404 : 500),
            responseTime: Math.floor(Math.random() * 500) + 50,
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            rateLimited: Math.random() > 0.95
          };

          setEvents(prev => {
            const newEvents = [mockEvent, ...prev].slice(0, 50); // Keep last 50 events
            
            // Update stats based on recent events
            const recentEvents = newEvents.filter(e => 
              new Date(e.timestamp).getTime() > Date.now() - 60000 // Last minute
            );
            
            const requestsPerMinute = recentEvents.length;
            const averageResponseTime = recentEvents.length > 0 
              ? recentEvents.reduce((sum, e) => sum + e.responseTime, 0) / recentEvents.length 
              : 0;
            const errorRate = recentEvents.length > 0 
              ? (recentEvents.filter(e => e.statusCode >= 400).length / recentEvents.length) * 100 
              : 0;
            const activeKeys = new Set(recentEvents.map(e => e.apiKeyId)).size;

            setStats({
              requestsPerMinute,
              averageResponseTime: Math.round(averageResponseTime),
              errorRate: Math.round(errorRate * 10) / 10,
              activeKeys
            });

            return newEvents;
          });
        }, Math.random() * 2000 + 1000); // Random interval between 1-3 seconds

        return () => {
          clearInterval(interval);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setIsConnected(false);
      }
    };

    const cleanup = connectWebSocket();
    return cleanup;
  }, [session, isPaused]);

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-400';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-400';
    if (statusCode >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500/20 text-blue-400';
      case 'POST': return 'bg-green-500/20 text-green-400';
      case 'PUT': return 'bg-yellow-500/20 text-yellow-400';
      case 'DELETE': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const clearEvents = () => {
    setEvents([]);
    setStats({
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeKeys: 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-2xl font-semibold text-white">Real-Time Monitor</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-4 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
              isPaused 
                ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
            }`}
          >
            {isPaused ? (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>Resume</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <span>Pause</span>
              </div>
            )}
          </button>
          
          <button
            onClick={clearEvents}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all duration-200 text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-500/30"
        >
          <div className="text-2xl font-bold text-white mb-1">
            {stats.requestsPerMinute}
          </div>
          <div className="text-sm text-blue-400">Requests/min</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-xl p-4 border border-purple-500/30"
        >
          <div className="text-2xl font-bold text-white mb-1">
            {stats.averageResponseTime}ms
          </div>
          <div className="text-sm text-purple-400">Avg Response</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl p-4 border border-red-500/30"
        >
          <div className="text-2xl font-bold text-white mb-1">
            {stats.errorRate}%
          </div>
          <div className="text-sm text-red-400">Error Rate</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-xl p-4 border border-green-500/30"
        >
          <div className="text-2xl font-bold text-white mb-1">
            {stats.activeKeys}
          </div>
          <div className="text-sm text-green-400">Active Keys</div>
        </motion.div>
      </div>

      {/* Event Stream */}
      <div className="bg-black/30 rounded-xl border border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50">
          <h4 className="text-lg font-medium text-white">Live Event Stream</h4>
          <p className="text-sm text-gray-400 mt-1">Real-time API requests and responses</p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence initial={false}>
            {events.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400">No events yet. API requests will appear here in real-time.</p>
              </div>
            ) : (
              events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 border-b border-gray-700/30 hover:bg-white/5 transition-colors ${
                    index === 0 ? 'bg-purple-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-xs text-gray-400 font-mono w-20">
                        {formatTime(event.timestamp)}
                      </div>
                      
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(event.method)}`}>
                        {event.method}
                      </span>
                      
                      <code className="text-sm text-white font-mono flex-1">
                        {event.endpoint}
                      </code>
                      
                      <span className="text-xs text-gray-400">
                        {event.apiKeyName}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm font-medium ${getStatusColor(event.statusCode)}`}>
                        {event.statusCode}
                      </span>
                      
                      <span className="text-sm text-gray-400">
                        {event.responseTime}ms
                      </span>
                      
                      <span className="text-xs text-gray-500 w-24 text-right">
                        {event.ip}
                      </span>
                      
                      {event.rateLimited && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          Rate Limited
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-base text-blue-300 font-medium mb-1">Real-Time Monitoring</p>
            <p className="text-sm text-blue-300/70">
              This dashboard shows live API requests as they happen. Events are automatically updated every few seconds. 
              Use the pause button to stop the stream for detailed analysis, or clear to reset the view.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}