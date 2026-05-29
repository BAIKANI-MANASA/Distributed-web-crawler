import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  me,
  register as apiRegister,
} from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = window.localStorage.getItem("crawler_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [booting, setBooting] = useState(
    Boolean(window.localStorage.getItem("crawler_token"))
  );

  // Restore user session on refresh
  useEffect(() => {
    const token = window.localStorage.getItem("crawler_token");

    if (!token) {
      setBooting(false);
      return;
    }

    me()
      .then((data) => {
        setUser(data);

        // Keep latest user in localStorage
        window.localStorage.setItem(
          "crawler_user",
          JSON.stringify(data)
        );
      })
      .catch(() => {
        window.localStorage.removeItem("crawler_token");
        window.localStorage.removeItem("crawler_user");
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  // LOGIN
  async function signIn(payload) {
    const data = await apiLogin(payload);

    // Save token
    window.localStorage.setItem(
      "crawler_token",
      data.access_token
    );

    // Save user
    window.localStorage.setItem(
      "crawler_user",
      JSON.stringify(data.user)
    );

    setUser(data.user);

    return data.user;
  }

  // REGISTER
  async function signUp(payload) {
    return apiRegister(payload);
  }

  // LOGOUT
  async function signOut() {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    }

    // Clear local storage
    window.localStorage.removeItem("crawler_token");
    window.localStorage.removeItem("crawler_user");

    // Clear React state
    setUser(null);

    // Redirect to login page
    window.location.href = "/login";
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      booting,
      signIn,
      signUp,
      signOut,
    }),
    [user, booting]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}