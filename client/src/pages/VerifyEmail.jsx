import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/authContext";
import ChatoraLogo from "../components/ChatoraLogo";

const VerifyEmail = () => {
  const { id, token } = useParams();
  const [loading, setLoading] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const { isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) navigate("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let isMounted = true;

    if (!id || !token) {
      setVerifiedSuccess(false);
      setStatusMessage("Invalid verification link parameters.");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/user/${id}/verify/${token}`);
        if (isMounted) {
          toast.success(response.data.message || "Email verified! ✨");
          setVerifiedSuccess(true);
          setStatusMessage("Your email has been verified! You're ready to jump into Chatora.");
        }
      } catch (error) {
        if (!isMounted) return;
        const errMsg = error.response?.data?.message || "";
        if (errMsg.toLowerCase().includes("already verified")) {
          toast.success("Account is already verified! You can log in. ✨");
          setVerifiedSuccess(true);
          setStatusMessage("Your email address is already verified. You can log in right away!");
        } else {
          setVerifiedSuccess(false);
          const failMsg = errMsg || "Verification failed. The link may be expired or invalid.";
          setStatusMessage(failMsg);
          toast.error(failMsg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id, token]);

  return (
    <div className="bg-cream-100 min-h-screen text-plum-900 flex justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background ambient light effects */}
      <div className="w-[500px] h-[500px] bg-chatora-pink/15 rounded-full blur-3xl absolute -top-40 -left-40 pointer-events-none"></div>
      <div className="w-[400px] h-[400px] bg-chatora-peach/20 rounded-full blur-3xl absolute -bottom-20 -right-20 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <ChatoraLogo size="lg" to="/" showTagline={false} />
        </div>

        <div className="bg-white border border-border-subtle rounded-3xl p-8 sm:p-10 shadow-sweet-lg text-center">
          {loading ? (
            <div className="flex flex-col items-center py-6" role="status">
              <div className="w-16 h-16 rounded-3xl bg-cream-100 border border-border-subtle flex items-center justify-center mb-4">
                <div className="w-8 h-8 rounded-full border-3 border-chatora-pink border-t-transparent animate-spin"></div>
              </div>
              <h2 className="text-xl font-bold text-plum-900 mb-2">
                Verifying your account...
              </h2>
              <p className="text-sm text-plum-500 font-medium">
                Please wait a moment while we validate your link ✨
              </p>
            </div>
          ) : (
            <div className="py-4">
              <div
                className={`w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto mb-5 shadow-sweet-sm ${
                  verifiedSuccess
                    ? "bg-emerald-50 border-emerald-200 text-emerald-500"
                    : "bg-rose-50 border-rose-200 text-rose-500"
                }`}
              >
                {verifiedSuccess ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-8 h-8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-8 h-8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z"
                    />
                  </svg>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-plum-900 mb-2 tracking-tight">
                {verifiedSuccess ? "Account Verified ✨" : "Verification Status"}
              </h2>
              <p className="text-sm text-plum-600 mb-6 max-w-xs mx-auto font-medium">
                {statusMessage ||
                  (verifiedSuccess
                    ? "Your email has been verified! You're ready to jump into Chatora."
                    : "Verification request completed. Check status or sign in.")}
              </p>

              {!isAuthenticated && (
                <div className="space-y-3">
                  <Link
                    to={"/login"}
                    className="inline-flex items-center justify-center w-full px-6 py-3.5 text-sm font-extrabold text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 rounded-2xl shadow-sm hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC] transition-all active:scale-95"
                  >
                    Proceed to Login 💬
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>

                  {!verifiedSuccess && (
                    <Link
                      to={"/register"}
                      className="inline-flex items-center justify-center w-full px-6 py-2.5 text-xs font-bold text-plum-600 bg-cream-100 hover:bg-cream-200 border border-border-subtle rounded-xl transition-all"
                    >
                      Try Registering Again
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
