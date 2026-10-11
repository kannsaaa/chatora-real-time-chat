import {
  createBrowserRouter,
  RouterProvider,
  Outlet, 
  ScrollRestoration,
} from "react-router-dom";
import './App.css';
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { Toaster } from "react-hot-toast";
import VerifyEmail from "./pages/VerifyEmail";
import { AuthProvider, useAuth } from "./context/authContext";
import axios from "axios";
import ChatHome from "./pages/ChatHome";
import { ProfileProvider } from "./context/profileContext";
import { useEffect } from "react";
import Profile from "./components/Profile";
import People from "./pages/People";
import Friends from "./pages/Friends";
import { baseUrl } from "../apiConfig";

const Layout = () => {
  const { isAuthenticated, checkAuth, loading } = useAuth();
  useEffect(() => {
    checkAuth();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center text-plum-800">
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-chatora-pink to-chatora-peach flex items-center justify-center shadow-sweet-pink animate-pulse">
            <span className="text-2xl select-none">💬</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-plum-600 font-semibold tracking-wide">
          Entering Chatora ✨
        </p>
      </div>
    );

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "users/:id/verify/:token",
        element: <VerifyEmail />,
      },
      {
        path: "chathome",
        element: <ChatHome />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "people",
        element: <People />,
      },
      {
        path: "friends",
        element: <Friends />,
      },
    ],
  },
]);

function App() {
  axios.defaults.baseURL = baseUrl;
  axios.defaults.withCredentials = true;

  return (
    <>
      <AuthProvider>
        <ProfileProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: "#FFFFFF",
                color: "#241628",
                border: "1px solid #EAD8CC",
                boxShadow: "0 10px 30px -6px rgba(74, 40, 68, 0.15), 0 4px 10px -2px rgba(74, 40, 68, 0.08)",
                borderRadius: "18px",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: 700,
              },
              success: {
                iconTheme: {
                  primary: "#FF6F91",
                  secondary: "#FFFFFF",
                },
              },
              error: {
                iconTheme: {
                  primary: "#F43F5E",
                  secondary: "#FFFFFF",
                },
              },
            }}
          />
        </ProfileProvider>
      </AuthProvider>
    </>
  );
}

export default App;
