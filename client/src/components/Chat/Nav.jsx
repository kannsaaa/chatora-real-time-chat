import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import axios from "axios";

const Nav = ({ pendingRequestsCount }) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [internalPendingCount, setInternalPendingCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (pendingRequestsCount === undefined) {
      axios
        .get("/api/friends/requests")
        .then((res) => {
          setInternalPendingCount(res.data?.received?.length || 0);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, navigate, pendingRequestsCount]);

  const pendingCount =
    pendingRequestsCount !== undefined
      ? pendingRequestsCount
      : internalPendingCount;

  const navItems = [
    {
      name: "Chats",
      path: "/chathome",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.85}
          stroke="currentColor"
          className="w-5 h-5 sm:w-6 sm:h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
      ),
    },
    {
      name: "Friends",
      path: "/friends",
      badge: pendingCount,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.85}
          stroke="currentColor"
          className="w-5 h-5 sm:w-6 sm:h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      ),
    },
    {
      name: "People",
      path: "/people",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.85}
          stroke="currentColor"
          className="w-5 h-5 sm:w-6 sm:h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.999-3.199a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      ),
    },
    {
      name: "Profile",
      path: "/profile",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.85}
          stroke="currentColor"
          className="w-5 h-5 sm:w-6 sm:h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop Navigation Rail */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 min-h-screen bg-white border-r border-border-subtle py-6 z-30 select-none flex-shrink-0 shadow-sweet-sm">
        <div className="flex flex-col items-center gap-8 w-full">
          <Link
            to="/"
            title="Chatora Home"
            className="p-2 rounded-2xl bg-cream-50 border border-border-subtle hover:border-chatora-pink/40 hover:scale-105 transition-all duration-200 shadow-sweet-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-chatora-pink via-[#FF7E9C] to-chatora-peach p-[2px] flex items-center justify-center shadow-sweet-pink">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <span className="text-base select-none">🍓</span>
              </div>
            </div>
          </Link>

          <nav className="flex flex-col items-center gap-3 w-full px-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  aria-label={item.name}
                  className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-tr from-chatora-pink to-chatora-peach text-white shadow-sweet-pink scale-105"
                      : "text-plum-600 hover:text-plum-950 hover:bg-cream-100"
                  }`}
                >
                  {item.icon}

                  {/* Badge Notification Count */}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-chatora-pink text-white text-[10px] font-bold px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sweet-pink animate-pulse">
                      {item.badge}
                    </span>
                  )}

                  <span className="absolute left-16 bg-plum-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-sweet-lg whitespace-nowrap z-50">
                    {item.name}
                    {item.badge > 0 ? ` (${item.badge})` : ""}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3 w-full px-3">
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl text-plum-500 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.85}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
              />
            </svg>
            <span className="absolute left-16 bg-rose-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-sweet-lg whitespace-nowrap z-50">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-t border-border-subtle z-40 flex items-center justify-around px-2 select-none shadow-sweet">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.name}
              className={`flex flex-col items-center justify-center py-1 px-3 min-h-[48px] min-w-[54px] rounded-2xl transition-all relative ${
                active
                  ? "text-chatora-pink font-bold"
                  : "text-plum-600 hover:text-plum-950 font-medium"
              }`}
            >
              <div
                className={`p-1.5 rounded-2xl transition-all relative ${
                  active ? "bg-chatora-pinkLight text-chatora-pink" : ""
                }`}
              >
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-chatora-pink text-white text-[9px] font-bold px-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">
                {item.name}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={logout}
          aria-label="Logout"
          className="flex flex-col items-center justify-center py-1 px-3 min-h-[48px] min-w-[54px] text-plum-600 hover:text-rose-500 font-medium transition-colors"
        >
          <div className="p-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.85}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
              />
            </svg>
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Logout</span>
        </button>
      </nav>
    </>
  );
};

export default Nav;
