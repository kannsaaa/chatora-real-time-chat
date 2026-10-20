import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import ChatoraLogo from "../components/ChatoraLogo";

const ResetPassword = () => {
  const { id, token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!id || !token) {
      setValidatingToken(false);
      setTokenValid(false);
      setTokenError("Invalid password reset link parameters.");
      return;
    }

    const checkToken = async () => {
      try {
        setValidatingToken(true);
        await axios.get(`/api/user/password-reset/${id}/${token}`);
        if (isMounted) {
          setTokenValid(true);
        }
      } catch (err) {
        if (!isMounted) return;
        setTokenValid(false);
        const msg =
          err?.response?.data?.message ||
          "This password reset link is invalid or has expired.";
        setTokenError(msg);
      } finally {
        if (isMounted) {
          setValidatingToken(false);
        }
      }
    };

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/user/password-reset/${id}/${token}`, {
        password,
      });
      setResetSuccess(true);
      toast.success(
        res?.data?.message || "Password updated successfully! ✨"
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to reset password. Please try again or request a new link.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

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
          {validatingToken ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-3xl bg-cream-100 border border-border-subtle flex items-center justify-center mb-4">
                <div className="w-8 h-8 rounded-full border-3 border-chatora-pink border-t-transparent animate-spin"></div>
              </div>
              <h2 className="text-xl font-bold text-plum-900 mb-2">
                Verifying reset link...
              </h2>
              <p className="text-sm text-plum-500 font-medium">
                Please wait a moment while we validate your security token ✨
              </p>
            </div>
          ) : !tokenValid ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto mb-4 text-3xl shadow-sweet-sm">
                ⚠️
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-2">
                Link Expired or Invalid
              </h2>
              <p className="text-sm text-plum-600 mb-6 leading-relaxed font-medium">
                {tokenError ||
                  "This password reset link is invalid or has already expired. Password reset links are valid for 1 hour."}
              </p>

              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="w-full inline-flex items-center justify-center rounded-2xl text-sm font-extrabold px-5 py-3.5 text-center text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink transition-all active:scale-[0.98]"
                >
                  Request a New Link ✨
                </Link>
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center rounded-xl text-xs font-bold px-4 py-2 text-plum-600 hover:text-plum-900 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : resetSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-500 flex items-center justify-center mx-auto mb-4 text-3xl shadow-sweet-sm">
                🎉
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-2">
                Password Updated!
              </h2>
              <p className="text-sm text-plum-600 mb-6 leading-relaxed font-medium">
                Your password has been changed successfully. You can now log in
                with your new credentials.
              </p>

              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center rounded-2xl text-sm font-extrabold px-5 py-3.5 text-center text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink transition-all active:scale-[0.98]"
              >
                Proceed to Login 💬
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-7">
                <span className="inline-block text-3xl mb-2 animate-bounce">
                  ✨
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-plum-900 mb-1">
                  Create New Password
                </h1>
                <p className="text-xs sm:text-sm text-plum-500 font-medium">
                  Enter and confirm your new secure password below.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      onChange={(e) => setPassword(e.target.value)}
                      value={password}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-plum-400 hover:text-plum-700"
                      tabIndex={-1}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      value={confirmPassword}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      id="confirmPassword"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-2xl bg-cream-50 border border-border-subtle text-plum-900 placeholder-plum-500 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all text-sm font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-plum-400 hover:text-plum-700"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* Password requirement chips */}
                <div className="py-1 space-y-1.5 text-[11px] font-medium text-plum-600">
                  <p className="font-bold text-plum-700 mb-1">
                    Password requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasMinLength ? "text-emerald-600 font-bold" : ""
                      }`}
                    >
                      <span>{hasMinLength ? "✓" : "○"}</span> At least 8
                      characters
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasLower && hasUpper ? "text-emerald-600 font-bold" : ""
                      }`}
                    >
                      <span>{hasLower && hasUpper ? "✓" : "○"}</span> Upper &
                      lowercase
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasNumber ? "text-emerald-600 font-bold" : ""
                      }`}
                    >
                      <span>{hasNumber ? "✓" : "○"}</span> At least 1 number
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasSymbol ? "text-emerald-600 font-bold" : ""
                      }`}
                    >
                      <span>{hasSymbol ? "✓" : "○"}</span> At least 1 symbol
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full mt-2 rounded-2xl text-sm font-extrabold px-5 py-3.5 text-center transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    submitting
                      ? "bg-cream-200 text-plum-400 border border-border-subtle cursor-not-allowed"
                      : "text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-plum-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Update Password ✨</span>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-border-subtle text-center">
            <Link
              to="/login"
              className="text-xs font-bold text-plum-600 hover:text-plum-900 transition-colors inline-flex items-center gap-1.5"
            >
              <span>←</span> Return to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResetPassword;
