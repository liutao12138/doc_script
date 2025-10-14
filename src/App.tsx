import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import FileList from './components/FileList';
import FileDetailList from './components/FileDetailList';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<FileList />} />
          <Route path="/file/:nid" element={<FileDetailList />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
