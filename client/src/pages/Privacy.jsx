import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LandingNav from "../components/LandingNav";
import Footer from "../components/Footer";
import { toast } from "react-hot-toast";

const Privacy = () => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("brajrajsinh2708@gmail.com");
    setCopied(true);
    toast.success("Contact email copied to clipboard! 📋");
    setTimeout(() => setCopied(false), 3000);
  };

  const tableOfContents = [
    { id: "overview", title: "1. Overview & Commitment" },
    { id: "information-collected", title: "2. Information We Collect" },
    { id: "email-usage", title: "3. How We Use Email Addresses" },
    { id: "gmail-api", title: "4. Google Gmail API & gmail.send Scope" },
    { id: "google-limited-use", title: "5. Google Limited Use Disclosure" },
    { id: "no-sale", title: "6. We Do Not Sell User Data" },
    { id: "data-security", title: "7. Data Storage & Security" },
    { id: "user-rights", title: "8. User Controls & Data Rights" },
    { id: "contact-us", title: "9. Contact Information" },
  ];

  return (
    <div className="bg-cream-100 min-h-screen text-plum-900 select-none">
      <LandingNav />

      {/* Top Breadcrumb & Hero */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 border-b border-border-subtle bg-gradient-to-b from-cream-50 via-cream-100 to-cream-100">
        {/* Ambient Pastel Glow Elements */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[450px] h-[300px] bg-chatora-pink/15 rounded-full blur-[90px] pointer-events-none -z-0"></div>
        <div className="absolute top-1/3 right-1/4 w-[420px] h-[300px] bg-chatora-peach/20 rounded-full blur-[90px] pointer-events-none -z-0"></div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[400px] h-[220px] bg-chatora-lavender/15 rounded-full blur-[80px] pointer-events-none -z-0"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-plum-500 mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-chatora-pink transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
              <span>Home</span>
            </Link>
            <span className="text-plum-300">/</span>
            <span className="text-plum-800 font-bold">Privacy Policy</span>
          </div>

          {/* Hero Content */}
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-chatora-pink/30 text-chatora-pink text-xs font-extrabold mb-4 shadow-sweet-sm backdrop-blur-md">
              <span className="text-sm">🛡️</span>
              <span>Privacy & Transparency Commitment</span>
              <span className="w-1.5 h-1.5 rounded-full bg-chatora-pink animate-pulse"></span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-plum-900 leading-tight mb-4">
              Chatora Privacy Policy
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-plum-600 leading-relaxed font-medium mb-6">
              At Chatora, your privacy is paramount. This policy clearly outlines what information we collect, why we collect it, how we secure it, and our strict commitment to never selling your data or misusing permissions.
            </p>

            {/* Meta Information Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-bold text-plum-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border-subtle shadow-sweet-sm">
                <span>📅</span> Last Updated: October 2026
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border-subtle shadow-sweet-sm">
                <span>🌐</span> Public Access (No Login Required)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border-subtle shadow-sweet-sm text-chatora-pink">
                <span>✨</span> Sweet Chaos Standard
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Executive Highlights Grid */}
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-widest font-black text-plum-500 mb-4 text-center sm:text-left">
            Privacy At A Glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/90 border border-border-subtle rounded-3xl p-5 shadow-sweet hover:shadow-sweet-lg transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFB3C6] to-[#FFCCBC] flex items-center justify-center text-lg mb-3 shadow-sweet-sm">
                👤
              </div>
              <h3 className="text-sm font-bold text-plum-900 mb-1">
                Account Data Only
              </h3>
              <p className="text-xs text-plum-600 leading-relaxed font-medium">
                We only collect essential details: email, unique username, and profile info to run your account.
              </p>
            </div>

            <div className="bg-white/90 border border-border-subtle rounded-3xl p-5 shadow-sweet hover:shadow-sweet-lg transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-200 to-amber-100 flex items-center justify-center text-lg mb-3 shadow-sweet-sm">
                ✉️
              </div>
              <h3 className="text-sm font-bold text-plum-900 mb-1">
                Transactional Emails
              </h3>
              <p className="text-xs text-plum-600 leading-relaxed font-medium">
                Emails are strictly used for verification links and password resets. Zero unsolicited marketing.
              </p>
            </div>

            <div className="bg-white/90 border border-border-subtle rounded-3xl p-5 shadow-sweet hover:shadow-sweet-lg transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-200 to-teal-100 flex items-center justify-center text-lg mb-3 shadow-sweet-sm">
                🚫
              </div>
              <h3 className="text-sm font-bold text-plum-900 mb-1">
                Zero Inbox Access
              </h3>
              <p className="text-xs text-plum-600 leading-relaxed font-medium">
                We use Gmail API <code className="text-[11px] font-bold text-chatora-pink">gmail.send</code> only. We NEVER read inboxes, emails, or contacts.
              </p>
            </div>

            <div className="bg-white/90 border border-border-subtle rounded-3xl p-5 shadow-sweet hover:shadow-sweet-lg transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-200 to-purple-100 flex items-center justify-center text-lg mb-3 shadow-sweet-sm">
                🔒
              </div>
              <h3 className="text-sm font-bold text-plum-900 mb-1">
                Never Sold
              </h3>
              <p className="text-xs text-plum-600 leading-relaxed font-medium">
                We do not sell, rent, or trade your personal data to any advertisers, brokers, or third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Navigation Anchor Bar */}
        <div className="bg-cream-50 border border-border-subtle rounded-3xl p-5 mb-12 shadow-sweet">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🧭</span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-plum-700">
              Quick Navigation
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tableOfContents.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-xs font-bold text-plum-600 hover:text-plum-950 bg-white hover:bg-cream-200 border border-border-subtle/80 px-3 py-1.5 rounded-xl transition-colors shadow-sweet-sm"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-10">
          {/* Section 1: Overview & Commitment */}
          <section
            id="overview"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-pinkLight flex items-center justify-center text-chatora-pink font-extrabold text-sm">
                1
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                Overview & Transparency Commitment
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed font-normal">
              <p>
                Welcome to <strong>Chatora</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), a real-time social chat web application built to bring people together for expressive, fun conversations. Chatora is available publicly at{" "}
                <Link to="/" className="text-chatora-pink font-bold hover:underline">
                  chatora.app
                </Link>{" "}
                and related domains.
              </p>
              <p>
                This Privacy Policy explains how Chatora handles your personal information when you visit our website, register for an account, send messages, and utilize our services. We believe privacy should be simple, transparent, and easy to understand without dense legal jargon.
              </p>
              <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle text-xs sm:text-sm text-plum-700">
                <p className="font-bold text-plum-900 mb-1 flex items-center gap-2">
                  <span>📌</span> Key Privacy Rule:
                </p>
                <p>
                  You do not need to log in to read this Privacy Policy. This document is publicly accessible to all visitors, users, and reviewers at any time.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Information We Collect */}
          <section
            id="information-collected"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-peachLight flex items-center justify-center text-chatora-peach font-extrabold text-sm">
                2
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                Information We Collect
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                To provide a secure and functional chat experience, Chatora collects limited account information during registration and account setup:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <h4 className="font-bold text-plum-900 text-sm mb-1.5 flex items-center gap-2">
                    <span>📧</span> Email Address
                  </h4>
                  <p className="text-xs sm:text-sm text-plum-600">
                    Collected during sign-up to uniquely identify your account, send verification activation links, and permit secure password recovery.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <h4 className="font-bold text-plum-900 text-sm mb-1.5 flex items-center gap-2">
                    <span>🏷️</span> Username & Handle
                  </h4>
                  <p className="text-xs sm:text-sm text-plum-600">
                    A unique public handle (e.g. <code className="text-xs font-bold text-chatora-pink">@username</code>) chosen by you, used by other users to discover you in user search and start chats.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <h4 className="font-bold text-plum-900 text-sm mb-1.5 flex items-center gap-2">
                    <span>🎨</span> Profile Information
                  </h4>
                  <p className="text-xs sm:text-sm text-plum-600">
                    Your display name (First Name and Last Name), optional bio or status message, and your chosen avatar from our avatar generator.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <h4 className="font-bold text-plum-900 text-sm mb-1.5 flex items-center gap-2">
                    <span>🔑</span> Authentication Credentials
                  </h4>
                  <p className="text-xs sm:text-sm text-plum-600">
                    Your account password is cryptographically salted and hashed using <strong>bcrypt</strong> before storage. Chatora never sees or stores plaintext passwords.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-plum-900 text-sm sm:text-base mb-2">
                  Chat & Social Data
                </h3>
                <p className="text-xs sm:text-sm text-plum-600">
                  When you use Chatora, the messages you exchange, group memberships, friendship links, and blocks are stored in our secure database to enable real-time delivery, message sync across devices, unsend operations, and conversation history.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: How We Use Email Addresses */}
          <section
            id="email-usage"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-lavenderLight flex items-center justify-center text-chatora-lavender font-extrabold text-sm">
                3
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                How We Use Email Addresses
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                Email addresses collected by Chatora are strictly utilized for <strong>transactional, account-security related communications</strong>. Specifically:
              </p>

              <ul className="space-y-3 pl-2">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <strong className="text-plum-900">Account Verification:</strong> When registering, we send a single verification email containing an expiring one-hour token link to confirm you own the provided email address.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <strong className="text-plum-900">Forgot Password & Password Reset:</strong> If you request account recovery, an authorized password-reset link is dispatched to your registered email address.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <strong className="text-plum-900">Critical Account Security Alerts:</strong> Important administrative notices regarding the security or operational integrity of your account.
                  </div>
                </li>
              </ul>

              <div className="p-4 rounded-2xl bg-red-50/70 border border-red-100 text-xs sm:text-sm text-red-900 font-medium">
                <strong>🚫 Absolute Zero Spam Policy:</strong> We do NOT send newsletters, marketing blasts, product pitches, or unsolicited promotional emails. We will never share or sell your email address to commercial marketing lists.
              </div>
            </div>
          </section>

          {/* Section 4: Google Gmail API & gmail.send Scope */}
          <section
            id="gmail-api"
            className="bg-white border-2 border-chatora-pink/30 rounded-3xl p-6 sm:p-10 shadow-sweet-pink relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-chatora-pink/10 to-transparent pointer-events-none rounded-bl-full"></div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-chatora-pink to-chatora-peach flex items-center justify-center text-white font-extrabold text-sm shadow-sweet-sm">
                4
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                  Google Gmail API &amp; <code className="text-chatora-pink">gmail.send</code> Scope
                </h2>
                <span className="text-xs font-bold text-plum-500 uppercase tracking-wide">
                  Transactional Mail Delivery System
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                Chatora integrates with Google APIs using the official Google Gmail API Node.js library (<code className="px-2 py-0.5 rounded-lg bg-cream-200 text-plum-900 font-mono text-xs">googleapis</code>) solely to facilitate automated email dispatch.
              </p>

              {/* Scope Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-cream-50 border border-border-subtle">
                <div className="text-xs font-extrabold uppercase tracking-wider text-plum-500 mb-1">
                  OAuth 2.0 Requested Scope
                </div>
                <div className="text-sm sm:text-base font-mono font-bold text-plum-900 break-all bg-white px-3 py-2 rounded-xl border border-border-subtle">
                  https://www.googleapis.com/auth/gmail.send
                </div>
                <p className="text-xs text-plum-600 mt-2 font-medium">
                  This scope provides restricted, send-only permissions used by our server backend to deliver verification and account recovery emails to you.
                </p>
              </div>

              {/* Prominent Negative Guarantee / Boundary */}
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-plum-900">
                <h4 className="font-extrabold text-emerald-950 text-base mb-2 flex items-center gap-2">
                  <span>🛡️</span> Explicit Privacy Guarantee: What Chatora DOES NOT Do
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-900 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> read users&apos; Gmail inboxes, incoming emails, or outgoing messages.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> inspect, analyze, scan, index, or store users&apos; email contents, drafts, or email threads.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> access Google Contacts, address books, calendar entries, or Google Drive files.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> request any read scopes such as <code className="font-mono text-xs">gmail.readonly</code> or full mailbox access.</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs sm:text-sm text-plum-600">
                Our application only sends transactional messages from our verified service address (<code className="text-xs font-mono font-bold text-plum-800">brajrajsinh2708@gmail.com</code>) to the recipient email you registered with.
              </p>
            </div>
          </section>

          {/* Section 5: Google Limited Use Disclosure */}
          <section
            id="google-limited-use"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-pinkLight flex items-center justify-center text-chatora-pink font-extrabold text-sm">
                5
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                Google API Services User Data Policy &amp; Limited Use
              </h2>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                Chatora complies strictly with Google&apos;s policies governing the use of Google API Services. In accordance with Google&apos;s developer requirements, we provide the following official disclosure:
              </p>

              {/* Required Google Disclosure Quote */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cream-100 to-cream-50 border-2 border-chatora-pink/30 text-plum-900 shadow-sweet-sm">
                <div className="text-xs font-black uppercase tracking-wider text-chatora-pink mb-2 flex items-center gap-1.5">
                  <span>📜</span> Official Limited Use Disclosure
                </div>
                <blockquote className="text-sm sm:text-base font-bold italic text-plum-900 leading-relaxed">
                  &ldquo;Chatora&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-chatora-pink underline hover:text-chatora-pinkHover"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.&rdquo;
                </blockquote>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-plum-900 text-sm sm:text-base mb-3">
                  Our Adherence to Limited Use Principles:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                    <strong className="text-plum-900 block mb-1">1. No Human Reading</strong>
                    <p className="text-plum-600">
                      Humans do not read any Google user data, unless you provide affirmative agreement for specific messages, necessary for security/bug investigation, or required by law.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                    <strong className="text-plum-900 block mb-1">2. No Advertising Use</strong>
                    <p className="text-plum-600">
                      We never use or transfer Google user data for serving advertisements, retargeting campaigns, or interest-based marketing.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                    <strong className="text-plum-900 block mb-1">3. Minimal Transfers</strong>
                    <p className="text-plum-600">
                      We only transfer data if necessary to provide or improve user-facing features that are prominent in the Chatora interface, or to comply with applicable law.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                    <strong className="text-plum-900 block mb-1">4. No AI/ML Training</strong>
                    <p className="text-plum-600">
                      We do not use or transfer data received from Google APIs to train, retrain, or fine-tune artificial intelligence or generalized machine learning models.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: We Do Not Sell User Data */}
          <section
            id="no-sale"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-sm">
                6
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                We Do Not Sell User Data
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p className="text-base sm:text-lg font-bold text-plum-900">
                Chatora does not sell, trade, rent, license, or monetize user data under any circumstances.
              </p>
              <p>
                Your personal details, contact information, messaging logs, and profile records are never treated as a commercial asset to be brokered to third parties. We do not participate in third-party data broker networks, cross-app ad tracking, or affiliate lead sharing.
              </p>
              <p>
                Our service is supported directly through our own infrastructure, and we do not rely on ad networks that harvest user data.
              </p>
            </div>
          </section>

          {/* Section 7: Data Storage & Security */}
          <section
            id="data-security"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-peachLight flex items-center justify-center text-chatora-peach font-extrabold text-sm">
                7
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                Reasonable Data Storage &amp; Security Practices
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                We employ reasonable and industry-standard technical, operational, and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <div className="font-bold text-plum-900 text-sm mb-1 flex items-center gap-2">
                    <span>🛡️</span> Transport Layer Encryption (TLS/HTTPS)
                  </div>
                  <p className="text-xs sm:text-sm text-plum-600">
                    All web communications and real-time WebSocket traffic are strictly encrypted in transit using industry-standard TLS (HTTPS and WSS).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <div className="font-bold text-plum-900 text-sm mb-1 flex items-center gap-2">
                    <span>🍪</span> HttpOnly Cookie Authentication
                  </div>
                  <p className="text-xs sm:text-sm text-plum-600">
                    Session authentication tokens (JWT) are stored in <code className="font-mono text-xs">httpOnly</code>, <code className="font-mono text-xs">SameSite: Lax</code> cookies, protecting user sessions from client-side JavaScript inspection and XSS attacks.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <div className="font-bold text-plum-900 text-sm mb-1 flex items-center gap-2">
                    <span>🔐</span> Salted Password Hashing
                  </div>
                  <p className="text-xs sm:text-sm text-plum-600">
                    User passwords are irreversibly hashed using bcrypt with multiple salt rounds before writing to database records. Plaintext passwords never enter persistence.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                  <div className="font-bold text-plum-900 text-sm mb-1 flex items-center gap-2">
                    <span>🗄️</span> Isolated Database Architecture
                  </div>
                  <p className="text-xs sm:text-sm text-plum-600">
                    MongoDB database records are protected by authenticated access controls, isolated connection pools, and strict projection field sanitization.
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-plum-600">
                Backend secrets, including Google API OAuth2 credentials (<code className="text-xs font-mono text-plum-800">GMAIL_CLIENT_ID</code>, <code className="text-xs font-mono text-plum-800">GMAIL_CLIENT_SECRET</code>, <code className="text-xs font-mono text-plum-800">GMAIL_REFRESH_TOKEN</code>), and JWT private keys are stored strictly in protected server environment variables and never exposed to the client bundle.
              </p>
            </div>
          </section>

          {/* Section 8: User Controls & Data Rights */}
          <section
            id="user-rights"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-lavenderLight flex items-center justify-center text-chatora-lavender font-extrabold text-sm">
                8
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                User Controls &amp; Data Rights
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                Chatora provides interactive user controls within the application to empower you with ownership of your data:
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-cream-50 border border-border-subtle flex items-start gap-3">
                  <span className="text-lg">✏️</span>
                  <div>
                    <strong className="text-plum-900 text-sm">Profile Customization:</strong>
                    <p className="text-xs sm:text-sm text-plum-600">
                      You can modify your display name, bio, and avatar at any time directly through the Profile tab.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cream-50 border border-border-subtle flex items-start gap-3">
                  <span className="text-lg">⏳</span>
                  <div>
                    <strong className="text-plum-900 text-sm">Message Unsend (Grace Period):</strong>
                    <p className="text-xs sm:text-sm text-plum-600">
                      You can unsend any sent message within a 15-minute window. Unsending deletes the message from MongoDB and broadcasts real-time removal across all clients.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cream-50 border border-border-subtle flex items-start gap-3">
                  <span className="text-lg">🗑️</span>
                  <div>
                    <strong className="text-plum-900 text-sm">Delete for Me:</strong>
                    <p className="text-xs sm:text-sm text-plum-600">
                      You can hide specific messages or conversations locally from your device view at any time.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cream-50 border border-border-subtle flex items-start gap-3">
                  <span className="text-lg">🚫</span>
                  <div>
                    <strong className="text-plum-900 text-sm">Account Deletion &amp; Data Erasure:</strong>
                    <p className="text-xs sm:text-sm text-plum-600">
                      You have the right to request full deletion of your account and personal data. Simply reach out to our contact email below, and our team will process your deletion request promptly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9: Contact Information */}
          <section
            id="contact-us"
            className="bg-gradient-to-br from-white via-cream-50 to-cream-100 border-2 border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-chatora-pink to-chatora-peach flex items-center justify-center text-white font-extrabold text-sm shadow-sweet-sm">
                9
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                Contact Information
              </h2>
            </div>

            <div className="space-y-5 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                If you have questions, feedback, privacy concerns, or data deletion requests regarding this Privacy Policy or Chatora&apos;s data practices, please reach out directly:
              </p>

              {/* Direct Email Card */}
              <div className="bg-white border border-chatora-pink/30 rounded-2xl p-5 shadow-sweet flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-chatora-pinkLight text-chatora-pink flex items-center justify-center text-xl shrink-0">
                    📧
                  </div>
                  <div>
                    <div className="text-xs uppercase font-extrabold text-plum-500 tracking-wider">
                      Official Contact Email
                    </div>
                    <a
                      href="mailto:brajrajsinh2708@gmail.com"
                      className="text-base sm:text-lg font-black text-chatora-pink hover:text-chatora-pinkHover hover:underline break-all"
                    >
                      brajrajsinh2708@gmail.com
                    </a>
                    <div className="text-xs text-plum-500 font-medium">
                      Operated &amp; Maintained by Brajrajsinh
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href="mailto:brajrajsinh2708@gmail.com"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-chatora-pink to-chatora-peach hover:shadow-sweet-pink transition-all active:scale-95 text-center"
                  >
                    Send Email 💬
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    type="button"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-plum-800 bg-cream-200 hover:bg-cream-300 border border-border-subtle transition-all active:scale-95"
                  >
                    {copied ? "Copied! ✓" : "Copy Email"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-subtle text-xs text-plum-500">
                <span>
                  We aim to respond to all legitimate privacy inquiries within 48 business hours.
                </span>
                <Link
                  to="/"
                  className="font-bold text-chatora-pink hover:underline inline-flex items-center gap-1"
                >
                  <span>Return to Chatora Home</span>
                  <svg
                    className="w-3.5 h-3.5"
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
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacy;
