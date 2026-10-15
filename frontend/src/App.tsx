import React from 'react';
import AuthProvider from './context/AuthContext';
import DepotProvider from './context/DepotContext';
import AppRouter from './router/AppRouter';
import './styles/tokens.css';
import './styles/global.css';
import './styles/utilities.css';

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <DepotProvider>
        <AppRouter />
      </DepotProvider>
    </AuthProvider>
  );
}

export default App;
