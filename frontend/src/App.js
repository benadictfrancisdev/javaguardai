import React from 'react';
import { Toaster } from 'sonner';
import FixError from './pages/FixError';
import './App.css';

function App() {
  return (
    <>
      <FixError />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111620',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
        }}
      />
    </>
  );
}

export default App;
