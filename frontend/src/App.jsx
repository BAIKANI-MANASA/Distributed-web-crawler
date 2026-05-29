import { Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SearchResultsPage from "./pages/SearchResultsPage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/user" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute role="ADMIN"><StatsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
