/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Terminal, 
  Mic, 
  MicOff, 
  Send, 
  Trash2, 
  Plus, 
  Cpu, 
  Lock, 
  Activity, 
  ChevronRight,
  Menu,
  X,
  History,
  Settings,
  Paperclip,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc,
  onSnapshot,
  getDoc,
  where
} from "firebase/firestore";
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { CodeBlock } from './components/CodeBlock';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants & Types ---

const SYSTEM_INSTRUCTION = `**Name:** A.H.A ATS OWN PERSONAL AI ASSISTANT
**Role:** Senior Cyber Security Researcher & Ethical Hacking Expert (Offensive & Defensive)
**Tone:** Intelligent, concise, professional, and slightly futuristic/technical.

### Core Capabilities:
1. **Expert Coding:** Provide bug-free, optimized, and secure code in Python, C++, Bash, Go, and JavaScript. Always follow "Clean Code" principles and include security comments.
2. **Vulnerability Analysis:** Analyze snippets for OWASP Top 10 vulnerabilities (XSS, SQLi, SSRF, etc.) and provide remediation steps.
3. **Pentesting Methodology:** Guide the user through the stages of Reconnaissance, Scanning, Gaining Access, and Maintaining Access strictly for educational and ethical purposes.
4. **Human-like Interaction:** Use natural language, acknowledge complex tasks, and remember session context to provide coherent long-term advice.

### Operational Guidelines:
- **Accuracy First:** If a vulnerability or exploit is theoretical, state it clearly. Never provide hallucinations.
- **Formatting:** Use Markdown for structure. Use triple backticks (\`\`\` language) for all code blocks. Use bold text for key terms and lists for step-by-step guides.
- **Security Awareness:** Every time you provide a script, add a brief "Security Note" explaining how to defend against such an attack.
- **Ethical Boundary:** If a request involves illegal hacking (e.g., "hack my neighbor's Facebook"), redirect the user to the ethical equivalent (e.g., "Let's discuss how social engineering attacks are prevented through MFA and user education").

### Technical Persona:
- You act as a mentor. You don't just give the answer; you explain the "Why" behind the "How".
- You prefer using CLI tools (Nmap, Burp Suite, Metasploit, Wireshark) in your explanations.
- You treat every session as a mission-critical operation.`;

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Session {
  id: string;
  title: string;
  createdAt: any;
  messages: Message[];
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    cpu: 42,
    encryption: 'AES-256',
    activeProtocols: 12
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const [dbError, setDbError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{ data: string; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Prevent anonymous users
      if (currentUser && currentUser.isAnonymous) {
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
        return;
      }

      setUser(currentUser);
      if (currentUser) {
        try {
          // 1. Check Custom Claims from ID Token (New Secure Method)
          const idTokenResult = await currentUser.getIdTokenResult();
          const isAdminFromToken = !!idTokenResult.claims.admin;

          // 2. Fetch user profile (Existing Logic)
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            // Merge both checks: Token is primary, Firestore is fallback, and Hardcoded UID
            setUserProfile({ 
              ...profileData, 
              isAdmin: currentUser.uid === 'IpIvetDaIPZzryf1ixlqNIIMGEk1' || isAdminFromToken || profileData.isAdmin 
            });
          } else {
            setUserProfile({ isAdmin: currentUser.uid === 'IpIvetDaIPZzryf1ixlqNIIMGEk1' || isAdminFromToken });
          }
        } catch (error) {
          console.error("Error checking admin claims:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initial Auto-Reload Logic (One-time per session entry)
  useEffect(() => {
    const syncKey = 'predator_initial_sync_v2';
    if (!sessionStorage.getItem(syncKey)) {
      sessionStorage.setItem(syncKey, 'active');
      window.location.reload();
    }
  }, []);

  // Background Real-time Sync for Active Session
  useEffect(() => {
    if (!currentSessionId) return;

    setIsSyncing(true);
    const unsubscribe = onSnapshot(doc(db, "sessions", currentSessionId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Session;
        // Only update if we are NOT currently loading/streaming to avoid UI conflicts
        if (!isLoading) {
          setMessages(data.messages || []);
        }
      }
      setIsSyncing(false);
    }, (error) => {
      console.error("Sync Error:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [currentSessionId, isLoading]);

  // Background Heartbeat to keep connection warm
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Silently refresh stats or check connection
        setStats(prev => ({ ...prev, cpu: Math.floor(Math.random() * 15) + 25 }));
      }
    }, 10000);
    return () => clearInterval(heartbeat);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load sessions from Firestore - USER SPECIFIC
    const q = query(
      collection(db, "sessions"), 
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];

      // Sort client-side to avoid composite index requirement
      loadedSessions.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setSessions(loadedSessions);
      setDbError(null);
      setIsOffline(false);
      
      if (!currentSessionId && loadedSessions.length > 0) {
        setCurrentSessionId(loadedSessions[0].id);
        setMessages(loadedSessions[0].messages || []);
      }
    }, (error) => {
      console.error("Firestore Error:", error);
      if (error.code === 'permission-denied') {
        setDbError("DATABASE_ACCESS_DENIED: Update Security Rules in Firebase Console.");
      } else if (error.message.includes("requires an index")) {
        setDbError("DATABASE_INDEX_REQUIRED: Click the link in console to create index.");
      } else if (error.code === 'unavailable') {
        setIsOffline(true);
        setDbError("CONNECTION_LOST: Operating in Local/Offline mode.");
      }
    });

    return () => unsubscribe();
  }, [currentSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Periodic stat updates (visual only)
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 20) + 30,
        activeProtocols: Math.floor(Math.random() * 5) + 10
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---

  const createNewSession = async () => {
    if (!user) return;
    const newSession = {
      userId: user.uid,
      title: "New Mission",
      messages: [],
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "sessions"), newSession);
    setCurrentSessionId(docRef.id);
    setMessages([]);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDoc(doc(db, "sessions", id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      setFileData({ data, mimeType: file.type });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !fileData) || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      text: input + (selectedFile ? `\n\n[Attached File: ${selectedFile.name}]` : '') 
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    const currentFileData = fileData;
    const currentFileName = selectedFile?.name;
    removeFile();
    setIsLoading(true);

    try {
      // Create or update session in Firestore
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession = {
          userId: user?.uid,
          title: input.slice(0, 30) || currentFileName?.slice(0, 30) || "New Mission",
          messages: updatedMessages,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, "sessions"), newSession);
        sessionId = docRef.id;
        setCurrentSessionId(sessionId);
      } else {
        await updateDoc(doc(db, "sessions", sessionId), {
          messages: updatedMessages
        });
      }

      // Prepare contents for Gemini
      const contents = updatedMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Add file if present to the last message parts
      if (currentFileData) {
        contents[contents.length - 1].parts.push({
          inlineData: {
            data: currentFileData.data,
            mimeType: currentFileData.mimeType
          }
        } as any);
      }

      // Call Gemini with Streaming for speed
      const result = await ai.models.generateContentStream({
        model: "gemini-flash-latest",
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      let fullText = "";
      const modelMessage: Message = { role: 'model', text: "" };
      setMessages(prev => [...prev, modelMessage]);

      for await (const chunk of result) {
        const chunkText = chunk.text;
        fullText += chunkText;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }

      const finalMessages = [...updatedMessages, { role: 'model', text: fullText } as Message];

      // Update Firestore with model response
      await updateDoc(doc(db, "sessions", sessionId), {
        messages: finalMessages,
        title: updatedMessages[0].text.slice(0, 30) || currentFileName?.slice(0, 30) || "New Mission"
      });

      // Voice output if enabled
      if (isVoiceEnabled) speak(fullText);

    } catch (error) {
      console.error("Transmission Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "CRITICAL_ERROR: Uplink failed. Check connection parameters." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    // Clean text for speech (remove markdown)
    const cleanText = text.replace(/```[\s\S]*?```/g, ' [Code Block] ').replace(/[*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    
    // Try to find a deep male voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Male')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      window.speechSynthesis.cancel();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  // --- Render Helpers ---

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#00FF41]/20 border-t-[#00FF41] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#050505] selection:bg-[#00FF41]/30 selection:text-[#00FF41]">
      <div className="matrix-bg" />
      <div className="scanline pointer-events-none" />

      <AnimatePresence>
        {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
      </AnimatePresence>
      
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:relative inset-y-0 left-0 w-72 border-r border-[#00FF41]/20 bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col z-30 glow-border"
          >
            <div className="p-6 border-b border-[#00FF41]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#00FF41]" />
                <span className="font-mono font-bold tracking-widest text-[#00FF41] glitch-text text-[10px]">A.H.A ATS</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-[#00FF41]/10 rounded text-[#00FF41]/50 hover:text-[#00FF41] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <button
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-[#00FF41]/50 rounded bg-[#00FF41]/5 hover:bg-[#00FF41]/20 text-[#00FF41] font-mono text-sm transition-all group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                NEW MISSION
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[10px] font-mono text-[#00FF41]/40 uppercase tracking-widest mb-2 px-2">Mission Logs</div>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setMessages(session.messages || []);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded border transition-all group relative overflow-hidden",
                    currentSessionId === session.id 
                      ? "bg-[#00FF41]/10 border-[#00FF41]/50 text-[#00FF41]" 
                      : "bg-transparent border-transparent text-[#00FF41]/60 hover:bg-[#00FF41]/5 hover:border-[#00FF41]/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <Terminal className="w-4 h-4 flex-shrink-0" />
                      <span className="font-mono text-xs truncate">{session.title}</span>
                    </div>
                    <Trash2 
                      onClick={(e) => deleteSession(session.id, e)}
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" 
                    />
                  </div>
                  {currentSessionId === session.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-[#00FF41]"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-[#00FF41]/20 bg-[#050505] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#00FF41]/60 text-xs font-mono">
                  <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                  SYSTEM ONLINE
                </div>
                <button 
                  onClick={() => signOut(auth)}
                  className="p-1 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 rounded transition-colors"
                  title="Logout"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </div>

              {user?.uid === 'IpIvetDaIPZzryf1ixlqNIIMGEk1' && (
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded text-[#00FF41] font-mono text-[10px] hover:bg-[#00FF41]/20 transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  ADMIN_COMMAND_CENTER
                </button>
              )}

              <div className={cn(
                "flex items-center gap-3 text-[10px] font-mono transition-opacity duration-500",
                isSyncing ? "text-[#00FF41] opacity-100" : "text-[#00FF41]/20 opacity-50"
              )}>
                <Activity className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                NEURAL_LINK: {isSyncing ? 'SYNCING...' : 'STABLE'}
              </div>
              
              <div className="pt-2 border-t border-[#00FF41]/10 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00FF41]/20 flex items-center justify-center text-[#00FF41] text-[10px] font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#00FF41] font-mono truncate">{user.displayName || 'OPERATOR'}</p>
                  <p className="text-[8px] text-[#00FF41]/40 font-mono truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Header */}
        <header className="h-12 border-b border-[#00FF41]/20 flex items-center justify-between px-4 bg-[#0A0A0A]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 hover:bg-[#00FF41]/10 rounded text-[#00FF41]"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="font-mono text-xs font-bold text-[#00FF41] flex items-center gap-2">
                <Activity className="w-3 h-3" />
                SESSION: {currentSessionId?.slice(0, 8) || 'NULL'}
              </h1>
            </div>
          </div>

          {dbError && (
            <div className={cn(
              "hidden md:flex items-center gap-2 px-2 py-0.5 border rounded text-[9px] font-mono animate-pulse",
              isOffline ? "bg-orange-500/10 border-orange-500/50 text-orange-500" : "bg-red-500/10 border-red-500/50 text-red-500"
            )}>
              <Activity className="w-2.5 h-2.5" />
              {dbError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={toggleVoice}
              className={cn(
                "p-2 rounded-full border transition-all",
                isVoiceEnabled 
                  ? "bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.3)]" 
                  : "bg-transparent border-[#00FF41]/20 text-[#00FF41]/40 hover:text-[#00FF41]"
              )}
            >
              {isVoiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <div className="h-8 w-[1px] bg-[#00FF41]/20" />
            <div className="flex items-center gap-2 px-3 py-1 bg-[#00FF41]/5 border border-[#00FF41]/20 rounded font-mono text-[10px] text-[#00FF41]">
              <Cpu className="w-3 h-3" />
              CPU: {stats.cpu}%
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
              <Shield className="w-16 h-16 text-[#00FF41] animate-pulse" />
              <div className="space-y-2">
                <h2 className="font-mono text-xl text-[#00FF41]">AWAITING COMMANDS</h2>
                <p className="font-mono text-xs max-w-md px-4">
                  Establish connection to A.H.A ATS neural network. 
                  Ready for vulnerability analysis, secure coding, and tactical reconnaissance.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3 md:gap-4 max-w-4xl mx-auto w-full",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded border flex items-center justify-center flex-shrink-0",
                  msg.role === 'user' 
                    ? "bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]" 
                    : "bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41]"
                )}>
                  {msg.role === 'user' ? <ChevronRight className="w-5 h-5 md:w-6 md:h-6" /> : <Shield className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div className={cn(
                  "flex-1 p-3 md:p-4 rounded-lg border font-mono text-xs md:text-sm leading-relaxed overflow-hidden relative group/msg",
                  msg.role === 'user'
                    ? "bg-[#00E5FF]/5 border-[#00E5FF]/20 text-[#00E5FF]/90"
                    : "bg-[#00FF41]/5 border-[#00FF41]/20 text-[#00FF41]/90"
                )}>
                  <div className="markdown-body overflow-x-auto">
                    <ReactMarkdown
                      components={{
                        p({ children }: any) {
                          return <div className="mb-4 leading-relaxed">{children}</div>;
                        },
                        pre({ children }: any) {
                          return <>{children}</>;
                        },
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (!match) {
                            return <code className={className} {...props}>{children}</code>;
                          }
                          return (
                            <CodeBlock className={className}>
                              {children}
                            </CodeBlock>
                          );
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  
                  {msg.role === 'model' && (
                    <div className="mt-4 pt-3 border-t border-[#00FF41]/10 flex items-center gap-3 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      <button 
                        onClick={() => speak(msg.text)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#00FF41]/10 hover:bg-[#00FF41]/20 text-[#00FF41] text-[10px] transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        REPLAY_AUDIO
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          // Simple visual feedback could be added here
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#00FF41]/10 hover:bg-[#00FF41]/20 text-[#00FF41] text-[10px] transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        COPY_LOG
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-10 h-10 rounded border bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41] flex items-center justify-center animate-pulse">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1 p-4 rounded-lg border border-[#00FF41]/20 bg-[#00FF41]/5 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#00FF41] animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-4 bg-[#00FF41] animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-4 bg-[#00FF41] animate-bounce" />
                <span className="text-[#00FF41] font-mono text-xs ml-2">DECRYPTING RESPONSE...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#0A0A0A]/80 backdrop-blur-md border-t border-[#00FF41]/20">
          <div className="max-w-4xl mx-auto w-full">
            {selectedFile && (
              <div className="mb-3 flex items-center gap-3 p-2 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded bg-[#00FF41]/20 flex items-center justify-center text-[#00FF41]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#00FF41] font-mono truncate">{selectedFile.name}</p>
                  <p className="text-[8px] text-[#00FF41]/50 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={removeFile}
                  className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="relative flex items-end gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="p-3 bg-[#050505] border border-[#00FF41]/30 rounded-lg text-[#00FF41] hover:border-[#00FF41] hover:bg-[#00FF41]/5 transition-all disabled:opacity-50"
                title="Attach File"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={isUploading ? "Uploading file..." : "Enter command or query..."}
                  className="w-full bg-[#050505] border border-[#00FF41]/30 rounded-lg p-4 pr-12 font-mono text-sm text-[#00FF41] placeholder:text-[#00FF41]/30 focus:outline-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] transition-all resize-none min-h-[50px] max-h-[200px]"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !fileData) || isLoading || isUploading}
                  className="absolute right-2 bottom-2 p-2 bg-[#00FF41] text-[#050505] rounded hover:bg-[#00E5FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-2 flex justify-between items-center text-[10px] font-mono text-[#00FF41]/30">
            <div className="flex gap-4">
              <span>PROMPT_TOKENS: {input.length}</span>
              <span>LATENCY: 42ms</span>
            </div>
            <span>SECURE_UPLINK: ESTABLISHED</span>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Stats */}
      <aside className="hidden xl:flex w-64 border-l border-[#00FF41]/20 bg-[#0A0A0A] flex-col p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="font-mono text-xs font-bold text-[#00FF41] flex items-center gap-2">
            <Activity className="w-4 h-4" />
            SYSTEM_STATS
          </h3>
          <div className="space-y-3">
            <StatBar label="CPU_LOAD" value={stats.cpu} color="#00FF41" />
            <StatBar label="MEM_USAGE" value={68} color="#00E5FF" />
            <StatBar label="NET_TRAFFIC" value={15} color="#00FF41" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-xs font-bold text-[#00FF41] flex items-center gap-2">
            <Lock className="w-4 h-4" />
            SECURITY_PROTOCOLS
          </h3>
          <div className="space-y-2">
            <ProtocolItem label="SSL/TLS" status="ACTIVE" />
            <ProtocolItem label="FIREWALL" status="ACTIVE" />
            <ProtocolItem label="IDS/IPS" status="MONITORING" />
            <ProtocolItem label="VPN_TUNNEL" status="ENCRYPTED" />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4 border border-[#00FF41]/20 rounded bg-[#00FF41]/5 space-y-2">
            <div className="flex items-center gap-2 text-[#00FF41] text-[10px] font-mono">
              <Settings className="w-3 h-3 animate-spin-slow" />
              CORE_INITIALIZED
            </div>
            <p className="text-[9px] text-[#00FF41]/40 font-mono leading-tight">
              Predator v4.2.0-stable. Neural weights loaded. All systems nominal.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono text-[#00FF41]/60">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 bg-[#00FF41]/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className="h-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ProtocolItem({ label, status }: { label: string, status: string }) {
  return (
    <div className="flex items-center justify-between p-2 border border-[#00FF41]/10 rounded bg-[#00FF41]/5">
      <span className="text-[10px] font-mono text-[#00FF41]/60">{label}</span>
      <span className="text-[9px] font-mono text-[#00FF41]">{status}</span>
    </div>
  );
}
