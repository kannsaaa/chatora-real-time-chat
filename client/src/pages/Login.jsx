import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/authContext";
import ChatoraLogo from "../components/ChatoraLogo";

const Login = () => {
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const navigate = useNavigate();
  const { isAuthenticated, setAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chathome");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const url = "/api/user/login";
      const response = await axios.post(url, data, {
        withCredentials: true,
      });
      if (response.status === 200) {
        toast.success(response.data.message || "Welcome back to Chatora! 💕");
        setAuthenticated(true);
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        toast.error(error.response.data.message || "Login failed");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-cream-100 min-h-screen text-plum-900 flex items-center justify-center p-4 py-8 sm:py-12 relative overflow-y-auto select-none">
      {/* Background ambient sweet light effects */}
      <div className="w-[500px] h-[500px] bg-chatora-pink/15 rounded-full blur-3xl absolute -top-40 -left-40 pointer-events-none"></div>
      <div className="w-[400px] h-[400px] bg-chatora-peach/20 rounded-full blur-3xl absolute -bottom-20 -right-20 pointer-events-none"></div>
      <div className="w-[300px] h-[300px] bg-chatora-lavender/15 rounded-full blur-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="flex justify-center mb-6">
          <ChatoraLogo size="lg" to="/" showTagline={false} />
        </div>

        <div className="bg-white border border-border-subtle rounded-3xl p-8 sm:p-10 shadow-sweet-lg relative">
          <div className="text-center mb-7">
            <span className="inline-block text-3xl mb-2 animate-bounce">💕</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-1">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-plum-500 font-medium">
              Ready to chat? Enter your credentials below.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded-lg border-border-subtle accent-chatora-pink text-chatora-pink focus:ring-chatora-pink/30 focus:ring-offset-0"
                />
                <span className="text-xs text-plum-600 hover:text-plum-800 transition-colors font-medium">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  toast(
                    "Password reset is disabled in this environment. Contact admin.",
                    { icon: "ℹ️" }
                  )
                }
                className="text-xs font-semibold text-chatora-pink hover:text-chatora-pinkHover hover:underline bg-transparent border-0 cursor-pointer p-0 transition-colors"
              >
                Forgot password?
              </button>
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
              {loading ? "Signing in..." : "Log in 💬"}
            </button>

            <p className="text-center text-xs text-plum-500 pt-3 font-medium">
              New to Chatora?{" "}
              <Link
                to={"/register"}
                className="font-bold text-chatora-pink hover:text-chatora-pinkHover hover:underline ml-1"
              >
                Create account ✨
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;
