import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, Alert, Modal, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { SCHOOLS, CLASS_NUMBERS, CLASS_LETTERS } from '../config';
import { Avatar, Btn, Loader } from '../components/UI';

export default function ProfileScreen({ navigation }) {
  const { user, updateProfile, uploadImage, unlockAdmin, isAdmin, school } = useApp();

  const [editing, setEditing]       = useState(false);
  const [nick, setNick]             = useState(user?.nick || '');
  const [classNum, setClassNum]     = useState(user?.class?.replace(/[А-Яа-яA-Za-z]/g, '') || '');
  const [classLet, setClassLet]     = useState(user?.class?.replace(/\d/g, '') || '');
  const [avatarUri, setAvatarUri]   = useState(null);
  const [saving, setSaving]         = useState(false);

  // secret admin panel
  const [adminVisible, setAdminVisible] = useState(false);
  const [adminPass, setAdminPass]       = useState('');
  const [adminError, setAdminError]     = useState(false);

  const currentSchool = SCHOOLS.find(s => s.id === school);

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7
    });
    if (!res.canceled) setAvatarUri(res.assets[0].uri);
  }

  async function save() {
    if (!nick.trim()) { Alert.alert('Введи ник'); return; }
    setSaving(true);
    try {
      let avatar = user?.avatar;
      if (avatarUri) avatar = await uploadImage(avatarUri);
      const cls = classNum && classLet ? `${classNum}${classLet}` : classNum || user?.class;
      await updateProfile({ nick: nick.trim(), class: cls, avatar });
      setEditing(false);
      setAvatarUri(null);
    } finally {
      setSaving(false);
    }
  }

  async function tryAdmin() {
    const success = await unlockAdmin(adminPass);
    if (success) {
      setAdminVisible(false);
      setAdminPass('');
      navigation.navigate('Admin');
    } else {
      setAdminError(true);
      setAdminPass('');
    }
  }

  if (!user) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>👤 Профиль</Text>

        {/* Avatar + school badge */}
        <TouchableOpacity onPress={editing ? pickAvatar : undefined} style={s.avatarWrap} activeOpacity={editing ? 0.7 : 1}>
          <Avatar uri={avatarUri || user.avatar} nick={user.nick} size={84} />
          {editing && (
            <View style={s.editOverlay}>
              <Text style={{ fontSize: 20 }}>📷</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={[s.schoolBadge, { borderColor: currentSchool?.color }]}>
          <Text style={{ fontSize: 12, color: currentSchool?.color, fontWeight: '600' }}>
            {currentSchool?.label}
          </Text>
        </View>

        {editing ? (
          <View style={s.editForm}>
            <Text style={s.label}>Никнейм</Text>
            <TextInput
              style={s.input}
              value={nick}
              onChangeText={setNick}
              placeholder="Никнейм"
              placeholderTextColor={T.textDim}
              maxLength={24}
            />

            <Text style={s.label}>Класс — цифра</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {CLASS_NUMBERS.map(n => (
                <TouchableOpacity key={n} onPress={() => setClassNum(classNum === n ? '' : n)}
                  style={[s.chip, classNum === n && s.chipActive]}>
                  <Text style={[s.chipText, classNum === n && s.chipActiveText]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Буква</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CLASS_LETTERS.map(l => (
                <TouchableOpacity key={l} onPress={() => setClassLet(classLet === l ? '' : l)}
                  style={[s.chip, classLet === l && s.chipActive]}>
                  <Text style={[s.chipText, classLet === l && s.chipActiveText]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Btn label={saving ? 'Сохраняю...' : 'Сохранить'} onPress={save} disabled={saving} />
            <Btn label="Отмена" variant="ghost" onPress={() => { setEditing(false); setAvatarUri(null); }} style={{ marginTop: 8 }} />
          </View>
        ) : (
          <View style={s.infoBlock}>
            <Text style={s.nickname}>{user.nick}</Text>
            {user.class ? <Text style={s.cls}>{user.class} класс</Text> : null}
            <Btn label="✏️ Изменить профиль" onPress={() => {
              setNick(user.nick);
              setClassNum(user.class?.replace(/[А-Яа-яA-Za-z]/g, '') || '');
              setClassLet(user.class?.replace(/\d/g, '') || '');
              setEditing(true);
            }} style={{ marginTop: 16 }} />
          </View>
        )}

        {/* About */}
        <TouchableOpacity onPress={() => navigation.navigate('About')} style={s.navRow}>
          <Text style={s.navLabel}>ℹ️ О приложении</Text>
          <Text style={{ color: T.textSec }}>›</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={[s.navRow, { marginTop: 8 }]}>
            <Text style={[s.navLabel, { color: T.warn }]}>⚙️ Панель управления</Text>
            <Text style={{ color: T.textSec }}>›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Secret "a" button */}
      <TouchableOpacity
        onPress={() => { setAdminError(false); setAdminPass(''); setAdminVisible(true); }}
        style={s.secretBtn}
        activeOpacity={0.6}
      >
        <Text style={{ color: T.textDim, fontSize: 12, fontWeight: '500' }}>a</Text>
      </TouchableOpacity>

      {/* Admin password modal */}
      <Modal visible={adminVisible} animationType="fade" transparent>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setAdminVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={s.passModal}>
            <TextInput
              style={s.passInput}
              value={adminPass}
              onChangeText={v => { setAdminPass(v); setAdminError(false); }}
              placeholder="Пароль"
              placeholderTextColor={T.textDim}
              secureTextEntry
              autoFocus
              onSubmitEditing={tryAdmin}
            />
            {adminError && <Text style={{ color: T.danger, fontSize: 12, textAlign: 'center', marginTop: 6 }}>Неверный пароль</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  container:  { padding: 24, alignItems: 'center', paddingBottom: 100 },
  title:      { color: T.text, fontSize: 22, fontWeight: '800', alignSelf: 'flex-start', marginBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  editOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  schoolBadge: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20,
  },
  infoBlock:  { alignItems: 'center', width: '100%' },
  nickname:   { color: T.text, fontSize: 22, fontWeight: '800' },
  cls:        { color: T.textSec, fontSize: 14, marginTop: 4 },
  editForm:   { width: '100%', marginTop: 16 },
  label:      { color: T.textSec, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input:      { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  chip:       { borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive: { backgroundColor: T.white, borderColor: T.white },
  chipText:   { color: T.textSec, fontSize: 14 },
  chipActiveText: { color: '#000', fontWeight: '700' },
  navRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: T.bgCard, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 14, marginTop: 24 },
  navLabel:   { color: T.text, fontSize: 15, fontWeight: '500' },
  secretBtn:  { position: 'absolute', bottom: 90, left: 20, padding: 8 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  passModal:  { backgroundColor: T.bgCard, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 20, width: 220 },
  passInput:  { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 18, paddingHorizontal: 14, paddingVertical: 12, textAlign: 'center', letterSpacing: 4 },
});
