import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Image, Alert, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { ANNOUNCEMENT_CATEGORIES, SERVER_URL } from '../config';
import { Card, Avatar, Btn, EmptyState, TagPill, Loader } from '../components/UI';

function AnnouncementCard({ item, onDelete, isAdmin, myDeviceId }) {
  const cat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === item.category) || ANNOUNCEMENT_CATEGORIES[5];
  const canDelete = item.deviceId === myDeviceId || isAdmin;

  return (
    <Card style={{ borderLeftWidth: 3, borderLeftColor: cat.color }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 18, marginRight: 6 }}>{cat.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardMeta}>
            {item.userName}
            {item.classId ? ` · ${item.classId}` : ''}
            {item.dateFrom ? ` · ${item.dateFrom}` : ''}
            {item.dateTo ? ` — ${item.dateTo}` : ''}
          </Text>
        </View>
        <Text style={[s.catBadge, { color: cat.color }]}>{cat.label}</Text>
      </View>

      {item.text ? <Text style={s.cardText}>{item.text}</Text> : null}
      {item.image ? (
        <Image source={{ uri: item.image }} style={s.cardImage} resizeMode="cover" />
      ) : null}

      {canDelete && (
        <TouchableOpacity onPress={() => onDelete(item.id)} style={s.deleteBtn}>
          <Text style={{ color: T.danger, fontSize: 12 }}>🗑 Удалить</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

export default function BoardScreen({ navigation }) {
  const { api, uploadImage, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [showNew, setShowNew] = useState(false);

  // new post state
  const [title, setTitle]       = useState('');
  const [text, setText]         = useState('');
  const [category, setCategory] = useState('other');
  const [classId, setClassId]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [imgUri, setImgUri]     = useState(null);
  const [posting, setPosting]   = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api(`/api/announcements?school=${school}`);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  // socket listener
  useEffect(() => {
    // re-fetch on socket events for simplicity
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleDelete(id) {
    Alert.alert('Удалить?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await api(`/api/announcements/${id}`, 'DELETE', {
            admin: isAdmin ? '19376' : undefined
          });
          load();
        }
      }
    ]);
  }

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.75
    });
    if (!res.canceled) setImgUri(res.assets[0].uri);
  }

  async function post() {
    if (!title.trim()) { Alert.alert('Введи заголовок'); return; }
    setPosting(true);
    try {
      let image = null;
      if (imgUri) image = await uploadImage(imgUri);
      const cat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === category);
      await api('/api/announcements', 'POST', {
        school, classId: classId || null, category,
        color: cat?.color || '#888', title: title.trim(),
        text: text.trim() || null, image,
        dateFrom: dateFrom || null, dateTo: dateTo || null
      });
      setTitle(''); setText(''); setClassId(''); setDateFrom(''); setDateTo('');
      setImgUri(null); setCategory('other');
      setShowNew(false);
      load();
    } finally {
      setPosting(false);
    }
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>📢 Доска</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        <TagPill label="Все" active={filter === 'all'} onPress={() => setFilter('all')} />
        {ANNOUNCEMENT_CATEGORIES.map(c => (
          <TagPill key={c.id} label={`${c.emoji} ${c.label}`} active={filter === c.id}
            onPress={() => setFilter(c.id)} color={c.color} />
        ))}
      </ScrollView>

      {loading
        ? <Loader />
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            ListEmptyComponent={<EmptyState emoji="📭" title="Пусто" sub="Будь первым — добавь объявление" />}
            renderItem={({ item }) => (
              <AnnouncementCard
                item={item}
                onDelete={handleDelete}
                isAdmin={isAdmin}
                myDeviceId={deviceId}
              />
            )}
          />
      }

      {/* New announcement modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Новое объявление</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category */}
              <Text style={s.label}>Категория</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {ANNOUNCEMENT_CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[s.catChip, category === c.id && { backgroundColor: c.color }]}
                  >
                    <Text style={{ color: category === c.id ? '#fff' : T.textSec, fontSize: 12 }}>
                      {c.emoji} {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={s.input} placeholder="Заголовок *" placeholderTextColor={T.textDim}
                value={title} onChangeText={setTitle} maxLength={60} />
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Описание (необязательно)" placeholderTextColor={T.textDim}
                value={text} onChangeText={setText} multiline />
              <TextInput style={s.input} placeholder="Класс (напр. 8Б) — необязательно"
                placeholderTextColor={T.textDim} value={classId} onChangeText={setClassId} />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="С (дд.мм)" placeholderTextColor={T.textDim}
                  value={dateFrom} onChangeText={setDateFrom} />
                <TextInput style={[s.input, { flex: 1 }]} placeholder="По (дд.мм)" placeholderTextColor={T.textDim}
                  value={dateTo} onChangeText={setDateTo} />
              </View>

              <TouchableOpacity onPress={pickImage} style={s.imgBtn}>
                <Text style={{ color: T.textSec }}>📷 {imgUri ? 'Фото выбрано ✓' : 'Добавить фото'}</Text>
              </TouchableOpacity>

              <Btn label={posting ? 'Публикую...' : 'Опубликовать'}
                onPress={post} disabled={posting} style={{ marginTop: 8 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: T.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  headerTitle: { color: T.text, fontSize: 22, fontWeight: '800' },
  addBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center' },
  filterRow:   { maxHeight: 44, marginBottom: 4 },
  cardTitle:   { color: T.text, fontSize: 15, fontWeight: '700' },
  cardMeta:    { color: T.textSec, fontSize: 11, marginTop: 2 },
  cardText:    { color: T.text, fontSize: 14, lineHeight: 20, marginTop: 4 },
  cardImage:   { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
  catBadge:    { fontSize: 11, fontWeight: '600' },
  deleteBtn:   { marginTop: 10, alignSelf: 'flex-end' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:       { backgroundColor: T.bgModal, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:  { color: T.text, fontSize: 18, fontWeight: '700' },
  label:       { color: T.textSec, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input:       { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  catChip:     { borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  imgBtn:      { borderRadius: 10, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed', padding: 14, alignItems: 'center', marginBottom: 10 },
});
