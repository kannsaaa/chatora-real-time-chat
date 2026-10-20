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
    { id: "email-delivery", title: "4. Transactional Email Delivery (Brevo)" },
    { id: "gemini-ai", title: "5. Google Gemini AI & Third-Party Services" },
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
                We deliver verification emails via Brevo REST API. We NEVER read, inspect, or access user inboxes or contacts.
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

          {/* Section 4: Transactional Email Delivery (Brevo) */}
          <section
            id="email-delivery"
            className="bg-white border-2 border-chatora-pink/30 rounded-3xl p-6 sm:p-10 shadow-sweet-pink relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-chatora-pink/10 to-transparent pointer-events-none rounded-bl-full"></div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-chatora-pink to-chatora-peach flex items-center justify-center text-white font-extrabold text-sm shadow-sweet-sm">
                4
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                  Transactional Email Delivery via Brevo API
                </h2>
                <span className="text-xs font-bold text-plum-500 uppercase tracking-wide">
                  Automated Transactional Mail Service
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                Chatora delivers account verification and password reset emails through <strong>Brevo</strong> (formerly Sendinblue), a certified transactional email provider, using direct HTTPS REST API endpoints.
              </p>

              {/* Service Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-cream-50 border border-border-subtle">
                <div className="text-xs font-extrabold uppercase tracking-wider text-plum-500 mb-1">
                  Delivery Method &amp; Scope
                </div>
                <div className="text-sm font-semibold text-plum-900">
                  REST API Transactional Dispatch (Send-Only)
                </div>
                <p className="text-xs text-plum-600 mt-1.5 font-medium">
                  Email communications are strictly limited to automated delivery of account verification links and security tokens.
                </p>
              </div>

              {/* Explicit Privacy Guarantee */}
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-plum-900">
                <h4 className="font-extrabold text-emerald-950 text-base mb-2 flex items-center gap-2">
                  <span>🛡️</span> Explicit Privacy Guarantee: What Chatora DOES NOT Do
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-900 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> access, read, or inspect users&apos; email inboxes or messages.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> access email contacts, address books, or calendars.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> share recipient email addresses with third-party advertisers or commercial brokers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Chatora does <strong>NOT</strong> send marketing blasts, newsletters, or promotional campaigns.</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs sm:text-sm text-plum-600">
                Transactional emails originate exclusively from our verified sender address to confirm user identity and protect account security.
              </p>
            </div>
          </section>

          {/* Section 5: Google Gemini AI & Third-Party Services */}
          <section
            id="gemini-ai"
            className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sweet"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-chatora-pinkLight flex items-center justify-center text-chatora-pink font-extrabold text-sm">
                5
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-900">
                  Google Gemini AI &amp; Third-Party Services
                </h2>
                <span className="text-xs font-bold text-plum-500 uppercase tracking-wide">
                  Creative Conversation Engine (Chaos Mode)
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-plum-700 leading-relaxed">
              <p>
                Chatora integrates with <strong>Google Gemini AI</strong> solely to power the creative prompt generation in our <strong>Chaos Mode</strong> feature (such as icebreakers, playful debates, and trivia questions).
              </p>

              <div className="p-4 sm:p-5 rounded-2xl bg-cream-50 border border-border-subtle space-y-2 text-xs sm:text-sm">
                <div className="font-bold text-plum-900">
                  How AI Generation Works:
                </div>
                <ul className="space-y-1.5 text-plum-600 pl-1">
                  <li>• Chaos Mode sends general prompt instructions (e.g. &ldquo;generate a friendly debate topic&rdquo;) to the Gemini API.</li>
                  <li>• <strong>No personal user data, private chat messages, or profile records</strong> are ever transmitted to the Gemini API.</li>
                  <li>• If Gemini is unavailable, Chaos Mode seamlessly uses our curated in-memory prompt pool.</li>
                </ul>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-plum-900 text-sm sm:text-base mb-3">
                  Google API Services User Data Policy Compliance:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                    <strong className="text-plum-900 block mb-1">1. Zero Private Data Transfer</strong>
                    <p className="text-plum-600">
                      We never send users&apos; private chats, contact lists, or personal identifiers to external AI services.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cream-50 border border-border-subtle">
                    <strong className="text-plum-900 block mb-1">2. No Advertising Use</strong>
                    <p className="text-plum-600">
                      We never use Google APIs for advertising, tracking, or profiling users across the web.
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
                Backend secrets, including email delivery credentials (<code className="text-xs font-mono text-plum-800">BREVO_API_KEY</code>), AI integration credentials (<code className="text-xs font-mono text-plum-800">GEMINI_API_KEY</code>), and JWT private keys are stored strictly in protected server environment variables and never exposed to the client bundle.
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
