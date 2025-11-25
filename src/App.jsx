import React, { useState, useEffect } from 'react';
import Visualizer from './components/Visualizer';
import UI from './components/UI';
import NodeEditor from './components/NodeEditor';

function App() {
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };
  
  useEffect(() => {
      window.showToast = addToast;
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Visualizer />
      
      {!uiHidden && (
        <UI 
          onToggleNodeEditor={() => setShowNodeEditor(!showNodeEditor)} 
          onHideUI={() => setUiHidden(true)}
        />
      )}

      {showNodeEditor && (
        <NodeEditor onClose={() => setShowNodeEditor(false)} />
      )}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
              <div key={toast.id} className="bg-[rgba(0,20,20,0.9)] border border-neon-cyan text-neon-cyan p-4 rounded shadow-[0_0_15px_rgba(0,255,204,0.2)] text-xs max-w-[300px] animate-slideIn">
                  {toast.message}
              </div>
          ))}
      </div>
    </div>
  );
}

export default App;
