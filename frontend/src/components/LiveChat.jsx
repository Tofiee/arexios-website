import React, { useState, useEffect, useContext, useRef, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import { Send, X, Minimize2, Server, AlertTriangle, Shield, User, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const BOT_NAMES = ['CSGO.ARXCS.COM', 'TS3.ARXCS.COM', 'IP: CSGO.ARXCS.COM'];

const getStoredMessages = () => {
  try {
    const stored = localStorage.getItem('livechat_messages');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const getStoredSessionId = () => {
  return localStorage.getItem('livechat_session_id');
};

const LiveChat = forwardRef(({ initialMessage = '' }, ref) => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState(getStoredSessionId);
  const [messages, setMessages] = useState(getStoredMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminTypingName, setAdminTypingName] = useState('');
  const [sessionClosed, setSessionClosed] = useState(false);
  const [adminStatusInfo, setAdminStatusInfo] = useState({ online_count: 0, busy_count: 0, away_count: 0, total_count: 0, any_admin_online: false, estimated_response_time: null });

  useEffect(() => {
    console.log('[DEBUG] adminStatusInfo changed:', adminStatusInfo);
  }, [adminStatusInfo]);
  const [showMenu, setShowMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const sessionIdRef = useRef(getStoredSessionId());

  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintStep, setComplaintStep] = useState(1);
  const [complaintType, setComplaintType] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [complaintMessage, setComplaintMessage] = useState('');
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [fetchingPlayers, setFetchingPlayers] = useState(false);
  const [selectedCheatType, setSelectedCheatType] = useState(null);

  const CHEAT_TYPES = [
    { id: 'aimbot', label: 'Aimbot', icon: '🎯', desc: 'Otomatik hedef alma' },
    { id: 'wallhack', label: 'Wallhack', icon: '👁️', desc: 'Duvarlardan görme' },
    { id: 'spinbot', label: 'Spinbot', icon: '🌀', desc: 'Dönen hitbox' },
    { id: 'speedhack', label: 'Speedhack', icon: '⚡', desc: 'Hız hilesi' },
    { id: 'bhop', label: 'Bunny Hop', icon: '🐰', desc: 'Otomatik zıplama' },
    { id: 'triggerbot', label: 'Triggerbot', icon: '🔫', desc: 'Otomatik ateş' },
    { id: 'no_flash', label: 'No Flash', icon: '💡', desc: 'Flash etkilenmeme' },
    { id: 'teleport', label: 'Teleport', icon: '🌀', desc: 'Işınlanma' },
    { id: 'other', label: 'Diğer', icon: '❓', desc: 'Diğer hileler' },
  ];

  useImperativeHandle(ref, () => ({
    open: (message = '') => {
      setIsOpen(true);
      if (message) {
        setInputMessage(message);
      }
    },
    close: () => setIsOpen(false),
    sendSkinPurchase: (skinInfo) => {
      setIsOpen(true);
      const message = `🎮 SKIN SATIN ALMA TALEBİ\n\n📦 Skin: ${skinInfo.skinName}\n💰 Fiyat: ${skinInfo.price} TL\n👤 Oyuncu: ${skinInfo.playerNick || 'Belirtilmedi'}\n💬 Discord: ${skinInfo.discordId || 'Belirtilmedi'}\n📝 Not: ${skinInfo.optionalNote || 'Yok'}`;
      
      sendMessage(message);
    }
  }));

  useEffect(() => {
    if (!socketRef.current) {
      connectSocket();
    }
    
    const statusInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('request_admin_status');
      }
    }, 30000);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialMessage && isOpen) {
      setInputMessage(initialMessage);
    }
  }, [initialMessage, isOpen]);

  useEffect(() => {
    localStorage.setItem('livechat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('livechat_session_id', sessionId);
    }
  }, [sessionId]);

  const getPageName = (path) => {
    const pageNames = {
      '/': 'Ana Sayfa',
      '/servers': 'Sunucular',
      '/bans': 'Ban Listesi',
      '/admins': 'Adminler',
      '/about': 'Hakkımızda',
      '/contact': 'İletişim',
      '/profile': 'Profil',
      '/support': 'Destek',
    };
    return pageNames[path] || path;
  };

  useEffect(() => {
    if (isOpen && sessionIdRef.current && socketRef.current?.connected) {
      const sendLocation = () => {
        socketRef.current?.emit('user_location', {
          session_id: sessionIdRef.current,
          page_url: window.location.pathname,
          page_name: getPageName(window.location.pathname)
        });
      };
      
      sendLocation();
      
      let lastPath = window.location.pathname;
      const interval = setInterval(() => {
        if (window.location.pathname !== lastPath) {
          lastPath = window.location.pathname;
          sendLocation();
        }
      }, 1000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isOpen, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputMessage(text);
    
    if (socketRef.current?.connected && sessionIdRef.current) {
      socketRef.current.emit('user_typing', {
        session_id: sessionIdRef.current,
        is_typing: true,
        typing_text: text
      });
      
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socketRef.current?.emit('user_typing', {
          session_id: sessionIdRef.current,
          is_typing: false,
          typing_text: ''
        });
      }, 2000);
    }
  };

  const connectSocket = async () => {
    setIsConnecting(true);
    
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on('connect', async () => {
      console.log('[SOCKET] Connected, ID:', socket.id);
      setIsConnecting(false);
      
      let currentSessionId = sessionIdRef.current;
      
      if (!currentSessionId) {
        try {
          const res = await api.post('/support/session', {
            user_name: user?.username || 'Misafir',
            user_email: user?.email || ''
          });
          currentSessionId = res.data.id;
          sessionIdRef.current = currentSessionId;
          setSessionId(currentSessionId);
        } catch (err) {
          console.error('Failed to create session:', err);
        }
      } else {
        try {
          const res = await api.get(`/support/session/${currentSessionId}/messages`);
          if (res.data && res.data.length > 0) {
            setMessages(res.data);
          }
        } catch (err) {
          console.log('No previous messages found');
        }
      }
      
      socket.emit('user_join', {
        user_id: user?.id || null,
        user_name: user?.username || 'Misafir',
        user_email: user?.email || '',
        session_id: currentSessionId
      });
      socket.emit('request_admin_status');
      console.log('user_join emitted, session:', currentSessionId);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('[SOCKET] Connection error:', error);
    });

    socketRef.current.on('new_message', (data) => {
      setMessages(prev => [...prev, data]);
      setAdminTyping(false);
      
      if (data.sender_type === 'admin') {
        setWaitingForAdmin(false);
        setAssignedAdmin(data.sender_name);
      }
    });

    socketRef.current.on('admin_typing', (data) => {
      if (data.session_id === sessionIdRef.current) {
        setAdminTyping(data.is_typing);
        setAdminTypingName(data.admin_name || 'Admin');
      }
    });

    socketRef.current.on('session_taken', (data) => {
      setAssignedAdmin(data.admin_name);
      setWaitingForAdmin(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender_type: 'system',
        sender_name: 'Sistem',
        message: `${data.admin_name} konuşmanızı devraldı.`,
        created_at: new Date().toISOString()
      }]);
    });

    socketRef.current.on('session_closed', (data) => {
      setSessionClosed(true);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender_type: 'system',
        sender_name: 'Sistem',
        message: data?.reason === 'already_closed' 
          ? 'Bu oturum kapatıldı. Yeni bir destek talebi başlatabilirsiniz.'
          : 'Destek oturumu sonlandırıldı.',
        created_at: new Date().toISOString()
      }]);
    });

    socketRef.current.on('admin_online', () => setAdminOnline(true));
    socketRef.current.on('admin_offline', () => setAdminOnline(false));
    socketRef.current.on('admin_list', (data) => setAdminOnline(data.admins?.length > 0));

    socketRef.current.on('admin_status_info', (data) => {
      console.log('admin_status_info received:', data);
      setAdminStatusInfo(data);
    });
    
    socketRef.current.on('admin_status_change', () => {
      socketRef.current.emit('request_admin_status');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  };

  const sendMessage = async (directMessage = null) => {
    if (sessionClosed) return;
    
    const message = directMessage || inputMessage.trim();
    if (!message) return;

    if (!directMessage) setInputMessage('');

    let currentSessionId = sessionIdRef.current;

    if (!currentSessionId) {
      try {
        const res = await api.post('/support/session', {
          user_name: user?.username || 'Misafir',
          user_email: user?.email || ''
        });
        currentSessionId = res.data.id;
        sessionIdRef.current = currentSessionId;
        setSessionId(currentSessionId);
      } catch (err) {
        console.error('Failed to create session:', err);
        return;
      }
    }

    if (!socketRef.current?.connected) {
      console.error('Socket not connected!');
      return;
    }

    socketRef.current.emit('send_message', {
      session_id: currentSessionId,
      message: message,
      sender_type: 'user',
      sender_name: user?.username || 'Misafir'
    });

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender_type: 'user',
      sender_name: user?.username || 'Misafir',
      message: message,
      created_at: new Date().toISOString()
    }]);

    setWaitingForAdmin(true);
  };

  const fetchPlayers = async () => {
    setFetchingPlayers(true);
    try {
      const res = await api.get('/gametracker/players');
      if (res.data.status === 'success' && res.data.players.length > 0) {
        const filteredPlayers = res.data.players.filter(
          p => !BOT_NAMES.some(bot => p.name.toLowerCase().includes(bot.toLowerCase()))
        );
        setPlayers(filteredPlayers);
      } else {
        setPlayers([]);
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
      setPlayers([]);
    } finally {
      setFetchingPlayers(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admins/list');
      setAdmins(res.data);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  };

  const openComplaintForm = (type) => {
    setComplaintType(type);
    setComplaintStep(1);
    setShowComplaintForm(true);
    
    if (type === 'cheater') {
      fetchPlayers();
    } else if (type === 'admin') {
      fetchAdmins();
    }
  };

  const handleComplaintStep = (step) => {
    setComplaintStep(step);
    if (complaintType === 'cheater' && step === 2) {
    } else if (complaintType === 'server' && step >= 2) {
      setComplaintStep(2);
    }
  };

  const submitComplaint = async () => {
    const typeLabels = {
      'server': 'Sunucu Şikayeti',
      'cheater': 'Hile Şikayeti',
      'admin': 'Admin Şikayeti'
    };

    let fullMessage = `📋 YENİ ŞİKAYET\n`;
    fullMessage += `🔖 Tür: ${typeLabels[complaintType]}\n`;
    
    if (complaintType === 'cheater' && selectedPlayer) {
      fullMessage += `🎯 Hedef: ${selectedPlayer.name}\n`;
      if (selectedCheatType) {
        const cheatLabel = CHEAT_TYPES.find(c => c.id === selectedCheatType);
        fullMessage += `🎮 Hile: ${cheatLabel?.icon} ${cheatLabel?.label}\n`;
      }
      if (selectedPlayer.steam_id) {
        fullMessage += `💠 Steam: ${selectedPlayer.steam_id}\n`;
      }
    }
    
    if (complaintType === 'admin' && selectedAdmin) {
      fullMessage += `🎯 Admin: ${selectedAdmin.name}\n`;
    }
    
    if (complaintMessage.trim()) {
      fullMessage += `\n📝 ${complaintMessage}`;
    }

    try {
      await api.post('/complaints/', {
        user_id: user?.id || 0,
        username: user?.username || 'Misafir',
        complaint_type: complaintType,
        target_name: selectedPlayer?.name || selectedAdmin?.name || null,
        target_steam_id: selectedPlayer?.steam_id || selectedAdmin?.steam_id || null,
        cheat_type: selectedCheatType || null,
        message: complaintMessage,
        status: 'pending'
      });
    } catch (err) {
      console.error('Failed to save complaint:', err);
    }

    setShowComplaintForm(false);
    setComplaintStep(1);
    setComplaintType(null);
    setSelectedPlayer(null);
    setSelectedAdmin(null);
    setSelectedCheatType(null);
    setComplaintMessage('');

    sendMessage(fullMessage);
  };

  const startNewSession = () => {
    localStorage.removeItem('livechat_session_id');
    localStorage.removeItem('livechat_messages');
    setSessionId(null);
    sessionIdRef.current = null;
    setMessages([]);
    setInputMessage('');
    setSessionClosed(false);
    setAssignedAdmin(null);
    setWaitingForAdmin(false);
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setTimeout(() => {
      connectSocket();
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleDownloadTranscript = () => {
    const transcript = messages.map(msg => {
      const time = new Date(msg.created_at).toLocaleString('tr-TR');
      const sender = msg.sender_type === 'admin' ? 'Yetkili' : msg.sender_type === 'system' ? 'Sistem' : 'Siz';
      return `[${time}] ${sender}: ${msg.message}`;
    }).join('\n\n');

    const header = `=== Arexios Canlı Destek Transkript ===\nTarih: ${new Date().toLocaleString('tr-TR')}\nSession ID: ${sessionId || 'N/A'}\n========================================\n\n`;
    const fullTranscript = header + transcript;

    const blob = new Blob([fullTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destek-transkript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendTranscript = () => {
    const transcript = messages.map(msg => {
      const time = new Date(msg.created_at).toLocaleString('tr-TR');
      const sender = msg.sender_type === 'admin' ? 'Yetkili' : msg.sender_type === 'system' ? 'Sistem' : 'Siz';
      return `[${time}] ${sender}: ${msg.message}`;
    }).join('\n\n');

    const emailBody = encodeURIComponent(`
Arexios Canlı Destek Transkripti

Tarih: ${new Date().toLocaleString('tr-TR')}
Session ID: ${sessionId || 'N/A'}

${transcript}
    `.trim());

    window.open(`mailto:?subject=Arexios Destek Transkripti&body=${emailBody}`);
  };

  const handleEndConversation = () => {
    if (socketRef.current?.connected && sessionIdRef.current) {
      socketRef.current.emit('close_session', {
        session_id: sessionIdRef.current,
        reason: 'user_closed'
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-16 h-16 bg-orange-600 hover:bg-orange-500 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {adminStatusInfo.total_count > 0 && (
            <span className={`absolute top-px right-px rounded-full w-4 h-4 border-2 border-white shadow-md transition-all duration-300 ${
              adminStatusInfo.online_count > 0 ? 'bg-emerald-500' :
              adminStatusInfo.busy_count > 0 ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
          )}
        </button>
      )}

      {isOpen && !isMinimized && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-[#151822] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200 dark:border-slate-700">
          <div className="bg-orange-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div>
                <h3 className="font-bold text-lg">Canlı Destek</h3>
                <p className="text-xs text-orange-100">
                  {isConnecting ? 'Bağlanıyor...' : 
                    adminStatusInfo.any_admin_online ? 
                      `${adminStatusInfo.total_count} yetkili çevrimiçi` : 
                      'Çevrimdışı'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-orange-500 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#151822] rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleDownloadTranscript();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Konuşmayı İndir
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleSendTranscript();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Mail Olarak Gönder
                      </button>
                      <button
                        onClick={() => {
                          setSoundEnabled(!soundEnabled);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        {soundEnabled ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        )}
                        Ses {soundEnabled ? 'Açık' : 'Kapalı'}
                      </button>
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                      {!sessionClosed && sessionId && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleEndConversation();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Konuşmayı Sonlandır
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-orange-500 rounded-lg transition-colors"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={toggleChat}
                className="p-2 hover:bg-orange-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0a0c10]">
            {isConnecting ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-[#151822] rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Hoş Geldiniz!</h4>
                  {adminStatusInfo.any_admin_online ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {adminStatusInfo.online_count > 0 ? (
                          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span>{adminStatusInfo.total_count} yetkili çevrimiçi</span>
                          </span>
                        ) : adminStatusInfo.busy_count > 0 ? (
                          <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            <span>{adminStatusInfo.total_count} yetkili meşgul</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-slate-500">
                            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                            <span>{adminStatusInfo.total_count} yetkili uzakta</span>
                          </span>
                        )}
                      </div>
                      {adminStatusInfo.estimated_response_time && (
                        <p className="text-xs text-slate-500">
                          Tahmini yanıt süresi: <span className="font-medium">{adminStatusInfo.estimated_response_time}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Şu an destek ekibimiz çevrimdışı. Mesajınızı bırakın, en kısa sürede size dönüş yapacağız.
                    </p>
                  )}
                  {user && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500">
                        Giriş yapan: <span className="font-semibold text-orange-600">{user.username}</span>
                      </p>
                    </div>
                  )}
                </div>

                {!showComplaintForm && (
                  <div className="bg-white dark:bg-[#151822] rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-bold uppercase tracking-wider">Hızlı İşlemler</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => openComplaintForm('server')}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Server className="w-5 h-5 text-orange-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Sunucu</span>
                      </button>
                      <button
                        onClick={() => openComplaintForm('cheater')}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Hile</span>
                      </button>
                      <button
                        onClick={() => openComplaintForm('admin')}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Shield className="w-5 h-5 text-purple-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Admin</span>
                      </button>
                    </div>
                  </div>
                )}

                {showComplaintForm && (
                  <div className="bg-white dark:bg-[#151822] rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {complaintType === 'server' && 'Sunucu Şikayeti'}
                        {complaintType === 'cheater' && 'Hile Şikayeti'}
                        {complaintType === 'admin' && 'Admin Şikayeti'}
                      </p>
                      <button
                        onClick={() => {
                          setShowComplaintForm(false);
                          setComplaintStep(1);
                          setSelectedPlayer(null);
                          setSelectedAdmin(null);
                          setSelectedCheatType(null);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {complaintStep === 1 && (
                      <>
                        <p className="text-xs text-slate-500 mb-3">
                          {complaintType === 'cheater' && 'Hile yaptığını düşündüğünüz oyuncuyu seçin:'}
                          {complaintType === 'admin' && 'Şikayet etmek istediğiniz admini seçin:'}
                          {complaintType === 'server' && 'Sunucu şikayeti için devam edebilirsiniz.'}
                        </p>

                        {complaintType === 'cheater' && (
                          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                            {fetchingPlayers ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                              </div>
                            ) : players.length > 0 ? (
                              players.map((player, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    setComplaintStep(2);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                >
                                  <User className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{player.name}</span>
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 text-center py-2">Sunucuda oyuncu yok</p>
                            )}
                          </div>
                        )}

                        {complaintType === 'admin' && (
                          <div className="max-h-60 overflow-y-auto space-y-3 mb-3">
                            {['Yönetici', 'Admin', 'Moderatör', 'Üye'].map((rank) => {
                              const rankAdmins = admins.filter(a => a.rank === rank);
                              if (rankAdmins.length === 0) return null;
                              return (
                                <div key={rank}>
                                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">{rank}</p>
                                  {rankAdmins.map((admin, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        setSelectedAdmin(admin);
                                        setComplaintStep(3);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 mb-1"
                                    >
                                      <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                                        {admin.name.charAt(0)}
                                      </div>
                                      <span className="text-sm text-slate-700 dark:text-slate-300">{admin.name}</span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {complaintType === 'server' && (
                          <button
                            onClick={() => {
                              setComplaintStep(3);
                            }}
                            className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg transition-colors"
                          >
                            Devam Et
                          </button>
                        )}
                      </>
                    )}

                    {complaintType === 'cheater' && complaintStep === 2 && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <button onClick={() => setComplaintStep(1)} className="hover:text-slate-700">← Geri</button>
                          <span>Adım 2/3</span>
                        </div>
                        {selectedPlayer && (
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3">
                            <p className="text-xs text-slate-500">Hedef:</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedPlayer.name}</p>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mb-2">Hile türünü seçin:</p>
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {CHEAT_TYPES.map((cheat) => (
                            <button
                              key={cheat.id}
                              onClick={() => {
                                setSelectedCheatType(cheat.id);
                                setComplaintStep(3);
                              }}
                              className={`p-2 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                                selectedCheatType === cheat.id
                                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-orange-300'
                              }`}
                            >
                              <span className="text-xl">{cheat.icon}</span>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cheat.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {complaintStep === 3 && complaintType !== 'cheater' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <button 
                            onClick={() => {
                              if (complaintType === 'admin') setComplaintStep(1);
                              else if (complaintType === 'server') setComplaintStep(1);
                            }} 
                            className="hover:text-slate-700"
                          >
                            ← Geri
                          </button>
                        </div>
                        {selectedPlayer && (
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="text-xs text-slate-500">Hedef:</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedPlayer.name}</p>
                          </div>
                        )}
                        {selectedAdmin && (
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="text-xs text-slate-500">Admin:</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedAdmin.name}</p>
                          </div>
                        )}
                        <textarea
                          value={complaintMessage}
                          onChange={(e) => setComplaintMessage(e.target.value)}
                          placeholder="Şikayetinizi yazın..."
                          rows={3}
                          className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
                        />
                        <button
                          onClick={submitComplaint}
                          disabled={!complaintMessage.trim()}
                          className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-colors"
                        >
                          Gönder
                        </button>
                      </div>
                    )}

                    {complaintType === 'cheater' && complaintStep === 3 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <button onClick={() => setComplaintStep(2)} className="hover:text-slate-700">← Geri</button>
                          <span>Adım 3/3</span>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-500">Hedef:</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedPlayer?.name}</p>
                          {selectedCheatType && (
                            <>
                              <p className="text-xs text-slate-500 mt-1">Hile:</p>
                              <p className="text-sm font-bold text-red-500">
                                {CHEAT_TYPES.find(c => c.id === selectedCheatType)?.icon} {CHEAT_TYPES.find(c => c.id === selectedCheatType)?.label}
                              </p>
                            </>
                          )}
                        </div>
                        <textarea
                          value={complaintMessage}
                          onChange={(e) => setComplaintMessage(e.target.value)}
                          placeholder="Ek bilgi (opsiyonel)..."
                          rows={2}
                          className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
                        />
                        <button
                          onClick={submitComplaint}
                          className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg transition-colors"
                        >
                          Şikayeti Gönder
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : msg.sender_type === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    {msg.sender_type === 'system' ? (
                      <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-full text-xs text-slate-600 dark:text-slate-300">
                        {msg.message}
                      </div>
                    ) : (
                      <div className={`max-w-[80%] ${msg.sender_type === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-2xl px-4 py-2 ${
                          msg.sender_type === 'user' 
                            ? 'bg-orange-600 text-white rounded-br-md' 
                            : 'bg-white dark:bg-[#151822] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-md'
                        }`}>
                          {msg.sender_type !== 'user' && (
                            <p className="text-xs font-bold text-orange-600 mb-1">{msg.sender_name}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <p className={`text-xs text-slate-400 mt-1 ${msg.sender_type === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {waitingForAdmin && (
                  <div className="flex justify-center">
                    <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-full flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">Yanıt bekleniyor...</span>
                    </div>
                  </div>
                )}
                
                {adminTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#151822] px-4 py-2 rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <span className="text-xs text-slate-500">{adminTypingName} yazıyor</span>
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151822]">
            {sessionClosed ? (
              <button
                onClick={startNewSession}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yeni Destek Talebi Başlat
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  disabled={isConnecting}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isConnecting}
                  className="px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

LiveChat.displayName = 'LiveChat';

export default LiveChat;
