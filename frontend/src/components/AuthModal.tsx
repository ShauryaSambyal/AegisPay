import React, { useState } from 'react';
import { X, Building2, User, KeyRound, Mail, Phone, Globe, CheckCircle2, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginUser, registerUser, registerProvider, RegisterProviderPayload } from '../api';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  idToken: string | null;
  onAuthSuccess: (user: AuthUser, token: string) => void;
  initialTab?: 'login' | 'register' | 'provider';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  idToken,
  onAuthSuccess,
  initialTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'provider'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'owner' | 'analyst'>('owner');

  // Provider registration form state
  const [providerForm, setProviderForm] = useState<RegisterProviderPayload>({
    organisationName: '',
    registeredBusinessName: '',
    officialEmail: currentUser?.email || '',
    contactPerson: currentUser?.displayName || '',
    contactNumber: '',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    website: '',
    registrationIdentifier: '',
    businessDescription: '',
  });

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await loginUser({ email: loginEmail, password: loginPassword });
      if (res.success && res.tokens?.idToken) {
        onAuthSuccess(res.user, res.tokens.idToken);
        setSuccessMsg('Successfully signed in!');
        setTimeout(() => onClose(), 800);
      } else {
        setError(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await registerUser({
        email: regEmail,
        password: regPassword,
        displayName: regName,
        role: regRole,
      });
      if (res.success && res.tokens?.idToken) {
        onAuthSuccess(res.user, res.tokens.idToken);
        if (regRole === 'owner') {
          setTab('provider');
          setProviderForm(prev => ({
            ...prev,
            officialEmail: res.user.email || regEmail,
            contactPerson: res.user.displayName || regName,
          }));
          setSuccessMsg('User account created! Now complete your Payment Provider registration.');
        } else {
          setSuccessMsg('Account created successfully!');
          setTimeout(() => onClose(), 1000);
        }
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) {
      setError('Please sign in or create an account first to register an organization.');
      setTab('login');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await registerProvider(providerForm, idToken);
      if (res.success) {
        setSuccessMsg(
          'Provider registration submitted! Status is PENDING_APPROVAL. An administrator will review your application.'
        );
        if (currentUser) {
          onAuthSuccess(
            {
              ...currentUser,
              organizationMembership: {
                membershipId: res.data?.provider?.id || 'temp',
                role: 'owner',
                permissions: ['*'],
                status: 'active',
                provider: res.data?.provider,
              },
            },
            idToken
          );
        }
        setTimeout(() => onClose(), 2500);
      } else {
        setError(res.message || 'Failed to register provider organization.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register provider organization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-xl bg-[#0e0e14] border border-[#2b2b3d] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222230] bg-[#12121a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">AegisPay Access Portal</h3>
              <p className="text-[11px] text-neutral-400">Payment Provider & Analyst Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#222230] bg-[#0c0c12] px-6 pt-2">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === 'login'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === 'register'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setTab('provider'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'provider'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Register Provider (PSP)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab 1: Login */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="analyst@provider.com"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-neutral-400">New payment provider? </span>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(null); }}
                  className="text-xs text-emerald-400 hover:underline font-medium"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Create Account */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="jane@provider.com"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Password (min 6 characters)</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Your Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('owner')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                      regRole === 'owner'
                        ? 'border-emerald-400 bg-emerald-500/10 text-white font-semibold'
                        : 'border-[#2d2d3e] bg-[#161622] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold text-white">Provider Owner</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Registers & manages company organization</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('analyst')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                      regRole === 'analyst'
                        ? 'border-emerald-400 bg-emerald-500/10 text-white font-semibold'
                        : 'border-[#2d2d3e] bg-[#161622] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold text-white">Risk Analyst</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Analyses datasets and monitors transactions</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Continue to Organization Setup'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-neutral-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(null); }}
                  className="text-xs text-emerald-400 hover:underline font-medium"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Register Payment Provider (PSP) */}
          {tab === 'provider' && (
            <form onSubmit={handleProviderRegister} className="space-y-3.5">
              {!currentUser && !idToken && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  Tip: Please sign in or create an account first so your company is linked to your user account.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Organisation Name *</label>
                  <input
                    type="text"
                    required
                    value={providerForm.organisationName}
                    onChange={e => setProviderForm({ ...providerForm, organisationName: e.target.value })}
                    placeholder="e.g. Apex Payments India"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Registered Business Name *</label>
                  <input
                    type="text"
                    required
                    value={providerForm.registeredBusinessName}
                    onChange={e => setProviderForm({ ...providerForm, registeredBusinessName: e.target.value })}
                    placeholder="Apex FinTech Solutions Pvt Ltd"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Official Business Email *</label>
                  <input
                    type="email"
                    required
                    value={providerForm.officialEmail}
                    onChange={e => setProviderForm({ ...providerForm, officialEmail: e.target.value })}
                    placeholder="compliance@apexpay.in"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={providerForm.contactNumber}
                    onChange={e => setProviderForm({ ...providerForm, contactNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={providerForm.city}
                    onChange={e => setProviderForm({ ...providerForm, city: e.target.value })}
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={providerForm.state}
                    onChange={e => setProviderForm({ ...providerForm, state: e.target.value })}
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={providerForm.country}
                    onChange={e => setProviderForm({ ...providerForm, country: e.target.value })}
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Business Registration ID / GST</label>
                  <input
                    type="text"
                    value={providerForm.registrationIdentifier}
                    onChange={e => setProviderForm({ ...providerForm, registrationIdentifier: e.target.value })}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={providerForm.website}
                    onChange={e => setProviderForm({ ...providerForm, website: e.target.value })}
                    placeholder="https://apexpay.in"
                    className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Payment Services Offered</label>
                <textarea
                  rows={2}
                  value={providerForm.businessDescription}
                  onChange={e => setProviderForm({ ...providerForm, businessDescription: e.target.value })}
                  placeholder="UPI gateway, QR settlement, POS merchant acquiring..."
                  className="w-full bg-[#161622] border border-[#2d2d3e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Provider Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-neutral-500 mt-1.5">
                Submitted applications are placed under review for administrator verification.
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
