import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';

// Placeholder components
const ConnectionsPage = () => <div className="p-8 text-text-primary">Connections Page</div>;
const WorkspacePage = () => <div className="p-8 text-text-primary">Workspace Page</div>;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg-0 text-text-primary font-sans">
        <Routes>
          <Route path="/" element={<ConnectionsPage />} />
          <Route path="/workspace/:connectionId" element={<WorkspacePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
