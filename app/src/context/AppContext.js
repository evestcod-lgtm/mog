import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { io } from 'socket.io-client';
import { SERVER_URL, SOCKET_URL } from '../config';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [banned, setBanned]     = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const socketRef               = useRef(null);

  // derive unique device ID
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

  // init socket
  function initSocket() {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(SOCKET_URL, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;
    return socket;
  }

  useEffect(() => {
    (async () => {
      try {
        const did = await getDeviceId();
        setDeviceId(did);

        // check ban
        const banRes = await fetch(`${SERVER_URL}/api/check-ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: did })
        });
        const banData = await banRes.json();
        if (banData.banned) { setBanned(true); setLoading(false); return; }

        // load user
        const res = await fetch(`${SERVER_URL}/api/user/${did}`);
        const data = await res.json();
        if (data.user) setUser(data.user);

        // admin check
        const adminPass = await AsyncStorage.getItem('adminPass');
        if (adminPass === '19376') setIsAdmin(true);

        initSocket();
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => socketRef.current?.disconnect();
  }, []);

  async function register(profile) {
    const res = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, ...profile })
    });
    const data = await res.json();
    if (data.success) setUser(data.user);
    return data;
  }

  async function updateProfile(profile) {
    const res = await fetch(`${SERVER_URL}/api/user/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
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
    const res = await fetch(`${SERVER_URL}/api/upload`, { method: 'POST', body: form });
    const data = await res.json();
    return data.success ? `${SERVER_URL}${data.url}` : null;
  }

  const api = async (path, method = 'GET', body = null) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify({ deviceId, ...body });
    const res = await fetch(`${SERVER_URL}${path}`, opts);
    return res.json();
  };

  const adminApi = async (path, method = 'GET', body = null) => {
    const query = method === 'GET' ? `?password=19376` : '';
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify({ password: '19376', ...body });
    const res = await fetch(`${SERVER_URL}${path}${query}`, opts);
    return res.json();
  };

  return (
    <AppContext.Provider value={{
      user, setUser, isAdmin, loading, banned,
      deviceId, socket: socketRef.current,
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
