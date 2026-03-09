import React, { useState, useEffect } from 'react';
import { 
  db 
} from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  Shield, 
  Trash2, 
  Edit3, 
  X, 
  Activity, 
  Cpu, 
  Terminal,
  Search,
  Check,
  AlertTriangle,
  MessageSquare,
  Eye,
  Save,
  UserPlus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserData {
  uid: string;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: any;
  lastLogin: any;
}

interface SessionData {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  messages: any[];
}

export const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'system' | 'logs'>('users');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [viewingSession, setViewingSession] = useState<SessionData | null>(null);

  useEffect(() => {
    // Users Listener
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserData));
      setUsers(usersData);
      setIsLoading(false);
    });

    // Sessions Listener
    const sessionsQuery = query(collection(db, "sessions"), orderBy("createdAt", "desc"));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SessionData));
      setSessions(sessionsData);
    });

    return () => {
      unsubUsers();
      unsubSessions();
    };
  }, []);

  const toggleAdmin = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        isAdmin: !currentStatus
      });
    } catch (err) {
      console.error("Error updating admin status:", err);
    }
  };

  const updateUser = async (uid: string, data: Partial<UserData>) => {
    try {
      await updateDoc(doc(db, "users", uid), data);
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const deleteUser = async (uid: string) => {
    if (window.confirm("TERMINATE OPERATOR? This will wipe all neural records.")) {
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch (err) {
        console.error("Error deleting user:", err);
      }
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (window.confirm("ERASE NEURAL SESSION? Data recovery impossible.")) {
      try {
        await deleteDoc(doc(db, "sessions", sessionId));
      } catch (err) {
        console.error("Error deleting session:", err);
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
    >
      <div className="matrix-bg opacity-20" />
      
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-6xl h-[85vh] bg-[#0A0A0A] border border-[#00FF41]/30 rounded-2xl shadow-[0_0_100px_rgba(0,255,65,0.15)] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#00FF41]/20 flex items-center justify-between bg-[#0A0A0A]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-[#00FF41]/10 border border-[#00FF41]/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#00FF41]" />
            </div>
            <div>
              <h2 className="font-mono text-lg font-bold text-[#00FF41] tracking-tighter">A.H.A ATS_COMMAND_CENTER</h2>
              <p className="font-mono text-[10px] text-[#00FF41]/40 uppercase">Root Access: Authorized</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-500/10 text-[#00FF41]/40 hover:text-red-500 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-[#00FF41]/10 p-4 space-y-2 hidden md:block">
            <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs transition-all",
                activeTab === 'users' ? "bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30" : "text-[#00FF41]/40 hover:bg-[#00FF41]/5"
              )}
            >
              <Users className="w-4 h-4" />
              OPERATOR_MANAGEMENT
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs transition-all",
                activeTab === 'sessions' ? "bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30" : "text-[#00FF41]/40 hover:bg-[#00FF41]/5"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              NEURAL_SESSIONS
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs transition-all",
                activeTab === 'system' ? "bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30" : "text-[#00FF41]/40 hover:bg-[#00FF41]/5"
              )}
            >
              <Cpu className="w-4 h-4" />
              CORE_SYSTEM_EDIT
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs transition-all",
                activeTab === 'logs' ? "bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30" : "text-[#00FF41]/40 hover:bg-[#00FF41]/5"
              )}
            >
              <Terminal className="w-4 h-4" />
              NEURAL_LOGS
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {activeTab === 'users' && (
              <>
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF41]/30" />
                    <input 
                      type="text"
                      placeholder="SEARCH_OPERATORS..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#050505] border border-[#00FF41]/20 rounded-lg py-2 pl-10 pr-4 font-mono text-xs text-[#00FF41] focus:outline-none focus:border-[#00FF41]/50"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#00FF41]/5 border border-[#00FF41]/20 rounded-lg font-mono text-[10px] text-[#00FF41]">
                    <Activity className="w-3 h-3" />
                    TOTAL_ACTIVE: {users.length}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-[#00FF41]/20 border-t-[#00FF41] rounded-full animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                      <AlertTriangle className="w-12 h-12 mb-2" />
                      <p className="font-mono text-xs">NO_OPERATORS_FOUND</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <motion.div 
                        layout
                        key={user.uid}
                        className="p-4 bg-[#050505] border border-[#00FF41]/10 rounded-xl flex items-center justify-between group hover:border-[#00FF41]/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm",
                            user.isAdmin ? "bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40" : "bg-white/5 text-white/40 border border-white/10"
                          )}>
                            {user.username?.[0]?.toUpperCase() || 'O'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-white/90">{user.username}</span>
                              {user.isAdmin && (
                                <span className="px-1.5 py-0.5 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded text-[8px] font-mono text-[#00FF41]">ADMIN</span>
                              )}
                            </div>
                            <p className="font-mono text-[10px] text-white/30">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2 bg-[#00FF41]/10 text-[#00FF41] hover:bg-[#00FF41]/20 rounded-lg transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleAdmin(user.uid, user.isAdmin)}
                            className={cn(
                              "p-2 rounded-lg transition-all flex items-center gap-2 font-mono text-[10px]",
                              user.isAdmin ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-[#00FF41]/10 text-[#00FF41] hover:bg-[#00FF41]/20"
                            )}
                          >
                            {user.isAdmin ? <Shield className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            {user.isAdmin ? 'REVOKE_ADMIN' : 'GRANT_ADMIN'}
                          </button>
                          <button 
                            onClick={() => deleteUser(user.uid)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'sessions' && (
              <>
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF41]/30" />
                    <input 
                      type="text"
                      placeholder="SEARCH_SESSIONS..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#050505] border border-[#00FF41]/20 rounded-lg py-2 pl-10 pr-4 font-mono text-xs text-[#00FF41] focus:outline-none focus:border-[#00FF41]/50"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#00FF41]/5 border border-[#00FF41]/20 rounded-lg font-mono text-[10px] text-[#00FF41]">
                    <Activity className="w-3 h-3" />
                    TOTAL_SESSIONS: {sessions.length}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {sessions.filter(s => s.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((session) => (
                    <motion.div 
                      layout
                      key={session.id}
                      className="p-4 bg-[#050505] border border-[#00FF41]/10 rounded-xl flex items-center justify-between group hover:border-[#00FF41]/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-[#00FF41]/5 border border-[#00FF41]/20 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-[#00FF41]/40" />
                        </div>
                        <div>
                          <div className="font-mono text-sm text-white/90">{session.title || 'Untitled Session'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[8px] text-white/20 uppercase">UID: {session.userId}</span>
                            <span className="font-mono text-[8px] text-white/20">•</span>
                            <span className="font-mono text-[8px] text-white/20 uppercase">{session.messages?.length || 0} MESSAGES</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingSession(session)}
                          className="p-2 bg-[#00FF41]/10 text-[#00FF41] hover:bg-[#00FF41]/20 rounded-lg transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteSession(session.id)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#050505] border border-[#00FF41]/20 rounded-xl">
                    <div className="flex items-center gap-2 text-[#00FF41]/40 font-mono text-[10px] mb-2">
                      <Cpu className="w-3 h-3" /> CORE_LOAD
                    </div>
                    <div className="text-2xl font-mono text-[#00FF41]">42.8%</div>
                  </div>
                  <div className="p-4 bg-[#050505] border border-[#00FF41]/20 rounded-xl">
                    <div className="flex items-center gap-2 text-[#00FF41]/40 font-mono text-[10px] mb-2">
                      <Activity className="w-3 h-3" /> NEURAL_TRAFFIC
                    </div>
                    <div className="text-2xl font-mono text-[#00FF41]">1.2k req/m</div>
                  </div>
                  <div className="p-4 bg-[#050505] border border-[#00FF41]/20 rounded-xl">
                    <div className="flex items-center gap-2 text-[#00FF41]/40 font-mono text-[10px] mb-2">
                      <Shield className="w-3 h-3" /> SECURITY_LEVEL
                    </div>
                    <div className="text-2xl font-mono text-[#00FF41]">MAXIMUM</div>
                  </div>
                </div>

                <div className="p-6 bg-[#050505] border border-[#00FF41]/20 rounded-xl space-y-4">
                  <h3 className="font-mono text-sm text-[#00FF41]">GLOBAL_SYSTEM_OVERRIDE</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <p className="font-mono text-xs text-white/90">MAINTENANCE_MODE</p>
                        <p className="font-mono text-[8px] text-white/30">Restrict all non-admin access</p>
                      </div>
                      <div className="w-10 h-5 bg-white/10 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white/20 rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <p className="font-mono text-xs text-white/90">DEBUG_LOGGING</p>
                        <p className="font-mono text-[8px] text-white/30">Enable verbose neural traces</p>
                      </div>
                      <div className="w-10 h-5 bg-[#00FF41]/20 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-[#00FF41] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="h-full bg-[#050505] rounded-xl p-4 border border-[#00FF41]/10 font-mono text-[10px] text-[#00FF41]/60 overflow-y-auto">
                <div className="space-y-1">
                  <p>[{new Date().toISOString()}] INITIALIZING_COMMAND_CENTER...</p>
                  <p>[{new Date().toISOString()}] FETCHING_OPERATOR_DATA...</p>
                  <p>[{new Date().toISOString()}] ENCRYPTING_UPLINK_CHANNELS...</p>
                  <p className="text-[#00FF41] animate-pulse">[{new Date().toISOString()}] SYSTEM_STABLE_READY_FOR_INPUT</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {editingUser && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-[#0A0A0A] border border-[#00FF41]/30 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm text-[#00FF41]">EDIT_OPERATOR_METADATA</h3>
                  <button onClick={() => setEditingUser(null)} className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] text-[#00FF41]/40 mb-1 uppercase">Username</label>
                    <input 
                      type="text"
                      defaultValue={editingUser.username}
                      id="edit-username"
                      className="w-full bg-[#050505] border border-[#00FF41]/20 rounded-lg py-2 px-4 font-mono text-xs text-[#00FF41] focus:outline-none focus:border-[#00FF41]/50"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-[#00FF41]/40 mb-1 uppercase">Email (Read-only)</label>
                    <input 
                      type="text"
                      value={editingUser.email}
                      disabled
                      className="w-full bg-[#050505]/50 border border-[#00FF41]/10 rounded-lg py-2 px-4 font-mono text-xs text-white/20 cursor-not-allowed"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const newUsername = (document.getElementById('edit-username') as HTMLInputElement).value;
                    updateUser(editingUser.uid, { username: newUsername });
                  }}
                  className="w-full py-3 bg-[#00FF41] text-black font-mono text-xs font-bold rounded-lg hover:bg-[#00FF41]/90 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  COMMIT_CHANGES
                </button>
              </div>
            </motion.div>
          )}

          {viewingSession && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <div className="w-full max-w-3xl h-[70vh] bg-[#0A0A0A] border border-[#00FF41]/30 rounded-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-[#00FF41]/20 flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-sm text-[#00FF41]">NEURAL_TRACE_VIEWER</h3>
                    <p className="font-mono text-[8px] text-white/30 uppercase">Session: {viewingSession.id}</p>
                  </div>
                  <button onClick={() => setViewingSession(null)} className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#050505]">
                  {viewingSession.messages?.map((msg, i) => (
                    <div key={i} className={cn(
                      "p-4 rounded-xl font-mono text-xs",
                      msg.role === 'user' ? "bg-[#00FF41]/5 border border-[#00FF41]/20 text-[#00FF41]" : "bg-white/5 border border-white/10 text-white/80"
                    )}>
                      <div className="text-[8px] opacity-40 mb-1 uppercase">{msg.role}</div>
                      {msg.text}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Stats */}
        <div className="p-4 bg-[#050505] border-t border-[#00FF41]/10 flex items-center justify-between px-8">
          <div className="flex gap-6">
            <div className="flex items-center gap-2 font-mono text-[9px] text-[#00FF41]/40">
              <Activity className="w-3 h-3" />
              LATENCY: 12ms
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] text-[#00FF41]/40">
              <Shield className="w-3 h-3" />
              FIREWALL: ACTIVE
            </div>
          </div>
          <div className="font-mono text-[9px] text-[#00FF41]/20">
            A.H.A ATS_OS_v4.2.0_STABLE
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
