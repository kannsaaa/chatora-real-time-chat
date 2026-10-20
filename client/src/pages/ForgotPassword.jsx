import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import ChatoraLogo from "../components/ChatoraLogo";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/user/forgot-password", { email });
      setSubmitted(true);
      toast.success(
        res?.data?.message || "Password reset instructions sent! ✨"
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Unable to send reset instructions. Please try again.";
      toast.error(msg);
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
          {!submitted ? (
            <>
              <div className="text-center mb-7">
                <span className="inline-block text-3xl mb-2 animate-bounce">
                  🔑
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-1">
                  Forgot Password?
                </h1>
                <p className="text-xs sm:text-sm text-plum-500 font-medium">
                  Enter your email address and we'll send you instructions to
                  reset your password.
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
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    type="email"
                    name="email"
                    id="email"
                    className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                    placeholder="name@example.com"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-2 rounded-2xl text-sm font-extrabold px-5 py-3.5 text-center transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-cream-200 text-plum-400 border border-border-subtle cursor-not-allowed"
                      : "text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC]"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-plum-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    <span>Send Reset Link ✨</span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-pink-50 border border-chatora-pink/20 text-chatora-pink flex items-center justify-center mx-auto mb-4 text-3xl shadow-sweet-sm">
                💌
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-sm text-plum-600 mb-6 leading-relaxed font-medium">
                If an account with{" "}
                <span className="font-bold text-plum-900">{email}</span> exists,
                we've sent password reset instructions to your inbox.
              </p>
              <p className="text-xs text-plum-500 mb-6 leading-relaxed">
                The link will expire in 1 hour. Don't see it? Be sure to check
                your spam or junk folder.
              </p>

              <div className="space-y-3">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center rounded-2xl text-sm font-extrabold px-5 py-3.5 text-center text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink transition-all active:scale-[0.98]"
                >
                  Return to Login 💬
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-bold text-plum-600 hover:text-plum-900 transition-colors"
                >
                  Didn't receive it? Try another email
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-border-subtle text-center">
            <Link
              to="/login"
              className="text-xs font-bold text-plum-600 hover:text-plum-900 transition-colors inline-flex items-center gap-1.5"
            >
              <span>←</span> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;
