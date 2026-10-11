import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const setAuthenticated = (value) => {
    setIsAuthenticated(value);
  };

  const checkAuth = async () => {
    console.log("Checking authentication...");
    try {
      await axios.get("/api/user/profile");
      console.log("Token exists and valid. Setting authenticated to true.");
      setAuthenticated(true);
    } catch (error) {
      console.log("Token does not exist or invalid. Setting authenticated to false");
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/user/logout");
    } catch (err) {
      console.log("Error during logout API call", err);
    }
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setAuthenticated, checkAuth, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
