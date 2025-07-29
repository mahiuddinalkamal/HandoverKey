import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-primary-600">
                  HandoverKey
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">{user?.email}</span>
                    <button
                      onClick={handleLogout}
                      className="btn-secondary text-sm"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary text-sm">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

export default Layout;
