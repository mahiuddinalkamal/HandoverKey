import React from "react";
import { useAuth } from "../contexts/AuthContext";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Vault Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Encrypted entries:</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total size:</span>
              <span className="font-medium">0 MB</span>
            </div>
          </div>
          <button className="mt-4 btn-primary w-full">Add New Entry</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Successors</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Trusted contacts:</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verified:</span>
              <span className="font-medium">0</span>
            </div>
          </div>
          <button className="mt-4 btn-primary w-full">Manage Successors</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Handover Settings
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Inactivity period:</span>
              <span className="font-medium">90 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </div>
          <button className="mt-4 btn-secondary w-full">
            Configure Settings
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Your vault activity will appear here</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Security Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-gray-600">
                  Add an extra layer of security
                </p>
              </div>
              <button className="btn-secondary">
                {user?.twoFactorEnabled ? "Configure" : "Enable"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Last Login</p>
                <p className="text-sm text-gray-600">
                  {user?.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
