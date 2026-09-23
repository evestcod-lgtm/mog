import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Alert, SafeAreaView
} from 'react-native';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { SUBJECTS } from '../config';
import { Card, Avatar, Btn, EmptyState, TagPill, Loader } from '../components/UI';

export default function HomeworkScreen() {
  const { api, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [subject, setSubject] = useState('');
  const [classId, setClassId] = useState(user?.class || '');
  const [date, setDate]       = useState('');
  const [tasks, setTasks]     = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams({ school });
      if (subjectFilter) q.append('subject', subjectFilter);
      const data = await api(`/api/homework?${q}`);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [school, subjectFilter]);

  useEffect(() => { load(); }, [load]);

  async function deleteItem(id, ownerDeviceId) {
    if (ownerDeviceId !== deviceId && !isAdmin) return;
    Alert.alert('Удалить?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await api(`/api/homework/${id}`, 'DELETE', { admin: isAdmin ? '19376' : undefined });
          load();
        }
      }
    ]);
  }

  async function post() {
    if (!subject) { Alert.alert('Выбери предмет'); return; }
    if (!tasks.trim()) { Alert.alert('Введи задание'); return; }
    setPosting(true);
    try {
      const today = new Date().toLocaleDateString('ru-RU');
      await api('/api/homework', 'POST', {
        school, classId: classId || null, subject,
        date: date || today, tasks: tasks.trim()
      });
      setSubject(''); setTasks(''); setDate('');
      setShowNew(false);
      load();
    } finally {
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📝 Что задали?</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Subject filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        <TagPill label="Все" active={!subjectFilter} onPress={() => setSubjectFilter('')} />
        {SUBJECTS.slice(0, 8).map(subj => (
          <TagPill key={subj} label={subj} active={subjectFilter === subj}
            onPress={() => setSubjectFilter(subjectFilter === subj ? '' : subj)} />
        ))}
      </ScrollView>

      {loading
        ? <Loader />
        : <FlatList
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            ListEmptyComponent={<EmptyState emoji="📚" title="Пусто" sub="Добавь домашнее задание первым" />}
            renderItem={({ item }) => (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subject}>{item.subject}</Text>
                    <Text style={s.meta}>
                      {item.classId ? `${item.classId} · ` : ''}
                      {item.date} · {item.userName}
                    </Text>
                  </View>
                  {(item.deviceId === deviceId || isAdmin) && (
                    <TouchableOpacity onPress={() => deleteItem(item.id, item.deviceId)}>
                      <Text style={{ color: T.danger, fontSize: 13 }}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={s.divider} />
                <Text style={s.tasks}>{item.tasks}</Text>
              </Card>
            )}
          />
      }

      {/* New HW modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Добавить ДЗ</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.label}>Предмет</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SUBJECTS.map(subj => (
                  <TouchableOpacity key={subj}
                    onPress={() => setSubject(subject === subj ? '' : subj)}
                    style={[s.chip, subject === subj && s.chipActive]}>
                    <Text style={[s.chipText, subject === subj && s.chipActiveText]}>{subj}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={s.input} placeholder="Класс (напр. 8Б)"
                placeholderTextColor={T.textDim} value={classId} onChangeText={setClassId} />
              <TextInput style={s.input} placeholder={`Дата (${new Date().toLocaleDateString('ru-RU')})`}
                placeholderTextColor={T.textDim} value={date} onChangeText={setDate} />
              <TextInput
                style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Задание: №234, 235&#10;Подготовить §12..."
                placeholderTextColor={T.textDim}
                value={tasks} onChangeText={setTasks} multiline
              />
              <Btn label={posting ? 'Добавляю...' : 'Добавить'} onPress={post} disabled={posting} />
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
  subject:    { color: T.text, fontSize: 16, fontWeight: '700' },
  meta:       { color: T.textSec, fontSize: 12, marginTop: 2 },
  divider:    { height: 1, backgroundColor: T.border, marginVertical: 10 },
  tasks:      { color: T.text, fontSize: 14, lineHeight: 22 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:      { backgroundColor: T.bgModal, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: T.text, fontSize: 18, fontWeight: '700' },
  label:      { color: T.textSec, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input:      { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  chip:       { borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  chipActive: { backgroundColor: T.white, borderColor: T.white },
  chipText:   { color: T.textSec, fontSize: 13 },
  chipActiveText: { color: '#000', fontWeight: '700' },
});
