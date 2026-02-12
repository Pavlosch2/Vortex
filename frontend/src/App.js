import React from 'react';
import PCSpecsForm from './components/PCSpecsForm';

function App() {
  return (
    <div className="App">
      <header style={{ textAlign: 'center', padding: '20px' }}>
        <h1>Vortex</h1>
      </header>
      <main>
        <PCSpecsForm />
      </main>
    </div>
  );
}

export default App;