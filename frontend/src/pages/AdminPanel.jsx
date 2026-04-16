import React, { useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Users, Clock, CheckCircle, XCircle, Send, Bell, BellOff, LogOut, Package, Plus, Edit, Trash2, Tag, Settings, Server, FileText, Megaphone, Upload, Shield, UserPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { PushProvider, usePush } from '../context/PushContext';
import api from '../api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function AdminPanelContent() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { subscribeToPush, unsubscribeFromPush } = usePush();
  
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [onlineAdmins, setOnlineAdmins] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferAdmin, setSelectedTransferAdmin] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('online');
  const [typingUsers, setTypingUsers] = useState({});
  const [userLocations, setUserLocations] = useState({});
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showPreviousSessionModal, setShowPreviousSessionModal] = useState(false);
  const [previousSessionMessages, setPreviousSessionMessages] = useState([]);
  const [selectedPreviousSession, setSelectedPreviousSession] = useState(null);
  const [activeTab, setActiveTab] = useState('support');
  const [skins, setSkins] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [editingSkin, setEditingSkin] = useState(null);
  const [skinForm, setSkinForm] = useState({ name: '', image_url: '', price: '', category_id: '' });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [livechatAdmins, setLivechatAdmins] = useState([]);
  const [siteUsers, setSiteUsers] = useState([]);
  const [showLivechatAdminModal, setShowLivechatAdminModal] = useState(false);
  const [livechatAdminForm, setLivechatAdminForm] = useState({ steam_id: '', username: '', avatar_url: '', provider: '', can_livechat: true, can_skin_management: true, can_settings: true });
  const [usersIniEntries, setUsersIniEntries] = useState([]);
  const [syncResult, setSyncResult] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchAdmins();
    fetchSkins();
    fetchCategories();
    fetchSettings();
    fetchLivechatAdmins();
    connectSocket();
    
    const sessionInterval = setInterval(fetchSessions, 5000);
    const heartbeatInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('admin_heartbeat', {});
      }
    }, 30000);
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
      clearInterval(sessionInterval);
      clearInterval(heartbeatInterval);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showTransferModal && socket) {
      socket.emit('get_online_admins', {});
      socket.emit('admin_list', {});
    }
  }, [showTransferModal]);

  useEffect(() => {
    if (activeSession) {
      setSessionDuration(0);
      const interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return '💻';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) return '📱';
    return '💻';
  };

  const getDeviceName = (userAgent) => {
    if (!userAgent) return t('device_unknown');
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'Mac';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Chrome (Android)';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'Safari (iOS)';
    return t('device_unknown');
  };

  const connectSocket = () => {
    const newSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', async () => {
      setConnected(true);
      newSocket.emit('admin_login', {
        admin_id: user?.id || 0,
        admin_name: user?.username || 'Admin',
        admin_steam_id: user?.steam_id || ''
      });
      
      if (currentStatus === 'online') {
        newSocket.emit('admin_set_available', {});
      } else if (currentStatus === 'busy') {
        newSocket.emit('admin_set_busy', {});
      } else if (currentStatus === 'away') {
        newSocket.emit('admin_set_away', {});
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('admin_list', (data) => {
      const uniqueAdmins = data.admins?.filter((admin, index, self) => 
        index === self.findIndex(a => a.admin_steam_id === admin.admin_steam_id)
      ) || [];
      setOnlineAdmins(uniqueAdmins);
    });

    newSocket.on('admin_status_change', (data) => {
      setOnlineAdmins(prev => prev.map(admin => 
        admin.admin_id === data.admin_id 
          ? { ...admin, status: data.status }
          : admin
      ));
      if (data.admin_id === user?.id) {
        setCurrentStatus(data.status);
      }
    });

    newSocket.on('admin_notification', (data) => {
      fetchSessions();
      
      const sessionId = Number(data.session_id);
      if (data.ip_address || data.location || data.user_agent) {
        setActiveSession(prev => prev && prev.id === sessionId ? {
          ...prev,
          ip_address: data.ip_address,
          location: data.location,
          user_agent: data.user_agent
        } : prev);
      }
    });

    newSocket.on('new_message', (msgData) => {
      setMessages(prev => [...prev, msgData]);
      
      if (msgData.session_id === activeSession?.id) {
        fetchSessionMessages(msgData.session_id);
        setSessions(prev => prev.map(s => 
          s.id === msgData.session_id 
            ? { ...s, last_message: msgData.message, last_message_time: msgData.created_at }
            : s
        ));
      }
    });

    newSocket.on('session_assigned', (assignData) => {
      setSessions(prev => prev.map(s => 
        s.id === assignData.session_id 
          ? { ...s, assigned_admin: assignData.admin_name, status: 'active' }
          : s
      ));
    });

    newSocket.on('session_closed', (data) => {
      const sessionId = Number(data.session_id);
      setSessions(prev => {
        return prev.filter(s => s.id !== sessionId);
      });
      
      if (activeSession?.id === sessionId) {
        if (data.closed_by === 'admin') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            sender_type: 'system',
            sender_name: t('system'),
            message: t('admin_closed'),
            created_at: new Date().toISOString()
          }]);
          setTimeout(() => {
            setActiveSession(null);
            setMessages([]);
          }, 3000);
        } else {
          setActiveSession(null);
          setMessages([]);
        }
      }
      fetchSessions();
    });

    newSocket.on('user_session_closed', (data) => {
      const sessionId = Number(data.session_id);
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'user_closed' } : s
      ));
      
      if (activeSession?.id === sessionId) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender_type: 'system',
          sender_name: t('system'),
          message: t('user_closed'),
          created_at: new Date().toISOString()
        }]);
        setTimeout(() => {
          setActiveSession(null);
          setMessages([]);
        }, 2000);
      }
      fetchSessions();
    });

    newSocket.on('session_transferred', () => {
      fetchSessions();
    });

    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.session_id]: {
          is_typing: data.is_typing,
          typing_text: data.typing_text || ''
        }
      }));
    });

    newSocket.on('user_location', (data) => {
      const sessionId = Number(data.session_id);
      setUserLocations(prev => ({
        ...prev,
        [sessionId]: {
          page_url: data.page_url,
          page_name: data.page_name,
          ip_address: data.ip_address,
          location: data.location,
          user_agent: data.user_agent
        }
      }));
      
      if (activeSession?.id === sessionId) {
        setActiveSession(prev => prev ? {
          ...prev,
          ip_address: data.ip_address,
          location: data.location,
          user_agent: data.user_agent
        } : null);
      }
    });

    setSocket(newSocket);
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/support/sessions');
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
    setLoading(false);
  };

  const fetchSessionMessages = async (sessionId) => {
    try {
      const res = await api.get(`/support/session/${sessionId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admins/support-admins');
      setAdmins(res.data);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  };

  const fetchSkins = async () => {
    try {
      const res = await api.get('/skins/all');
      setSkins(res.data);
    } catch (err) {
      console.error('Failed to fetch skins:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/skins/categories/all');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setSettings(res.data);
      setSettingsForm(res.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchLivechatAdmins = async () => {
    try {
      const [adminsRes, usersRes] = await Promise.all([
        api.get('/admin/livechat-admins'),
        api.get('/users/all').catch(() => ({ data: [] }))
      ]);
      
      const usersMap = {};
      if (usersRes.data) {
        usersRes.data.forEach(u => {
          if (u.steam_id) usersMap[u.steam_id] = u;
        });
      }
      
      const adminsWithProfiles = adminsRes.data.map(admin => ({
        ...admin,
        profile: usersMap[admin.steam_id] || null
      }));
      
      setLivechatAdmins(adminsWithProfiles);
    } catch (err) {
      console.error('Failed to fetch livechat admins:', err);
    }
  };

  const fetchSiteUsers = async () => {
    try {
      const res = await api.get('/users/all');
      setSiteUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/admin/settings', settingsForm);
      setSettings(settingsForm);
      alert(t('settings_saved'));
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert(t('error_saving_settings'));
    }
  };

  const handleAddLivechatAdmin = async () => {
    if (!livechatAdminForm.steam_id || !livechatAdminForm.username) {
      alert(t('fill_all_fields'));
      return;
    }
    try {
      await api.post('/admin/livechat-admins', livechatAdminForm);
      fetchLivechatAdmins();
      setShowLivechatAdminModal(false);
      setLivechatAdminForm({ steam_id: '', username: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Eklenirken hata oluştu.');
    }
  };

  const handleDeleteLivechatAdmin = async (adminId) => {
    if (!confirm(t('confirm_delete'))) return;
    try {
      await api.delete(`/admin/livechat-admins/${adminId}`);
      fetchLivechatAdmins();
    } catch (err) {
      alert(err.response?.data?.detail || t('error_deleting'));
    }
  };

  const handleUpdateAdminPermission = async (adminId, permission, value) => {
    try {
      await api.put(`/admin/livechat-admins/${adminId}`, { [permission]: value });
      fetchLivechatAdmins();
    } catch (err) {
      alert(err.response?.data?.detail || t('error_updating'));
    }
  };

  const handleUsersIniUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/users-ini/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUsersIniEntries(res.data.entries);
      setSyncResult(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Dosya yüklenirken hata oluştu.');
    }
  };

  const handleSyncUsersIni = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/users-ini/sync', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSyncResult(res.data);
      setUsersIniEntries([]);
      alert(`Senkronizasyon tamamlandı! ${res.data.added_entries} eklendi, ${res.data.skipped_entries} atlandı.`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Senkronizasyon sırasında hata oluştu.');
    }
  };

  const handleOpenSkinModal = (skin = null) => {
    if (skin) {
      setEditingSkin(skin);
      setSkinForm({ 
        name: skin.name, 
        image_url: skin.image_url, 
        price: skin.price.toString(),
        category_id: skin.category_id ? skin.category_id.toString() : ''
      });
    } else {
      setEditingSkin(null);
      setSkinForm({ name: '', image_url: '', price: '', category_id: '' });
    }
    setShowSkinModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/skins/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSkinForm({ ...skinForm, image_url: `http://127.0.0.1:8000${res.data.url}` });
    } catch (err) {
      console.error('Upload failed:', err);
      alert(t('file_upload_error'));
    }
  };

  const handleSaveSkin = async () => {
    if (!skinForm.name || !skinForm.image_url || !skinForm.price) {
      alert(t('fill_all_fields'));
      return;
    }
    try {
      if (editingSkin) {
        await api.put(`/skins/${editingSkin.id}`, {
          name: skinForm.name,
          image_url: skinForm.image_url,
          price: parseInt(skinForm.price),
          category_id: skinForm.category_id ? parseInt(skinForm.category_id) : null
        });
      } else {
        await api.post('/skins/', {
          name: skinForm.name,
          image_url: skinForm.image_url,
          price: parseInt(skinForm.price),
          category_id: skinForm.category_id ? parseInt(skinForm.category_id) : null
        });
      }
      fetchSkins();
      setShowSkinModal(false);
    } catch (err) {
      console.error('Failed to save skin:', err);
      alert(t('error_saving_settings'));
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      alert(t('fill_all_fields'));
      return;
    }
    try {
      await api.post('/skins/categories/', { name: categoryForm.name });
      fetchCategories();
      setShowCategoryModal(false);
      setCategoryForm({ name: '' });
    } catch (err) {
      console.error('Failed to save category:', err);
      alert(err.response?.data?.detail || 'Kategori kaydedilirken hata oluştu.');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm(t('confirm_delete'))) return;
    try {
      await api.delete(`/skins/categories/${categoryId}`);
      fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert(t('error_deleting'));
    }
  };

  const handleDeleteSkin = async (skinId) => {
    if (!confirm(t('confirm_delete'))) return;
    try {
      await api.delete(`/skins/${skinId}`);
      fetchSkins();
    } catch (err) {
      console.error('Failed to delete skin:', err);
      alert(t('error_deleting'));
    }
  };

  const handleTakeSession = (session) => {
    setActiveSession(session);
    fetchSessionMessages(session.id);
    fetchSessionInfo(session.id);
  };

  const fetchSessionInfo = async (sessionId) => {
    try {
      const res = await api.get(`/support/session/${sessionId}/info`);
      setSessionInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch session info:', err);
    }
  };

  const handleViewPreviousSession = async (prevSessionId) => {
    try {
      const res = await api.get(`/support/session/${prevSessionId}/messages`);
      setPreviousSessionMessages(res.data);
      setSelectedPreviousSession(prevSessionId);
      setShowPreviousSessionModal(true);
    } catch (err) {
      console.error('Failed to fetch previous session messages:', err);
    }
  };

  const handleAssignSession = () => {
    if (!socket || !activeSession) return;
    
    socket.emit('take_session', {
      session_id: activeSession.id,
      admin_id: user?.id || 0,
      admin_name: user?.username || 'Admin'
    });

    setSessions(prev => prev.map(s => 
      s.id === activeSession.id 
        ? { ...s, assigned_admin: user?.username || 'Admin', status: 'active' }
        : s
    ));
    setActiveSession(prev => prev ? { ...prev, assigned_admin: user?.username || 'Admin', status: 'active' } : null);
    
    socket.emit('admin_set_busy', {});
    setCurrentStatus('busy');
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !socket) return;
    
    socket.emit('admin_message', {
      session_id: activeSession.id,
      message: inputMessage.trim(),
      sender_name: user?.username || 'Admin'
    });
    
    setInputMessage('');
    
    socket.emit('admin_typing', {
      session_id: activeSession.id,
      admin_name: user?.username || 'Admin',
      is_typing: false
    });
  };

  const handleAdminInputChange = (e) => {
    setInputMessage(e.target.value);
    
    if (socket) {
      socket.emit('admin_typing', {
        session_id: activeSession?.id,
        admin_name: user?.username || 'Admin',
        is_typing: e.target.value.length > 0
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTransferSession = () => {
    if (!socket || !activeSession || !selectedTransferAdmin) return;
    
    socket.emit('transfer_session', {
      session_id: activeSession.id,
      from_admin: user?.username || 'Admin',
      to_admin: selectedTransferAdmin.name,
      to_admin_id: selectedTransferAdmin.id
    });

    setShowTransferModal(false);
    setSelectedTransferAdmin(null);
    setActiveSession(null);
    setMessages([]);
    
    socket.emit('admin_set_available', {});
    setCurrentStatus('online');
  };

  const handleSetStatus = (status) => {
    if (!socket) return;
    
    if (status === 'online') {
      socket.emit('admin_set_available', {});
      setCurrentStatus('online');
    } else if (status === 'busy') {
      socket.emit('admin_set_busy', {});
      setCurrentStatus('busy');
    } else if (status === 'away') {
      socket.emit('admin_set_away', {});
      setCurrentStatus('away');
    } else if (status === 'offline') {
      socket.emit('admin_set_offline', {});
      setCurrentStatus('offline');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    
    if (!confirm(t('confirm_delete'))) return;
    
    const sessionId = activeSession.id;
    
    try {
      await api.put(`/support/session/${sessionId}/close`);
    } catch (err) {
      console.error('Failed to close session via API:', err);
    }
    
    if (socket) {
      socket.emit('close_session', {
        session_id: sessionId,
        admin_id: user?.id || 0
      });
    }

    socket?.emit('admin_set_available', {});
    setCurrentStatus('online');
    setActiveSession(null);
    setMessages([]);
    fetchSessions();
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm(t('confirm_delete'))) return;
    
    try {
      await api.delete(`/support/session/${sessionId}`);
      const newSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(newSessions);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      await unsubscribeFromPush(user?.id);
      setNotificationsEnabled(false);
    } else {
      const success = await subscribeToPush(user?.id);
      if (success) {
        setNotificationsEnabled(true);
      }
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 dark:bg-[#0a0c10]">
      <div className="fixed top-16 left-0 right-0 z-40 bg-white dark:bg-[#151822] border-b border-slate-200 dark:border-slate-800 px-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'support'
                ? 'text-orange-600 border-orange-600'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            {t('support')}
          </button>
          <button
            onClick={() => { setActiveTab('skins'); fetchSkins(); }}
            className={`px-4 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'skins'
                ? 'text-orange-600 border-orange-600'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            {t('skin_management')}
          </button>
          <button
            onClick={() => { setActiveTab('settings'); fetchSettings(); }}
            className={`px-4 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'text-orange-600 border-orange-600'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            {t('settings')}
          </button>
        </div>
      </div>

      <div className="pt-12 h-[calc(100vh-64px)]">
        {activeTab === 'skins' && (
          <div className="p-6 overflow-auto h-full">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('skin_management')}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCategoryModal(true); setCategoryForm({ name: '' }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                    {t('add_category_btn')}
                  </button>
                  <button
                    onClick={() => handleOpenSkinModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('add_skin_btn')}
                  </button>
                </div>
              </div>

              {categories.length > 0 && (
                <div className="mb-6 p-4 bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-3">{t('categories')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                        <Tag className="w-3 h-3 text-purple-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skins.map(skin => (
                  <div key={skin.id} className="bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative">
                      <img src={skin.image_url} alt={skin.name} className="w-full h-full object-cover" />
                      {!skin.is_active && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">{t('pasif')}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">
                        {skin.category_name ? `${skin.category_name} | ` : ''}{skin.name}
                      </h3>
                      <p className="text-xl font-black text-orange-600 mt-1">{skin.price} {t('tl')}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleOpenSkinModal(skin)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          {t('düzenle')}
                        </button>
                        <button
                          onClick={() => handleDeleteSkin(skin.id)}
                          className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {skins.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('no_skins')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-6 overflow-auto h-full">
            <div className="max-w-5xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Ayarlar
              </h2>

              <div className="bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  CS 1.6 Sunucu Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sunucu IP</label>
                    <input type="text" value={settingsForm?.cs16_server_ip || ''} onChange={(e) => setSettingsForm({...settingsForm, cs16_server_ip: e.target.value})} placeholder="185.100.68.100" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Port</label>
                    <input type="text" value={settingsForm?.cs16_server_port || ''} onChange={(e) => setSettingsForm({...settingsForm, cs16_server_port: e.target.value})} placeholder="27015" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                {settingsForm?.cs16_server_ip && settingsForm?.cs16_server_port && (
                  <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GameTracker Entegrasyonu:</p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`https://www.gametracker.com/server_info/${settingsForm.cs16_server_ip}:${settingsForm.cs16_server_port}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Sunucuyu Görüntüle
                      </a>
                      <a
                        href={`https://www.gametracker.com/addserver/?query=${settingsForm.cs16_server_ip}:${settingsForm.cs16_server_port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        GameTracker'a Ekle
                      </a>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      IP: <span className="font-mono">{settingsForm.cs16_server_ip}:{settingsForm.cs16_server_port}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-purple-500" />
                  TeamSpeak 3 Sunucu Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sunucu IP</label>
                    <input type="text" value={settingsForm?.ts3_server_ip || ''} onChange={(e) => setSettingsForm({...settingsForm, ts3_server_ip: e.target.value})} placeholder="185.100.68.100" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sunucu Port</label>
                    <input type="text" value={settingsForm?.ts3_server_port || ''} onChange={(e) => setSettingsForm({...settingsForm, ts3_server_port: e.target.value})} placeholder="9987" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Query Port</label>
                    <input type="text" value={settingsForm?.ts3_query_port || ''} onChange={(e) => setSettingsForm({...settingsForm, ts3_query_port: e.target.value})} placeholder="10011" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Query Kullanıcı</label>
                    <input type="text" value={settingsForm?.ts3_query_user || ''} onChange={(e) => setSettingsForm({...settingsForm, ts3_query_user: e.target.value})} placeholder="serveradmin" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Query Şifre</label>
                  <input type="password" value={settingsForm?.ts3_query_password || ''} onChange={(e) => setSettingsForm({...settingsForm, ts3_query_password: e.target.value})} placeholder="********" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500 md:w-1/2" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Live Chat Adminleri
                </h3>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-slate-500">Live chat'e erişebilecek adminler</p>
                  <button onClick={() => { fetchSiteUsers(); setShowLivechatAdminModal(true); setLivechatAdminForm({ steam_id: '', username: '', avatar_url: '', provider: '' }); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">
                    <UserPlus className="w-4 h-4" />
                    Admin Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {livechatAdmins.length === 0 ? (
                    <p className="text-center py-4 text-slate-500">Henüz admin eklenmemiş</p>
                  ) : (
                    livechatAdmins.map(admin => (
                      <div key={admin.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                              {admin.profile?.avatar_url ? (
                                <img src={admin.profile.avatar_url} alt={admin.username} className="w-full h-full object-cover" />
                              ) : (
                                admin.username.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900 dark:text-white">{admin.profile?.username || admin.username}</p>
                                {admin.is_superadmin && <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">{t('superadmin')}</span>}
                              </div>
                              <p className="text-xs text-slate-500">{admin.steam_id}</p>
                            </div>
                          </div>
                          {!admin.is_superadmin && (
                            <button onClick={() => handleDeleteLivechatAdmin(admin.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label className={`flex items-center gap-2 text-sm ${admin.is_superadmin || admin.steam_id === user?.steam_id ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              checked={admin.can_livechat !== false} 
                              disabled={admin.is_superadmin || admin.steam_id === user?.steam_id}
                              onChange={(e) => !admin.is_superadmin && admin.steam_id !== user?.steam_id && handleUpdateAdminPermission(admin.id, 'can_livechat', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" 
                            />
                            <span className={`${admin.is_superadmin ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{t('livechat_tab')}</span>
                          </label>
                          <label className={`flex items-center gap-2 text-sm ${admin.is_superadmin || admin.steam_id === user?.steam_id ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              checked={admin.can_skin_management !== false} 
                              disabled={admin.is_superadmin || admin.steam_id === user?.steam_id}
                              onChange={(e) => !admin.is_superadmin && admin.steam_id !== user?.steam_id && handleUpdateAdminPermission(admin.id, 'can_skin_management', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" 
                            />
                            <span className={`${admin.is_superadmin ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{t('skin_management_tab')}</span>
                          </label>
                          <label className={`flex items-center gap-2 text-sm ${admin.is_superadmin || admin.steam_id === user?.steam_id ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              checked={admin.can_settings !== false} 
                              disabled={admin.is_superadmin || admin.steam_id === user?.steam_id}
                              onChange={(e) => !admin.is_superadmin && admin.steam_id !== user?.steam_id && handleUpdateAdminPermission(admin.id, 'can_settings', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" 
                            />
                            <span className={`${admin.is_superadmin ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{t('settings_tab')}</span>
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-500" />
                  Users.ini Yönetimi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">1. Dosya Yükle ve Önizle</h4>
                    <p className="text-sm text-slate-500 mb-3">Admin listesini görmek için users.ini dosyasını yükleyin</p>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <Upload className="w-5 h-5 text-slate-500" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Users.ini Seç</span>
                      <input type="file" accept=".ini" onChange={handleUsersIniUpload} className="hidden" />
                    </label>
                    {usersIniEntries.length > 0 && (
                      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg max-h-60 overflow-auto">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{usersIniEntries.length} admin bulundu:</p>
                        {usersIniEntries.map((entry, idx) => (
                          <div key={idx} className="text-sm py-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                            <span className="font-mono text-orange-600">{entry.steam_id}</span>
                            <span className="text-slate-400 mx-2">|</span>
                            <span className="text-slate-600 dark:text-slate-400">{entry.flags}</span>
                            {entry.name && <span className="text-slate-400 mx-2">| {entry.name}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">2. Adminlist.txt'ye Ekle</h4>
                    <p className="text-sm text-slate-500 mb-3">Mevcut listeye yeni adminleri ekler (varsa atlar)</p>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-5 h-5" />
                      <span className="font-medium">Senkronize Et</span>
                      <input type="file" accept=".ini" onChange={handleSyncUsersIni} className="hidden" />
                    </label>
                    {syncResult && (
                      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sonuç:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="text-green-600 font-medium">{syncResult.added_entries} eklendi</span>
                          {syncResult.skipped_entries > 0 && <span className="text-yellow-600 ml-2">{syncResult.skipped_entries} atlandı</span>}
                        </p>
                        {syncResult.added_list.length > 0 && <div className="mt-2 text-xs text-slate-500">Eklenenler: {syncResult.added_list.join(', ')}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#151822] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-red-500" />
                  Site Duyurusu
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Başlık</label>
                    <input type="text" value={settingsForm?.announcement_title || ''} onChange={(e) => setSettingsForm({...settingsForm, announcement_title: e.target.value})} placeholder="Örn: Bakım Duyurusu" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">İçerik</label>
                    <textarea value={settingsForm?.announcement_content || ''} onChange={(e) => setSettingsForm({...settingsForm, announcement_content: e.target.value})} placeholder="Duyuru içeriğini buraya yazın..." rows={4} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500 resize-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm?.announcement_active || false} onChange={(e) => setSettingsForm({...settingsForm, announcement_active: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Duyuruyu Aktif Et</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveSettings} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Ayarları Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'support' || (activeTab !== 'skins' && activeTab !== 'settings')) && (
          <div className="flex h-full">
            <div className="w-80 bg-white dark:bg-[#151822] border-r border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-orange-500" />
                    {t('support_requests')}
                  </h2>
                  <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                    {sessions.length}
                  </span>
                </div>
                
                <button
                  onClick={toggleNotifications}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    notificationsEnabled 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {notificationsEnabled ? (
                    <>
                      <Bell className="w-4 h-4" />
                      {t('notifications_on')}
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4" />
                      {t('enable_notifications')}
                    </>
                  )}
                </button>
                
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-slate-500">{connected ? t('connected_status') : t('disconnected_status')}</span>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 mb-2">{t('admins_label')}</p>
                  <div className="flex flex-wrap gap-2">
                    {onlineAdmins.length === 0 && (
                      <span className="text-xs text-slate-400">{t('no_admins_online')}</span>
                    )}
                    {onlineAdmins.map((admin, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                        <span className={`w-2 h-2 rounded-full ${
                          admin.status === 'online' ? 'bg-emerald-500' :
                          admin.status === 'busy' ? 'bg-red-500' :
                          admin.status === 'away' ? 'bg-yellow-500' :
                          'bg-slate-400'
                        }`} />
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {admin.admin_name.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 mb-2">{t('your_status')}</p>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleSetStatus('online')}
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          currentStatus === 'online'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {t('çevrimiçi')}
                      </button>
                      <button
                        onClick={() => handleSetStatus('busy')}
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          currentStatus === 'busy'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {t('meşgul')}
                      </button>
                      <button
                        onClick={() => handleSetStatus('away')}
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          currentStatus === 'away'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-yellow-100'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {t('uzakta')}
                      </button>
                      <button
                        onClick={() => handleSetStatus('offline')}
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          currentStatus === 'offline'
                            ? 'bg-slate-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {t('çevrimdışı')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">{t('no_support_requests')}</p>
                  </div>
                ) : (
                  sessions.map(session => (
                    <div
                      key={session.id}
                      className={`relative group p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        activeSession?.id === session.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                      }`}
                      onClick={() => handleTakeSession(session)}
                    >
                      {(session.status === 'closed' || session.status === 'user_closed') && (
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="absolute top-2 right-2 p-1 rounded bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t('delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {session.user_name}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          session.status === 'waiting' 
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : session.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : session.status === 'user_closed'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {session.status === 'waiting' ? t('waiting') : session.status === 'active' ? t('active_session') : session.status === 'user_closed' ? t('user_left') : t('closed')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {session.last_message || t('no_messages_yet')}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              {activeSession ? (
                <>
                  <div className="p-4 bg-white dark:bg-[#151822] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {activeSession.user_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {t('session_id')}{activeSession.id}
                        {activeSession.assigned_admin && (
                          <span className="ml-2">• {activeSession.assigned_admin} {t('assigned_to_you')}</span>
                        )}
                        <span className="ml-2 text-emerald-600 font-medium">
                          ⏱ {formatDuration(sessionDuration)}
                        </span>
                      </p>
                      {(userLocations[activeSession.id]?.ip_address || userLocations[activeSession.id]?.location || userLocations[activeSession.id]?.user_agent) && (
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                          {userLocations[activeSession.id]?.location && (
                            <span className="text-slate-400">
                              🌐 {userLocations[activeSession.id].location}
                            </span>
                          )}
                          {userLocations[activeSession.id]?.ip_address && userLocations[activeSession.id].ip_address !== 'unknown' && (
                            <span className="text-slate-400">
                              📍 {userLocations[activeSession.id].ip_address}
                            </span>
                          )}
                          {userLocations[activeSession.id]?.user_agent && userLocations[activeSession.id].user_agent !== 'Bilinmiyor' && (
                            <span className="text-slate-400" title={userLocations[activeSession.id].user_agent}>
                              {getDeviceIcon(userLocations[activeSession.id].user_agent)} {getDeviceName(userLocations[activeSession.id].user_agent)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!activeSession.assigned_admin ? (
                        <button
                          onClick={handleAssignSession}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          {t('take_conversation')}
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowTransferModal(true)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('transfer_conversation')}
                        </button>
                      )}
                      <button
                        onClick={handleCloseSession}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        {t('end_conversation')}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0a0c10]">
                    {!activeSession.assigned_admin && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg text-center">
                        <p className="text-sm">{t('take_conversation_first')}</p>
                      </div>
                    )}
                    
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.sender_type === 'admin'
                            ? 'bg-orange-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-[#151822] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-md'
                        }`}>
                          {msg.sender_type !== 'admin' && (
                            <p className="text-xs font-bold text-orange-600 mb-1">{msg.sender_name}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_type === 'admin' ? 'text-orange-200' : 'text-slate-400'
                          }`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                      ))}
                    {typingUsers[activeSession.id]?.is_typing && (
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                        </div>
                        <span className="font-medium">{activeSession.user_name}:</span>
                        <span>{typingUsers[activeSession.id]?.typing_text || t('typing_text')}</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 bg-white dark:bg-[#151822] border-t border-slate-200 dark:border-slate-800">
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={handleAdminInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder={activeSession.assigned_admin ? t('type_response') : t('take_session_first_placeholder')}
                        disabled={!activeSession.assigned_admin}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || !activeSession.assigned_admin}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        {t('gönder')}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {t('support_panel_title')}
                    </h3>
                    <p className="text-slate-500">
                      {t('select_session_hint')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showSkinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151822] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-orange-600 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingSkin ? t('edit_skin') : t('add_new_skin')}</h3>
              <button onClick={() => setShowSkinModal(false)} className="hover:bg-orange-500 p-1 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('kategori')}</label>
                <select
                  value={skinForm.category_id}
                  onChange={(e) => setSkinForm({ ...skinForm, category_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="">{t('select_category')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('skin_name_required')}</label>
                <input
                  type="text"
                  value={skinForm.name}
                  onChange={(e) => setSkinForm({ ...skinForm, name: e.target.value })}
                  placeholder={t('example_skin')}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('resim')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skinForm.image_url}
                    onChange={(e) => setSkinForm({ ...skinForm, image_url: e.target.value })}
                    placeholder={t('upload_image')}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer transition-colors flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('upload')}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                {skinForm.image_url && (
                  <div className="mt-2 w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <img src={skinForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('fiyat_tl')}</label>
                <input
                  type="number"
                  value={skinForm.price}
                  onChange={(e) => setSkinForm({ ...skinForm, price: e.target.value })}
                  placeholder={t('price_placeholder')}
                  min="1"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowSkinModal(false)}
                className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveSkin}
                className="flex-1 py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151822] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{t('add_new_category')}</h3>
              <button onClick={() => setShowCategoryModal(false)} className="hover:bg-purple-500 p-1 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('category_name_required')}</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ name: e.target.value })}
                  placeholder={t('example_category')}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">{t('category_desc')}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#151822] rounded-xl p-6 w-[500px] max-w-[90%]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t('transfer_session_title')}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {t('select_admin_to_transfer')}
            </p>
            <div className="max-h-80 overflow-y-auto space-y-2 mb-4">
              {['Yönetici', 'Admin', 'Moderatör', 'Üye'].map((rank) => {
                const rankAdmins = admins.filter(a => a.rank === rank && a.name !== user?.username);
                if (rankAdmins.length === 0) return null;
                return (
                  <div key={rank}>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">{rank}</p>
                    {rankAdmins.map((admin, idx) => {
                      const isOnline = onlineAdmins.some(oa => oa.admin_steam_id === admin.steam_id || oa.admin_name === admin.name);
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedTransferAdmin(admin)}
                          className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors mb-1 ${
                            selectedTransferAdmin?.name === admin.name
                              ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">{admin.name}</p>
                            <p className="text-xs text-slate-500">{admin.rank}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {isOnline ? t('online_status') : t('offline_status')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedTransferAdmin(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleTransferSession}
                disabled={!selectedTransferAdmin}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {t('devret')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLivechatAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151822] rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-green-600 text-white p-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                {t('add_livechat_admin')}
              </h3>
              <button onClick={() => setShowLivechatAdminModal(false)} className="hover:bg-green-500 p-1 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-sm text-slate-500 mb-3">{t('select_user_prompt')}</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {siteUsers.length === 0 ? (
                  <p className="text-center py-4 text-slate-500">{t('user_not_found')}</p>
                ) : (
                  siteUsers
                    .filter(user => {
                      const isAlreadyAdmin = livechatAdmins.some(a => a.steam_id === user.steam_id);
                      return !isAlreadyAdmin && user.steam_id;
                    })
                    .map(user => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setLivechatAdminForm({
                            steam_id: user.steam_id,
                            username: user.username,
                            avatar_url: user.avatar_url,
                            provider: user.provider
                          });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          livechatAdminForm.steam_id === user.steam_id
                            ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 overflow-hidden flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{user.username}</p>
                          <p className="text-xs text-slate-500">{user.steam_id} • {user.provider}</p>
                        </div>
                      </div>
                    ))
                )}
                {siteUsers.filter(user => !livechatAdmins.some(a => a.steam_id === user.steam_id) && user.steam_id).length === 0 && (
                  <p className="text-center py-4 text-slate-500">{t('user_not_found')}</p>
                )}
              </div>
              {livechatAdminForm.steam_id && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-3">{t('permissions_for')} {livechatAdminForm.username}:</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={livechatAdminForm.can_livechat || false} onChange={(e) => setLivechatAdminForm({...livechatAdminForm, can_livechat: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t('livechat_tab')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={livechatAdminForm.can_skin_management || false} onChange={(e) => setLivechatAdminForm({...livechatAdminForm, can_skin_management: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t('skin_management_tab')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={livechatAdminForm.can_settings || false} onChange={(e) => setLivechatAdminForm({...livechatAdminForm, can_settings: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t('settings_tab')}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button onClick={() => { setShowLivechatAdminModal(false); setLivechatAdminForm({ steam_id: '', username: '', avatar_url: '', provider: '', can_livechat: false, can_skin_management: false, can_view_skins: true }); }} className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors">
                {t('cancel')}
              </button>
              <button
                onClick={handleAddLivechatAdmin}
                disabled={!livechatAdminForm.steam_id}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  return (
    <PushProvider>
      <AdminPanelContent />
    </PushProvider>
  );
}
