import React, { useEffect, useState } from 'react';
import { KPIs } from './components/KPIs';
import { VirtualizedGrid } from './components/VirtualizedGrid';
import { stateEngine } from './state/StateEngine';

// Declare window extension for TypeScript
declare global {
  interface Window {
    initializeRpaStream: (callback: (batch: any[]) => void) => void;
  }
}

const App: React.FC = () => {
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    if (typeof window.initializeRpaStream === 'function') {
      window.initializeRpaStream((batch) => {
        stateEngine.applyBatch(batch);
        setStreamActive(true);
      });
    } else {
      console.error('RPA Stream initializer (window.initializeRpaStream) not found.');
    }
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">High-Density Enterprise RPA Monitor</h1>
        <p className="app-subtitle">
          Real-time telemetry stream {streamActive ? (
            <span style={{ color: '#10b981', fontWeight: 600 }}>● Active</span>
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 600 }}>○ Connecting...</span>
          )}
        </p>
      </header>

      {/* KPI Dashboard Grid */}
      <KPIs />

      {/* High-Performance Custom Virtualized DOM Grid */}
      <VirtualizedGrid />
    </div>
  );
};

export default App;
