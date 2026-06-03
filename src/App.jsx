import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout.jsx';
import AdminPage from './pages/AdminPage.jsx';
import HomePage from './pages/HomePage.jsx';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-center" />
    </>
  );
}
