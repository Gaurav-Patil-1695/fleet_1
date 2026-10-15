import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

function AppShell({ children }: AppShellProps): React.ReactElement {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--color-canvas)',
      color: 'var(--color-body)',
      fontFamily: 'var(--font-family-base)',
    }}>
      <Sidebar />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      }}>
        <TopBar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          maxWidth: 'var(--content-max-width)',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
