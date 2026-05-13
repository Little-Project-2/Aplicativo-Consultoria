import { QueryClientProvider } from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { queryClient } from './lib/queryClient';
import { exposeSupabaseClient } from './lib/supabaseClient';
import { registerConsultoriaPwa } from './pwa/registerPwa';
import './styles.css';

exposeSupabaseClient();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

const root = createRoot(rootElement);

flushSync(() => {
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
});

registerConsultoriaPwa();
