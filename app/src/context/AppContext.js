import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { io } from 'socket.io-client';
import { FIREBASE_DB_URL, FALLBACK_SERVER_URL } from '../config';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [banned, setBanned]       = useState(false);
  const [deviceId, setDeviceId]   = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef  = useRef(null);
  const serverUrlRef = useRef(null);

  // ── device ID ───────────────────────────────────────────────────────────────
  async function getDeviceId() {
    let id = await AsyncStorage.getItem('deviceId');
    if (!id) {
      const androidId = Application.androidId;
      const model = Device.modelName || 'unknown';
      id = androidId ? `${androidId}-${model}` : `${Date.now()}-${Math.random()}`;
      await AsyncStorage.setItem('deviceId', id);
    }
    return id;
  }

  // ── fetch server URL from Firebase ──────────────────────────────────────────
  async function fetchServerUrl() {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/serverUrl.json`);
      const url = await res.json();
      if (url && typeof url === 'string' && url.startsWith('http')) {
        await AsyncStorage.setItem('lastServerUrl', url);
        return url;
      }
    } catch (e) {}
    // fallback: last known URL
    const cached = await AsyncStorage.getItem('lastServerUrl');
    if (cached) return cached;
    return FALLBACK_SERVER_URL || null;
  }

  // ── connect socket to given URL ──────────────────────────────────────────────
  function connectSocket(url) {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 8000,
    });

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setReconnecting(true);
    });

    // server changed its URL — reconnect automatically
    socket.on('server:url', async ({ url: newUrl }) => {
      if (newUrl === serverUrlRef.current) return;
      console.log('🔄 Server URL changed:', newUrl);
      setReconnecting(true);
      await AsyncStorage.setItem('lastServerUrl', newUrl);
      serverUrlRef.current = newUrl;
      setServerUrl(newUrl);
      setTimeout(() => connectSocket(newUrl), 1000);
    });

    socketRef.current = socket;
  }

  // ── init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const did = await getDeviceId();
        setDeviceId(did);

        const url = await fetchServerUrl();
        if (!url) { setLoading(false); return; }

        serverUrlRef.current = url;
        setServerUrl(url);

        const banRes = await fetch(`${url}/api/check-ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: did }),
        });
        const banData = await banRes.json();
        if (banData.banned) { setBanned(true); setLoading(false); return; }

        const userRes = await fetch(`${url}/api/user/${did}`);
        const userData = await userRes.json();
        if (userData.user) setUser(userData.user);

        const adminPass = await AsyncStorage.getItem('adminPass');
        if (adminPass === '19376') setIsAdmin(true);

        connectSocket(url);
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  }, []);

  // ── api helpers ──────────────────────────────────────────────────────────────
  const getUrl = () => serverUrlRef.current || serverUrl;

  async function register(profile) {
    const res = await fetch(`${getUrl()}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, ...profile }),
    });
    const data = await res.json();
    if (data.success) setUser(data.user);
    return data;
  }

  async function updateProfile(profile) {
    const res = await fetch(`${getUrl()}/api/user/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (data.success) setUser(data.user);
    return data;
  }

  async function unlockAdmin(password) {
    if (password !== '19376') return false;
    await AsyncStorage.setItem('adminPass', password);
    setIsAdmin(true);
    return true;
  }

  async function uploadImage(uri) {
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop();
    const form = new FormData();
    form.append('image', { uri, name: filename, type: `image/${ext}` });
    const res = await fetch(`${getUrl()}/api/upload`, { method: 'POST', body: form });
    const data = await res.json();
    return data.success ? `${getUrl()}${data.url}` : null;
  }

  const api = async (path, method = 'GET', body = null) => {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify({ deviceId, ...body });
    const res = await fetch(`${getUrl()}${path}`, opts);
    return res.json();
  };

  const adminApi = async (path, method = 'GET', body = null) => {
    const q = method === 'GET' ? '?password=19376' : '';
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify({ password: '19376', ...body });
    const res = await fetch(`${getUrl()}${path}${q}`, opts);
    return res.json();
  };

  return (
    <AppContext.Provider value={{
      user, setUser, isAdmin, loading, banned,
      deviceId, socket: socketRef.current,
      serverUrl: getUrl(),
      connected, reconnecting,
      register, updateProfile, unlockAdmin,
      uploadImage, api, adminApi,
      school: user?.school,
      userClass: user?.class,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

