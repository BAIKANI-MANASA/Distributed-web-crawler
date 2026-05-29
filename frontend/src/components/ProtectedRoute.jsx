import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProtectedRoute({ children, role }) {
  const { user, booting } = useAuth();
  if (booting) return <main className="grid min-h-screen place-items-center text-slate-500">Loading...</main>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/user" replace />;
  return children;
}
