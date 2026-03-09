import React, { useState } from 'react';
import { 
  auth, 
  db 
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, User, Mail, Terminal, AlertCircle, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: username });
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          username: username,
          isAdmin: false, // Default to false
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
      <div className="matrix-bg opacity-30" />
      <div className="scanline pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#0A0A0A]/90 backdrop-blur-xl border border-[#00FF41]/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,255,65,0.1)] relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,65,0.2)]">
            <Shield className="w-8 h-8 text-[#00FF41]" />
          </div>
          <h1 className="font-mono text-xl font-bold text-[#00FF41] tracking-widest glitch-text">A.H.A ATS_AUTH</h1>
          <p className="font-mono text-[10px] text-[#00FF41]/40 mt-2">ESTABLISH SECURE NEURAL UPLINK</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="block font-mono text-[10px] text-[#00FF41]/60 uppercase ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF41]/40" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#050505] border border-[#00FF41]/30 rounded-lg py-3 pl-10 pr-4 font-mono text-sm text-[#00FF41] focus:outline-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] transition-all"
                    placeholder="OPERATOR_ID"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="block font-mono text-[10px] text-[#00FF41]/60 uppercase ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF41]/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050505] border border-[#00FF41]/30 rounded-lg py-3 pl-10 pr-4 font-mono text-sm text-[#00FF41] focus:outline-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] transition-all"
                placeholder="ACCESS_NODE@SECURE.NET"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-[10px] text-[#00FF41]/60 uppercase ml-1">Access Key</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF41]/40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#050505] border border-[#00FF41]/30 rounded-lg py-3 pl-10 pr-4 font-mono text-sm text-[#00FF41] focus:outline-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-500 text-[10px] font-mono"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00FF41] text-[#050505] font-mono font-bold py-3 rounded-lg hover:bg-[#00E5FF] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? 'INITIALIZE_UPLINK' : 'REGISTER_OPERATOR'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#00FF41]/10 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-mono text-[10px] text-[#00FF41]/40 hover:text-[#00FF41] transition-colors"
          >
            {isLogin ? "DON'T HAVE AN ACCESS NODE? REGISTER_HERE" : "ALREADY REGISTERED? INITIALIZE_LOGIN"}
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-4 opacity-20 grayscale hover:grayscale-0 transition-all">
          <Terminal className="w-4 h-4 text-[#00FF41]" />
          <Lock className="w-4 h-4 text-[#00FF41]" />
          <Shield className="w-4 h-4 text-[#00FF41]" />
        </div>
      </motion.div>
    </div>
  );
};
