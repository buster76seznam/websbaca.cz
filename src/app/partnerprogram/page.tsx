'use client';

export const dynamic = 'force-dynamic';

import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, ArrowUpRight, TrendingUp, Users, Award, Zap, BarChart3, Sparkles, LogOut, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAffiliate } from '@/contexts/AffiliateContext';
import { useCountry } from '@/contexts/CountryContext';
import { TIER_STRUCTURE, getProgressToNextTier } from '@/lib/affiliate-config';
import { formatPrice } from '@/lib/countries-config';
import QRCode from 'qrcode';

export default function PartnerProgramPage() {
  const { partner, isLoggedIn, login, logout } = useAffiliate();
  const { country } = useCountry();

  const [showDashboard, setShowDashboard] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    socialLinks: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPartnerId, setLoginPartnerId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn && partner?.referralLink) {
      generateQRCode(partner.referralLink);
      setShowDashboard(true);
    }
  }, [isLoggedIn, partner]);

  const generateQRCode = async (url: string) => {
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCode(qr);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleCopyLink = () => {
    if (partner?.referralLink) {
      navigator.clipboard.writeText(partner.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPNG = async () => {
    if (!partner?.referralLink) return;
    try {
      const highResQr = await QRCode.toDataURL(partner.referralLink, {
        width: 2048,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      const link = document.createElement('a');
      link.href = highResQr;
      link.download = `websbaca-qr-${partner.partnerId || 'partner'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download PNG:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!partner?.referralLink) return;
    try {
      const highResQr = await QRCode.toDataURL(partner.referralLink, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${partner.partnerId}</title>
              <style>
                body { 
                  margin: 0; 
                  display: flex; 
                  flex-direction: column;
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background: white;
                  color: black;
                }
                .container { text-align: center; padding: 40px; }
                img { width: 400px; height: 400px; margin: 20px 0; }
                h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; }
                p { font-weight: bold; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>WebsBaca Partner QR</h1>
                <img src="${highResQr}" />
                <p>Partner ID: ${partner.partnerId}</p>
              </div>
              <script>
                window.onload = () => {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const response = await fetch('/api/influencers/stripe-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        setFormError(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setFormError('Registration failed. Please try again.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch('/api/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: loginPartnerId.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        await login(loginPartnerId.trim());
        setShowLoginModal(false);
        setLoginPartnerId('');
      } else {
        setLoginError(data.error || 'Login failed. Please check your Partner ID.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-100px' },
    transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] as const }
  };

  // If logged in, show dashboard
  if (showDashboard && isLoggedIn && partner) {
    const tier = TIER_STRUCTURE[partner.tier];
    const progress = getProgressToNextTier(partner.activeClients);

    return (
      <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#030303] text-white selection:bg-brand selection:text-white antialiased w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <nav className="sticky inset-x-0 top-0 w-full max-w-full overflow-hidden box-border z-50 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between min-w-0 overflow-hidden">
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="relative w-10 h-10 overflow-hidden rounded-lg border-2 border-brand bg-brand/10 group-hover:border-brand-light transition-all duration-500">
                {!logoError ? (
                  <Image
                    src="/Logo.png"
                    alt="Webs Bača Logo"
                    fill
                    sizes="40px"
                    className="object-contain p-1"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-brand flex items-center justify-center">
                    <span className="text-white font-black text-xs">W</span>
                  </div>
                )}
              </div>
              <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">WEBS BAČA</span>
            </div>

            <div className="flex items-center gap-4">
              <a href="/" className="text-sm font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition">
                Back to main site
              </a>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-500 dark:text-red-400 px-4 py-2 rounded-lg transition font-bold text-sm"
              >
                <LogOut size={16} />
                Logout
              </motion.button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 w-full max-w-full overflow-x-hidden">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-black mb-4 text-gray-900 dark:text-white">
              Welcome, <span className="text-brand">{partner.name}</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-zinc-400">Your partner dashboard is ready to help you earn passive income.</p>
          </motion.div>

          {/* Tier Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${tier.bgColor} border ${tier.borderColor} rounded-3xl p-8 md:p-12 mb-16`}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-black mb-2 text-gray-900 dark:text-white">{tier.name}</h2>
                <p className="text-gray-700 dark:text-zinc-400 font-bold">
                  {partner.commissionPercent}% commission • {partner.activeClients} active clients
                </p>
              </div>
              <Award size={64} className="text-brand opacity-40" />
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Progress to Next Tier</span>
                <span className="text-sm font-bold text-brand">{Math.round(progress.percent)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full bg-gradient-to-r ${tier.color}`}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3 font-bold">{progress.message}</p>
            </div>

            {/* Recurring Revenue Highlight */}
            <div className="mt-8 pt-8 border-t border-gray-300 dark:border-white/10">
              <p className="text-sm font-black text-brand uppercase tracking-widest">💰 Recurring MRR</p>
              <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mt-2">
                You get paid <span className="text-brand">every single month</span> as long as your clients stay with us.
              </p>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700 dark:text-zinc-300 text-sm">Total Clicks</h3>
                <TrendingUp size={24} className="text-blue-500" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white">{partner.totalClicks}</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">via referral link & QR code</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700 dark:text-zinc-300 text-sm">Active Clients</h3>
                <Users size={24} className="text-green-500" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white">{partner.activeClients}</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">paying customers</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700 dark:text-zinc-300 text-sm">Total Generated</h3>
                <BarChart3 size={24} className="text-purple-500" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white">{formatPrice(partner.monthlyRevenue, country.currency)}</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">customer MRR</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700 dark:text-zinc-300 text-sm">Your Payout</h3>
                <Award size={24} className="text-amber-500" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white">{formatPrice(partner.monthlyPayout, country.currency)}</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">monthly commission</p>
            </motion.div>
          </div>

          {/* Referral Tools Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Referral Link Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-brand/5 to-purple-50 dark:from-brand/10 dark:to-purple-500/5 border border-brand/20 dark:border-brand/20 rounded-3xl p-8"
            >
              <h3 className="text-2xl font-black mb-6 text-gray-900 dark:text-white">Unique Referral Link</h3>
              <div className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-4 mb-4 flex items-center justify-between gap-2">
                <code className="text-sm text-gray-700 dark:text-zinc-300 break-all font-mono">{partner.referralLink}</code>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyLink}
                  className="shrink-0 bg-brand hover:bg-brand-dark text-white p-2 rounded-lg transition"
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </motion.button>
              </div>
              {copied && (
                <p className="text-sm text-green-600 dark:text-green-400 font-bold">✓ Copied to clipboard!</p>
              )}
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">Share this link with your audience</p>
            </motion.div>

            {/* QR Code Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-cyan-50 dark:from-cyan-500/10 to-blue-50 dark:to-blue-500/5 border border-cyan-200 dark:border-cyan-500/20 rounded-3xl p-8"
            >
              <h3 className="text-2xl font-black mb-6 text-gray-900 dark:text-white uppercase tracking-tighter">QR Code Generator</h3>
              {qrCode && (
                <div className="mb-6 flex justify-center">
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadPNG}
                  className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-xl transition font-black uppercase tracking-tighter shadow-xl group"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                  Download PNG
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/10 text-gray-900 dark:text-white border-2 border-gray-900 dark:border-white/20 px-6 py-4 rounded-xl transition font-black uppercase tracking-tighter shadow-lg group"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                  Download PDF
                </motion.button>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-4 font-bold text-center">High-resolution QR for your videos and print materials</p>
            </motion.div>
          </div>
        </main>

        <footer className="py-20 px-4 sm:px-6 md:px-8 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#020202] w-full max-w-full overflow-hidden">
          <div className="max-w-7xl mx-auto text-center text-sm text-gray-600 dark:text-zinc-500 font-bold">
            <p>Questions? Contact us: <a href="mailto:info@websbaca.cz" className="text-brand hover:text-brand-dark transition">info@websbaca.cz</a></p>
          </div>
        </footer>
      </div>
    );
  }

  // Main Partner Program Page
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#030303] text-gray-900 dark:text-white selection:bg-brand selection:text-white antialiased w-full max-w-full overflow-x-hidden">
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white dark:bg-[#111] border-2 border-gray-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-md relative"
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-zinc-400 transition"
              >
                <X size={16} />
              </button>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Partner Login</h2>
              <p className="text-sm text-gray-600 dark:text-zinc-400 font-bold mb-6">
                Enter your Partner ID to access your dashboard.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-zinc-300 mb-2">
                    Partner ID
                  </label>
                  <input
                    type="text"
                    required
                    value={loginPartnerId}
                    onChange={(e) => setLoginPartnerId(e.target.value)}
                    placeholder="ref_xxxxxx"
                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-brand transition font-mono font-bold"
                  />
                </div>

                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {loginError}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-brand hover:bg-brand-dark text-white py-3 rounded-xl font-black uppercase tracking-tighter transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </motion.button>

                <p className="text-center text-sm text-gray-500 dark:text-zinc-500 font-bold">
                  Don't have an ID?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setTimeout(() => document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }}
                    className="text-brand hover:text-brand-dark font-black underline transition"
                  >
                    Register below
                  </button>
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="sticky inset-x-0 top-0 w-full max-w-full overflow-hidden box-border z-50 bg-white/60 dark:bg-black/40 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 transition-all duration-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-20 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="relative w-12 h-12 overflow-hidden rounded-2xl border-2 border-brand bg-brand/10 group-hover:border-brand-light transition-all duration-500">
              {!logoError ? (
                <Image
                  src="/Logo.png"
                  alt="Webs Bača Logo"
                  fill
                  sizes="48px"
                  className="object-contain p-1"
                  onError={() => setLogoError(true)}
                  priority
                />
              ) : (
                <div className="w-full h-full bg-brand flex items-center justify-center">
                  <span className="text-white font-black text-lg">W</span>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter">WEBS BAČA</span>
              <span className="text-[8px] font-black text-brand tracking-[0.3em]">PREMIUM DIGITAL</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition hidden sm:inline">
              Back to main site
            </a>
            {isLoggedIn ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDashboard(true)}
                className="shrink-0 bg-brand text-white px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black hover:bg-brand-dark transition-all duration-300 uppercase tracking-widest"
              >
                Go to Dashboard
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLoginModal(true)}
                className="shrink-0 bg-brand text-white px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black hover:bg-brand-dark transition-all duration-300 uppercase tracking-widest"
              >
                Partner Login
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      <main className="w-full max-w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative w-full px-4 sm:px-6 md:px-8 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.08),transparent_60%)]" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">

          </div>

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] as const }}
              className="text-center flex flex-col items-center"
            >
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-7xl font-black tracking-tighter mb-8 leading-[1.1] text-balance uppercase">
                Earn recurring income<br />with <span className="text-brand">Webs Bača.</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-zinc-400 font-medium leading-relaxed mb-12 max-w-3xl">
                Promote high-converting 24h websites to your audience. Earn <span className="font-black text-brand">10% to 20% lifetime</span> monthly recurring revenue (MRR) for every paying client.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-brand text-white px-8 sm:px-10 md:px-12 py-5 sm:py-6 md:py-7 rounded-[2rem] text-base sm:text-lg md:text-xl font-black hover:bg-brand-dark transition-all duration-500 flex items-center justify-center gap-3 group uppercase tracking-tighter shadow-2xl shadow-brand/30"
              >
                Become a Partner
                <ArrowUpRight size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
              </motion.button>
            </motion.div>
          </div>
        </section>

        {/* Tier System & Commission Calculator */}
        <section className="w-full px-4 sm:px-6 md:px-8 py-20 md:py-28 bg-gray-50 dark:bg-[#050505] relative overflow-hidden max-w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] max-w-full bg-brand/5 rounded-full blur-[200px] pointer-events-none" /></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div {...fadeIn} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase">
                Commission <br />
                <span className="text-brand">Tiers & Rewards</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 font-bold max-w-2xl mx-auto">
                The more clients you bring, the higher your commission rate. Recurring MRR – You get paid every single month as long as the client stays with us.
              </p>
            </motion.div>

            {/* Tier Cards Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {([1, 2, 3] as const).map((tierNum) => {
                const tier = TIER_STRUCTURE[tierNum];
                return (
                  <motion.div
                    key={tierNum}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6, delay: tierNum * 0.1 }}
                    className={`relative group rounded-3xl p-8 md:p-10 border-2 transition-all duration-500 overflow-hidden ${
                      tierNum === 3
                        ? `${tier.bgColor} ${tier.borderColor} ring-2 ring-brand/50 scale-105 shadow-2xl shadow-brand/20`
                        : `${tier.bgColor} ${tier.borderColor} hover:border-brand/50`
                    }`}
                  >
                    {tierNum === 3 && (
                      <div className="absolute -top-4 -right-4 bg-brand text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transform rotate-12">
                        Most Popular
                      </div>
                    )}

                    <div className="mb-8">
                      <h3 className="text-2xl md:text-3xl font-black mb-4 text-gray-900 dark:text-white">{tier.name}</h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-5xl md:text-6xl font-black text-brand">{tier.commissionPercent}%</span>
                        <span className="text-lg text-gray-700 dark:text-zinc-400 font-bold">commission</span>
                      </div>
                      <p className="text-sm font-bold text-gray-600 dark:text-zinc-400">
                        ${tier.usdCommission.toFixed(2)} per active client/month
                      </p>
                    </div>

                    <div className="mb-8 pb-8 border-b border-gray-300 dark:border-white/10">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-zinc-400 mb-2">Requirements</p>
                      <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white">
                        {tier.minClients}–{tier.maxClients === Infinity ? '∞' : tier.maxClients} active clients
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Zap size={20} className="text-brand shrink-0 mt-1" />
                        <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">Recurring monthly payouts</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <TrendingUp size={20} className="text-brand shrink-0 mt-1" />
                        <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">Automatic tier upgrades</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award size={20} className="text-brand shrink-0 mt-1" />
                        <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">Dedicated support</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Key Highlight */}
            <motion.div
              {...fadeIn}
              className="bg-gradient-to-r from-brand/10 to-purple-500/10 dark:from-brand/10 dark:to-purple-500/5 border-2 border-brand/30 dark:border-brand/20 rounded-3xl p-10 md:p-12 text-center"
            >
              <p className="text-lg md:text-2xl font-black text-gray-900 dark:text-white mb-4">
                💰 <span className="text-brand">Lifetime Recurring Revenue</span>
              </p>
              <p className="text-base md:text-lg text-gray-700 dark:text-zinc-300 font-bold">
                Get paid every single month for as long as your referral customers stay with us. No expiration. No limits. Pure passive income.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Dashboard Preview */}
        <section className="w-full px-4 sm:px-6 md:px-8 py-20 md:py-28 relative overflow-hidden max-w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-0 right-0 w-[600px] h-[600px] max-w-full bg-brand/5 rounded-full blur-[120px] pointer-events-none" /></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div {...fadeIn} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase">
                Partner <span className="text-brand">Dashboard</span> <br />Preview
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 font-bold max-w-2xl mx-auto">
                See exactly what you'll get access to when you join our partner program.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Referral Link Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-6 md:p-8"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center">
                      <Copy size={20} className="text-brand" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Unique Referral Link</h3>
                  </div>
                  <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-3 mb-3 border border-gray-300 dark:border-white/5">
                    <code className="text-xs md:text-sm text-gray-700 dark:text-zinc-400 font-mono break-all">websbaca.cz?ref=yourname</code>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="w-full bg-brand/20 hover:bg-brand/30 border border-brand/30 text-brand font-bold py-2 rounded-lg transition text-sm"
                  >
                    Copy Link
                  </motion.button>
                </motion.div>

                {/* QR Code Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-6 md:p-8"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Download size={20} className="text-cyan-500" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">QR Code Generator</h3>
                  </div>
                  <div className="bg-white p-3 rounded-lg mb-3 flex items-center justify-center w-32 h-32 mx-auto border-2 border-gray-200 dark:border-white/10">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-gray-900">
                      <rect width="100" height="100" fill="white" />
                      <rect x="10" y="10" width="20" height="20" fill="black" />
                      <rect x="70" y="10" width="20" height="20" fill="black" />
                      <rect x="10" y="70" width="20" height="20" fill="black" />
                      <rect x="40" y="40" width="20" height="20" fill="black" />
                    </svg>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold py-2 rounded-lg transition text-sm"
                  >
                    Download High-Res QR
                  </motion.button>
                </motion.div>
              </div>

              {/* Right Column - Stats */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  className="grid md:grid-cols-2 gap-6"
                >
                  {/* Total Clicks */}
                  <div className="bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Total Clicks</span>
                      <TrendingUp size={20} className="text-blue-500" />
                    </div>
                    <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">1,247</p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">via referral link & QR</p>
                  </div>

                  {/* Active Clients */}
                  <div className="bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-green-600 dark:text-green-400">Active Clients</span>
                      <Users size={20} className="text-green-500" />
                    </div>
                    <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">35</p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">paying customers</p>
                  </div>

                  {/* Total Revenue */}
                  <div className="bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-200 dark:border-purple-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Total Generated</span>
                      <BarChart3 size={20} className="text-purple-500" />
                    </div>
                    <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">$5,250</p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">customer MRR</p>
                  </div>

                  {/* Your Payout */}
                  <div className="bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Your Payout</span>
                      <Award size={20} className="text-amber-500" />
                    </div>
                    <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">$787.50</p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 font-bold">monthly commission (15%)</p>
                  </div>
                </motion.div>

                {/* Progress Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-6 md:p-8"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Progress to Tier 2</h3>
                    <span className="text-sm font-black text-brand">70%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-3 overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '70%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                  <p className="text-xs font-bold text-gray-600 dark:text-zinc-400">35 of 50 clients to reach Tier 2 (15% commission)</p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Registration Form */}
        <section id="registration-form" className="w-full px-4 sm:px-6 md:px-8 py-20 md:py-28 bg-gray-50 dark:bg-[#050505] relative overflow-hidden max-w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] max-w-full bg-brand/5 rounded-full blur-[200px] pointer-events-none" /></div>

          <div className="max-w-3xl mx-auto relative z-10">
            <motion.div {...fadeIn} className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase">
                Join Our <span className="text-brand">Partner Program</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-zinc-400 font-bold">
                Fill out the form below and we'll get you started in minutes.
              </p>
            </motion.div>

            <div className="max-w-md mx-auto w-full">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              onSubmit={handleRegisterSubmit}
              className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-3xl p-8 md:p-12 space-y-6 w-full"
            >
              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-gray-700 dark:text-zinc-300 mb-3">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-black/20 border-2 border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:border-brand transition font-bold"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-gray-700 dark:text-zinc-300 mb-3">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-black/20 border-2 border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:border-brand transition font-bold"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-gray-700 dark:text-zinc-300 mb-3">
                  Social Media Links / Channel URL *
                </label>
                <input
                  type="text"
                  required
                  value={formData.socialLinks}
                  onChange={(e) => setFormData({ ...formData, socialLinks: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-black/20 border-2 border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:border-brand transition font-bold"
                  placeholder="https://instagram.com/yourhandle or your YouTube channel link"
                />
              </div>



              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl p-4 font-bold text-center"
                >
                  {formError}
                </motion.div>
              )}

              {formSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-xl p-4 font-bold text-center"
                >
                  ✓ Thank you! Registration successful. Please check your email to verify your account.
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-brand text-white py-4 md:py-5 rounded-xl font-black text-lg hover:bg-brand-dark transition-all duration-300 uppercase tracking-tighter shadow-2xl shadow-brand/30"
              >
                Continue to Stripe Payout Setup ➔
              </motion.button>

              <p className="text-xs text-gray-600 dark:text-zinc-400 text-center font-bold">
                By registering, you agree to our Partner Agreement and Terms of Service.
              </p>
            </motion.form>
            </div>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="w-full px-4 sm:px-6 md:px-8 py-20 md:py-28 relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeIn} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase">
                Why Partner <br />with <span className="text-brand">Webs Bača</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: 'Easiest Integration',
                  desc: 'Get your unique referral link immediately. No technical setup required. Start promoting in seconds.'
                },
                {
                  icon: TrendingUp,
                  title: 'Lifetime Commission',
                  desc: 'Earn every month for as long as your referrals stay customers. No expiration. Pure passive income.'
                },
                {
                  icon: Sparkles,
                  title: 'Dedicated Support',
                  desc: 'We provide marketing materials, QR codes, and personal support to help you succeed.'
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <div className="bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-8 h-full hover:border-brand transition-all duration-500">
                    <div className="w-14 h-14 rounded-xl bg-brand/20 flex items-center justify-center mb-6 group-hover:bg-brand group-hover:text-white transition-all duration-500">
                      <item.icon size={28} className="text-brand group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-black mb-4 text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-gray-600 dark:text-zinc-400 font-bold leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full px-4 sm:px-6 md:px-8 py-20 md:py-28 bg-gradient-to-r from-brand to-purple-600 relative overflow-hidden">
          <motion.div
            {...fadeIn}
            className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-12 uppercase">
              Ready to Start <br />Earning?
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-brand px-10 md:px-14 py-5 md:py-7 rounded-[2rem] font-black text-lg md:text-xl hover:bg-gray-100 transition-all duration-300 uppercase tracking-tighter shadow-2xl"
            >
              Register Now & Start Earning
            </motion.button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-full py-16 px-4 sm:px-6 md:px-8 bg-gray-50 dark:bg-[#020202] border-t border-gray-200 dark:border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-10 h-10 overflow-hidden rounded-lg border-2 border-brand bg-brand/10">
                  {!logoError ? (
                    <Image src="/Logo.png" alt="Webs Bača" fill sizes="40px" className="object-contain p-1" onError={() => setLogoError(true)} />
                  ) : (
                    <div className="w-full h-full bg-brand flex items-center justify-center"><span className="text-white font-black text-xs">W</span></div>
                  )}
                </div>
                <span className="font-black text-lg">WEBS BAČA</span>
              </div>
              <p className="text-gray-600 dark:text-zinc-500 font-bold">Premium digital partner program for influencers and content creators.</p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-white/5 text-center text-sm text-gray-600 dark:text-zinc-600 font-bold">
            <p>&copy; 2024 Webs Bača. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
