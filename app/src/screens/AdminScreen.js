import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Alert, SafeAreaView
} from 'react-native';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { Avatar, Card, Btn, Loader, EmptyState } from '../components/UI';

const TABS = ['Пользователи', 'Контент'];

export default function AdminScreen({ navigation }) {
  const { adminApi, api } = useApp();
  const [tab, setTab]         = useState(0);
  const [users, setUsers]     = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editNick, setEditNick] = useState('');
  const [saving, setSaving]   = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('/api/admin/users');
      if (data.success) setUsers(data.users);
    } finally { setLoading(false); }
  }, []);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('/api/admin/all-content');
      if (data.success) {
        const all = [
          ...data.announcements.map(i => ({ ...i, type: '📢 Объявление' })),
          ...data.homework.map(i => ({ ...i, type: '📝 ДЗ', title: `${i.subject} · ${i.date}` })),
          ...data.notes.map(i => ({ ...i, type: '📚 Конспект', title: `${i.subject}: ${i.topic || '—'}` })),
          ...data.tests.map(i => ({ ...i, type: '📋 Контрольная', title: `${i.subject} ${i.classNum}кл` })),
        ].sort((a, b) => b.createdAt - a.createdAt);
        setContent(all);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 0) loadUsers();
    else loadContent();
  }, [tab]);

  async function warn(user) {
    Alert.prompt
      ? Alert.prompt('Предупреждение', `Причина для ${user.nick}?`, async (reason) => {
          if (reason === null) return;
          const data = await adminApi('/api/admin/warn', 'POST', { deviceId: user.deviceId, reason: reason || '' });
          Alert.alert(
            data.banned ? '🚫 Заблокирован' : `⚠️ Предупреждение ${data.warnCount}/3`,
            data.banned ? `${user.nick} заблокирован` : `${user.nick} получил предупреждение`
          );
          loadUsers();
        })
      : Alert.alert('Предупреждение', `Выдать warn пользователю ${user.nick}?`, [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Warn', style: 'destructive', onPress: async () => {
            const data = await adminApi('/api/admin/warn', 'POST', { deviceId: user.deviceId, reason: 'Нарушение правил' });
            Alert.alert(data.banned ? '🚫 Заблокирован' : `⚠️ ${data.warnCount}/3 warnings`);
            loadUsers();
          }}
        ]);
  }

  async function unban(user) {
    Alert.alert('Разблокировать?', user.nick, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Разблокировать', onPress: async () => {
        await adminApi('/api/admin/unban', 'POST', { deviceId: user.deviceId });
        loadUsers();
      }}
    ]);
  }

  async function saveUser() {
    if (!editNick.trim()) return;
    setSaving(true);
    try {
      await adminApi(`/api/admin/user/${editUser.id}`, 'PUT', { nick: editNick.trim() });
      setEditUser(null); loadUsers();
    } finally { setSaving(false); }
  }

  async function deleteContent(item) {
    const endpointMap = {
      '📢 Объявление':  `/api/announcements/${item.id}`,
      '📝 ДЗ':         `/api/homework/${item.id}`,
      '📚 Конспект':   `/api/notes/${item.id}`,
      '📋 Контрольная': `/api/tests/${item.id}`,
    };
    const ep = endpointMap[item.type];
    if (!ep) return;
    Alert.alert('Удалить?', item.title || item.question, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await api(ep, 'DELETE', { admin: '19376' });
        loadContent();
      }}
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: T.textSec, fontSize: 14 }}>← Назад</Text>
        </TouchableOpacity>
        <Text style={s.title}>⚙️ Управление</Text>
        <TouchableOpacity onPress={() => tab === 0 ? loadUsers() : loadContent()}>
          <Text style={{ color: T.textSec, fontSize: 14 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} onPress={() => setTab(i)} style={[s.tabBtn, tab === i && s.tabActive]}>
            <Text style={[s.tabText, tab === i && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Loader /> : (
        <>
          {/* USERS tab */}
          {tab === 0 && (
            <FlatList
              data={users}
              keyExtractor={u => u.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
              ListEmptyComponent={<EmptyState emoji="👥" title="Нет пользователей" />}
              renderItem={({ item: u }) => (
                <Card style={{ opacity: u.banned ? 0.5 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar uri={u.avatar} nick={u.nick} size={40} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: T.text, fontSize: 15, fontWeight: '700' }}>{u.nick}</Text>
                        {u.banned && <Text style={{ color: T.danger, fontSize: 11 }}>🚫 БАН</Text>}
                        {!u.banned && u.warns > 0 && (
                          <Text style={{ color: T.warn, fontSize: 11 }}>⚠️ {u.warns}/3</Text>
                        )}
                      </View>
                      <Text style={{ color: T.textSec, fontSize: 12 }}>
                        {u.class ? `${u.class} · ` : ''}{u.school}
                      </Text>
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    {/* Edit profile */}
                    <TouchableOpacity
                      onPress={() => { setEditUser(u); setEditNick(u.nick); }}
                      style={s.actionBtn}
                    >
                      <Text style={{ color: T.info, fontSize: 12, fontWeight: '600' }}>✏️ Изменить</Text>
                    </TouchableOpacity>

                    {/* Warn */}
                    {!u.banned && (
                      <TouchableOpacity onPress={() => warn(u)} style={s.actionBtn}>
                        <Text style={{ color: T.warn, fontSize: 12, fontWeight: '600' }}>⚠️ Warn</Text>
                      </TouchableOpacity>
                    )}

                    {/* Unban */}
                    {u.banned && (
                      <TouchableOpacity onPress={() => unban(u)} style={s.actionBtn}>
                        <Text style={{ color: T.success, fontSize: 12, fontWeight: '600' }}>✓ Разбан</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              )}
            />
          )}

          {/* CONTENT tab */}
          {tab === 1 && (
            <FlatList
              data={content}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
              ListEmptyComponent={<EmptyState emoji="📭" title="Контента нет" />}
              renderItem={({ item }) => (
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: T.textSec, fontSize: 11, marginBottom: 2 }}>{item.type}</Text>
                      <Text style={{ color: T.text, fontSize: 14, fontWeight: '600' }}>
                        {item.title || item.question || '—'}
                      </Text>
                      <Text style={{ color: T.textSec, fontSize: 11, marginTop: 2 }}>{item.userName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteContent(item)} style={s.delBtn}>
                      <Text style={{ color: T.danger, fontSize: 13 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            />
          )}
        </>
      )}

      {/* Edit user modal */}
      <Modal visible={!!editUser} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Изменить профиль</Text>
            <Text style={{ color: T.textSec, fontSize: 13, marginBottom: 12 }}>{editUser?.nick}</Text>
            <TextInput
              style={s.input}
              value={editNick}
              onChangeText={setEditNick}
              placeholder="Новый ник"
              placeholderTextColor={T.textDim}
              autoFocus
            />
            <Btn label={saving ? 'Сохраняю...' : 'Сохранить'} onPress={saveUser} disabled={saving} />
            <Btn label="Отмена" variant="ghost" onPress={() => setEditUser(null)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title:      { color: T.text, fontSize: 18, fontWeight: '800' },
  tabBar:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border },
  tabBtn:     { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:  { borderBottomColor: T.white },
  tabText:    { color: T.textSec, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: T.white, fontWeight: '700' },
  actionRow:  { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  delBtn:     { padding: 6 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  modal:      { backgroundColor: T.bgModal, borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { color: T.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  input:      { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
});
