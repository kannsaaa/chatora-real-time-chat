import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import ChatoraLogo from "../components/ChatoraLogo";

const Register = () => {
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const raw = data.username.trim();
    if (!raw) {
      setUsernameStatus({ checking: false, available: null, message: "" });
      return;
    }

    const normalized = raw.replace(/^@/, "").toLowerCase();
    if (normalized.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username must be at least 3 characters.",
      });
      return;
    }
    if (normalized.length > 20) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username cannot exceed 20 characters.",
      });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username can only contain letters, numbers, and underscores.",
      });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `/api/user/username/check?username=${encodeURIComponent(normalized)}`
        );
        if (res.data.available) {
          setUsernameStatus({
            checking: false,
            available: true,
            message: "Username available",
          });
        } else {
          setUsernameStatus({
            checking: false,
            available: false,
            message: res.data.message || "That username is already taken",
          });
        }
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: null,
          message: "",
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [data.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const normalizedUsername = data.username.trim().toLowerCase().replace(/^@/, "");
    if (normalizedUsername.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }
    if (normalizedUsername.length > 20) {
      toast.error("Username cannot exceed 20 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      toast.error("Username can only contain letters, numbers, and underscores.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const url = "/api/user/register";
      const { confirmPassword, ...registerData } = data;
      const response = await axios.post(url, {
        ...registerData,
        username: normalizedUsername,
      });
      toast.success(response.data.message || "Welcome to Chatora! Check your email to verify ✨");
      navigate("/login");
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An unexpected error occurred during registration");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-cream-100 min-h-screen text-plum-900 flex items-center justify-center p-4 py-8 sm:py-12 relative overflow-y-auto select-none">
      {/* Background ambient sweet light effects */}
      <div className="w-[500px] h-[500px] bg-chatora-pink/15 rounded-full blur-3xl absolute -top-40 -right-40 pointer-events-none"></div>
      <div className="w-[400px] h-[400px] bg-chatora-peach/20 rounded-full blur-3xl absolute -bottom-20 -left-20 pointer-events-none"></div>
      <div className="w-[300px] h-[300px] bg-chatora-lavender/15 rounded-full blur-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 my-auto">
        <div className="flex justify-center mb-6">
          <ChatoraLogo size="lg" to="/" showTagline={false} />
        </div>

        <div className="bg-white border border-border-subtle rounded-3xl p-8 sm:p-10 shadow-sweet-lg relative">
          <div className="text-center mb-7">
            <span className="inline-block text-3xl mb-2 animate-bounce">✨</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-1.5">
              Let's get you into the conversation ✨
            </h1>
            <p className="text-xs sm:text-sm text-plum-500 font-medium">
              Create your account to start chatting with friends and causing chaos.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                >
                  First Name
                </label>
                <input
                  onChange={handleChange}
                  value={data.firstName}
                  type="text"
                  name="firstName"
                  id="firstName"
                  placeholder="Rahul"
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                >
                  Last Name
                </label>
                <input
                  onChange={handleChange}
                  value={data.lastName}
                  type="text"
                  name="lastName"
                  id="lastName"
                  placeholder="Sharma"
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="username"
                  className="block text-xs font-bold uppercase tracking-wider text-plum-700"
                >
                  Username
                </label>
                {usernameStatus.checking && (
                  <span className="text-xs text-plum-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-chatora-pink animate-ping"></span>
                    Checking...
                  </span>
                )}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    ✓ {usernameStatus.message}
                  </span>
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
                    ✕ {usernameStatus.message}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-plum-500 font-bold text-sm select-none pointer-events-none">
                  @
                </span>
                <input
                  onChange={handleChange}
                  value={data.username}
                  type="text"
                  name="username"
                  id="username"
                  placeholder="rahulsharma23"
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl bg-cream-50 border text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white transition-all text-sm font-medium ${
                    usernameStatus.available === false
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : usernameStatus.available === true
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      : "border-border-subtle focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20"
                  }`}
                  required
                />
              </div>
              <p className="text-[11px] text-plum-500 mt-1 font-medium">
                Letters, numbers, and underscores only (3–20 characters).
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
              >
                Email Address
              </label>
              <input
                onChange={handleChange}
                value={data.email}
                type="email"
                name="email"
                id="email"
                className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
              >
                Password
              </label>
              <input
                onChange={handleChange}
                value={data.password}
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
              >
                Confirm Password
              </label>
              <input
                onChange={handleChange}
                value={data.confirmPassword}
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                required
              />
            </div>

            <div className="flex items-start pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="terms"
                  type="checkbox"
                  className="w-4 h-4 rounded-lg border-border-subtle accent-chatora-pink text-chatora-pink focus:ring-chatora-pink/30 focus:ring-offset-0 mt-0.5"
                  required
                />
                <span className="text-xs text-plum-600 font-medium">
                  I accept the{" "}
                  <span className="text-chatora-pink font-bold hover:underline">Terms & Conditions</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 rounded-2xl text-sm font-extrabold px-5 py-3.5 text-center transition-all active:scale-[0.98] ${
                loading
                  ? "bg-cream-200 text-plum-400 border border-border-subtle cursor-not-allowed"
                  : "text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC]"
              }`}
            >
              {loading ? "Creating account..." : "Join Chatora ✨"}
            </button>

            <p className="text-center text-xs text-plum-500 pt-3 font-medium">
              Already have an account?{" "}
              <Link
                to={"/login"}
                className="font-bold text-chatora-pink hover:text-chatora-pinkHover hover:underline ml-1"
              >
                Sign in 💕
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Register;
