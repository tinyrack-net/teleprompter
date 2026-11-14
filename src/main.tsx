import './styles/app.css';
import { setupTinyrackColorScheme } from '@tinyrack/ui/providers/color-scheme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { EditorPage } from './features/editor/editor-page';
import { PrompterPage } from './features/prompter/prompter-page';
import { I18nProvider } from './i18n/i18n';

// The prompter is meant for dark rooms and teleprompter glass, so the app is always dark.
setupTinyrackColorScheme({ defaultPreference: 'dark', storageKey: 'teleprompter:theme' });

function Layout() {
  return (
    <I18nProvider>
      <Outlet />
    </I18nProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <EditorPage /> },
      { path: 'prompter', element: <PrompterPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
