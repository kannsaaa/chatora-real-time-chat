import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import axios from "axios";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [userDetails, setUserDetails] = useState(null);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get("/api/user/profile");
      setUserDetails(response.data);
    } catch (error) {
      console.log("Error fetching user details in profile", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserDetails();
    } else {
      setUserDetails(null);
    }
  }, [isAuthenticated]);

  return (
    <ProfileContext.Provider value={{ isAuthenticated, userDetails, setUserDetails, fetchUserDetails }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  return useContext(ProfileContext);
};
