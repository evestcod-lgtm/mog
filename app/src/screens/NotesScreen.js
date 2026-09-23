import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Image, Alert, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { SUBJECTS, CLASS_NUMBERS, SERVER_URL } from '../config';
import { Card, Btn, EmptyState, Loader, StarRating } from '../components/UI';

function avgRating(arr) {
  if (!arr || !arr.length) return 0;
  return (arr.reduce((s, r) => s + r.value, 0) / arr.length).toFixed(1);
}

export default function NotesScreen() {
  const { api, uploadImage, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]      = useState([]);
  const [loading, setLoading]  = useState(true);
  const [subjFilter, setSubjFilter] = useState('');
  const [showNew, setShowNew]  = useState(false);
  const [ratingModal, setRatingModal] = useState(null);

  const [subject, setSubject]  = useState('');
  const [classNum, setClassNum] = useState('');
  const [topic, setTopic]      = useState('');
  const [text, setText]        = useState('');
  const [imgUri, setImgUri]    = useState(null);
  const [posting, setPosting]  = useState(false);

  const [myRatings, setMyRatings] = useState({ clarity: 0, completeness: 0, quality: 0 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams({ school });
      if (subjFilter) q.append('subject', subjFilter);
      const data = await api(`/api/notes?${q}`);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [school, subjFilter]);

  useEffect(() => { load(); }, [load]);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8
    });
    if (!res.canceled) setImgUri(res.assets[0].uri);
  }

  async function post() {
    if (!subject) { Alert.alert('Выбери предмет'); return; }
    if (!topic.trim() && !text.trim() && !imgUri) { Alert.alert('Добавь тему или фото конспекта'); return; }
    setPosting(true);
    try {
      let image = null;
      if (imgUri) image = await uploadImage(imgUri);
      await api('/api/notes', 'POST', {
        school, classNum: classNum || null, subject,
        topic: topic.trim() || null, text: text.trim() || null, image
      });
      setSubject(''); setClassNum(''); setTopic(''); setText(''); setImgUri(null);
      setShowNew(false);
      load();
    } finally {
      setPosting(false);
    }
  }

  async function submitRating(noteId) {
    await api(`/api/notes/${noteId}/rate`, 'POST', { ...myRatings });
    setRatingModal(null);
    setMyRatings({ clarity: 0, completeness: 0, quality: 0 });
    load();
  }

  async function deleteNote(id, ownerDeviceId) {
    if (ownerDeviceId !== deviceId && !isAdmin) return;
    Alert.alert('Удалить?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await api(`/api/notes/${id}`, 'DELETE', { admin: isAdmin ? '19376' : undefined });
        load();
      }}
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📚 Конспекты</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        <TouchableOpacity onPress={() => setSubjFilter('')} style={[s.tag, !subjFilter && s.tagActive]}>
          <Text style={[s.tagText, !subjFilter && s.tagTextActive]}>Все</Text>
        </TouchableOpacity>
        {SUBJECTS.map(subj => (
          <TouchableOpacity key={subj} onPress={() => setSubjFilter(subjFilter === subj ? '' : subj)}
            style={[s.tag, subjFilter === subj && s.tagActive]}>
            <Text style={[s.tagText, subjFilter === subj && s.tagTextActive]}>{subj}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading
        ? <Loader />
        : <FlatList
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            ListEmptyComponent={<EmptyState emoji="📓" title="Конспектов нет" sub="Поделись своим конспектом первым!" />}
            renderItem={({ item }) => (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subject}>{item.subject}</Text>
                    {item.topic ? <Text style={s.topic}>{item.topic}</Text> : null}
                    <Text style={s.meta}>
                      {item.userName}
                      {item.userClass ? ` · ${item.userClass}` : ''}
                      {item.classNum ? ` · ${item.classNum} класс` : ''}
                    </Text>
                  </View>
                  {(item.deviceId === deviceId || isAdmin) && (
                    <TouchableOpacity onPress={() => deleteNote(item.id, item.deviceId)}>
                      <Text style={{ color: T.danger }}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {item.text ? <Text style={s.noteText}>{item.text}</Text> : null}
                {item.image ? (
                  <Image source={{ uri: item.image }} style={s.img} resizeMode="cover" />
                ) : null}

                {/* Ratings */}
                <View style={s.ratingsRow}>
                  <View style={s.ratingItem}>
                    <Text style={s.ratingLabel}>📖 Понятность</Text>
                    <Text style={s.ratingVal}>{avgRating(item.ratings?.clarity)} ({item.ratings?.clarity?.length || 0})</Text>
                  </View>
                  <View style={s.ratingItem}>
                    <Text style={s.ratingLabel}>📋 Полнота</Text>
                    <Text style={s.ratingVal}>{avgRating(item.ratings?.completeness)}</Text>
                  </View>
                  <View style={s.ratingItem}>
                    <Text style={s.ratingLabel}>📸 Качество</Text>
                    <Text style={s.ratingVal}>{avgRating(item.ratings?.quality)}</Text>
                  </View>
                </View>

                {item.deviceId !== deviceId && (
                  <TouchableOpacity onPress={() => setRatingModal(item)} style={s.rateBtn}>
                    <Text style={{ color: T.textSec, fontSize: 13 }}>⭐ Оценить</Text>
                  </TouchableOpacity>
                )}
              </Card>
            )}
          />
      }

      {/* Rating modal */}
      <Modal visible={!!ratingModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Оценить конспект</Text>
            <Text style={s.modalSub}>{ratingModal?.topic || ratingModal?.subject}</Text>

            {[
              { key: 'clarity', label: '📖 Понятность' },
              { key: 'completeness', label: '📋 Полнота' },
              { key: 'quality', label: '📸 Качество фото' },
            ].map(({ key, label }) => (
              <View key={key} style={{ marginBottom: 16 }}>
                <Text style={s.label}>{label}</Text>
                <StarRating value={myRatings[key]} onRate={v => setMyRatings(r => ({ ...r, [key]: v }))} />
              </View>
            ))}

            <Btn label="Отправить оценку" onPress={() => submitRating(ratingModal.id)} />
            <Btn label="Отмена" variant="ghost" onPress={() => setRatingModal(null)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      {/* New note modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={s.modalTitle}>Загрузить конспект</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.label}>Предмет</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SUBJECTS.map(subj => (
                  <TouchableOpacity key={subj} onPress={() => setSubject(subject === subj ? '' : subj)}
                    style={[s.chip, subject === subj && s.chipActive]}>
                    <Text style={[s.chipText, subject === subj && s.chipActiveText]}>{subj}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.label}>Класс</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CLASS_NUMBERS.map(n => (
                  <TouchableOpacity key={n} onPress={() => setClassNum(classNum === n ? '' : n)}
                    style={[s.chip, classNum === n && s.chipActive]}>
                    <Text style={[s.chipText, classNum === n && s.chipActiveText]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={s.input} placeholder="Тема (напр. Клетка)" placeholderTextColor={T.textDim}
                value={topic} onChangeText={setTopic} />
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Текст конспекта (необязательно)" placeholderTextColor={T.textDim}
                value={text} onChangeText={setText} multiline />

              <TouchableOpacity onPress={pickImage} style={s.imgBtn}>
                <Text style={{ color: T.textSec }}>📷 {imgUri ? 'Фото выбрано ✓' : 'Добавить фото конспекта'}</Text>
              </TouchableOpacity>

              <Btn label={posting ? 'Загружаю...' : 'Загрузить'} onPress={post} disabled={posting} style={{ marginTop: 8 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  headerTitle: { color: T.text, fontSize: 22, fontWeight: '800' },
  addBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center' },
  filterRow:  { maxHeight: 44, marginBottom: 4 },
  tag:        { borderRadius: 20, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, backgroundColor: T.bgCard },
  tagActive:  { backgroundColor: T.white, borderColor: T.white },
  tagText:    { color: T.textSec, fontSize: 13 },
  tagTextActive: { color: '#000', fontWeight: '700' },
  subject:    { color: T.text, fontSize: 15, fontWeight: '700' },
  topic:      { color: T.accent, fontSize: 13, marginTop: 2 },
  meta:       { color: T.textSec, fontSize: 11, marginTop: 2 },
  noteText:   { color: T.text, fontSize: 14, lineHeight: 20, marginTop: 8 },
  img:        { width: '100%', height: 200, borderRadius: 10, marginTop: 10 },
  ratingsRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  ratingItem: { flex: 1 },
  ratingLabel: { color: T.textSec, fontSize: 10 },
  ratingVal:  { color: T.text, fontSize: 13, fontWeight: '600' },
  rateBtn:    { marginTop: 8, alignSelf: 'flex-end' },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal:      { backgroundColor: T.bgModal, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { color: T.text, fontSize: 18, fontWeight: '700' },
  modalSub:   { color: T.textSec, fontSize: 13, marginTop: 4, marginBottom: 16 },
  label:      { color: T.textSec, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input:      { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  chip:       { borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  chipActive: { backgroundColor: T.white, borderColor: T.white },
  chipText:   { color: T.textSec, fontSize: 13 },
  chipActiveText: { color: '#000', fontWeight: '700' },
  imgBtn:     { borderRadius: 10, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed', padding: 14, alignItems: 'center', marginBottom: 10 },
});
