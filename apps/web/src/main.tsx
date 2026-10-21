import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { FlashProvider } from './lib/flash';
import { TitleProvider } from './lib/title';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FlashProvider>
          <TitleProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TitleProvider>
        </FlashProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
