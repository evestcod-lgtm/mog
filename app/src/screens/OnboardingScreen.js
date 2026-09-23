import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, Alert, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { SCHOOLS, CLASS_NUMBERS, CLASS_LETTERS } from '../config';
import { Btn, Loader } from '../components/UI';

export default function OnboardingScreen() {
  const { register, uploadImage } = useApp();
  const [step, setStep]         = useState(0); // 0=school, 1=profile
  const [school, setSchool]     = useState(null);
  const [nick, setNick]         = useState('');
  const [classNum, setClassNum] = useState('');
  const [classLet, setClassLet] = useState('');
  const [avatar, setAvatar]     = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);
  const [saving, setSaving]     = useState(false);

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7
    });
    if (!res.canceled && res.assets[0]) {
      setAvatarUri(res.assets[0].uri);
    }
  }

  async function save() {
    if (!nick.trim()) { Alert.alert('Введи ник 👤'); return; }
    setSaving(true);
    try {
      let avatarUrl = null;
      if (avatarUri) avatarUrl = await uploadImage(avatarUri);

      const cls = classNum && classLet ? `${classNum}${classLet}` : classNum || null;
      const res = await register({ nick: nick.trim(), class: cls, school: school.id, avatar: avatarUrl });
      if (!res.success) Alert.alert('Ошибка регистрации');
    } catch (e) {
      Alert.alert('Нет связи с сервером', 'Убедись что сервер запущен в Termux');
    } finally {
      setSaving(false);
    }
  }

  if (saving) return <Loader />;

  // STEP 0 — School selection
  if (step === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.container}>
          <Text style={s.bigEmoji}>🏫</Text>
          <Text style={s.title}>MOGG School</Text>
          <Text style={s.sub}>Выбери свою школу</Text>

          <View style={s.schoolGrid}>
            {SCHOOLS.map(sc => (
              <TouchableOpacity
                key={sc.id}
                onPress={() => { setSchool(sc); setStep(1); }}
                activeOpacity={0.8}
                style={[s.schoolCard, { borderColor: sc.color }]}
              >
                <Text style={{ fontSize: 40 }}>{sc.emoji}</Text>
                <Text style={[s.schoolLabel, { color: sc.color }]}>{sc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.hint}>Ты будешь видеть только объявления своей школы</Text>
        </View>
      </SafeAreaView>
    );
  }

  // STEP 1 — Profile setup
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setStep(0)} style={s.back}>
          <Text style={{ color: T.textSec, fontSize: 14 }}>← Назад</Text>
        </TouchableOpacity>

        <Text style={s.title}>Создай профиль</Text>
        <Text style={[s.sub, { color: school?.color }]}>{school?.label}</Text>

        {/* Avatar */}
        <TouchableOpacity onPress={pickAvatar} style={s.avatarPick} activeOpacity={0.8}>
          {avatarUri
            ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
            : (
              <View style={s.avatarPlaceholder}>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>Выбрать фото</Text>
              </View>
            )
          }
        </TouchableOpacity>

        {/* Nick */}
        <View style={s.field}>
          <Text style={s.label}>Никнейм 👤</Text>
          <TextInput
            style={s.input}
            placeholder="Как тебя зовут?"
            placeholderTextColor={T.textDim}
            value={nick}
            onChangeText={setNick}
            maxLength={24}
          />
        </View>

        {/* Class number */}
        <Text style={s.label}>Класс (по желанию)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {CLASS_NUMBERS.map(n => (
            <TouchableOpacity
              key={n}
              onPress={() => setClassNum(classNum === n ? '' : n)}
              style={[s.chip, classNum === n && s.chipActive]}
            >
              <Text style={[s.chipText, classNum === n && s.chipTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Class letter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {CLASS_LETTERS.map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => setClassLet(classLet === l ? '' : l)}
              style={[s.chip, classLet === l && s.chipActive]}
            >
              <Text style={[s.chipText, classLet === l && s.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Btn label="Войти 🚀" onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  container:  { flexGrow: 1, padding: 24, alignItems: 'center' },
  bigEmoji:   { fontSize: 64, marginTop: 20, marginBottom: 8 },
  title:      { color: T.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub:        { color: T.textSec, fontSize: 15, marginTop: 6, marginBottom: 32, textAlign: 'center' },
  schoolGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  schoolCard: {
    flex: 1, backgroundColor: T.bgCard, borderRadius: 16, borderWidth: 2,
    padding: 20, alignItems: 'center', gap: 10,
  },
  schoolLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  hint:        { color: T.textDim, fontSize: 12, textAlign: 'center', marginTop: 16 },
  back:        { alignSelf: 'flex-start', marginBottom: 24 },
  avatarPick:  { marginBottom: 24 },
  avatarImg:   { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  field:    { width: '100%', marginBottom: 16 },
  label:    { color: T.textSec, fontSize: 12, fontWeight: '600', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: 0.5 },
  input:    {
    backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    color: T.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 13, width: '100%',
  },
  chip:      {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border, marginRight: 8,
  },
  chipActive:     { backgroundColor: T.white, borderColor: T.white },
  chipText:       { color: T.textSec, fontSize: 15, fontWeight: '500' },
  chipTextActive: { color: '#000', fontWeight: '700' },
});
