import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout.jsx';
import AdminPage from './pages/AdminPage.jsx';
import HomePage from './pages/HomePage.jsx';
import { CatalogProvider } from './contexts/CatalogContext.jsx';

export default function App() {
  return (
    <>
      <CatalogProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </CatalogProvider>
      <Toaster position="bottom-center" />
    </>
  );
}
