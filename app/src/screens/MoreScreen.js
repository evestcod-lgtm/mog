import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Image, Alert, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { T } from '../theme';
import { useApp } from '../context/AppContext';
import { SUBJECTS, CLASS_NUMBERS, LEVELS } from '../config';
import { Card, Btn, EmptyState, Loader, StarRating } from '../components/UI';

// ──────────────────────────────────────────────────────────────────────────────
// CANTEEN
// ──────────────────────────────────────────────────────────────────────────────
function CanteenTab() {
  const { api, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [date, setDate]     = useState('');
  const [menuText, setMenuText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api(`/api/canteen?school=${school}`);
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  async function post() {
    if (!menuText.trim()) { Alert.alert('Введи меню'); return; }
    setPosting(true);
    try {
      const today = new Date().toLocaleDateString('ru-RU');
      const menuItems = menuText.split('\n').filter(l => l.trim()).map(l => l.trim());
      await api('/api/canteen', 'POST', { school, date: date || today, menuItems });
      setMenuText(''); setDate(''); setShowNew(false); load();
    } finally { setPosting(false); }
  }

  async function rate(menuId, itemName, value) {
    await api(`/api/canteen/${menuId}/rate`, 'POST', { itemName, value });
    load();
  }

  const FOOD_EMOJIS = { 'Суп': '🍲', 'Курица': '🍗', 'Рыба': '🐟', 'Каша': '🥣', 'Компот': '🧃', 'Салат': '🥗', 'Хлеб': '🍞', 'Яблоко': '🍎' };
  function foodEmoji(name) {
    for (const [k, e] of Object.entries(FOOD_EMOJIS)) if (name.includes(k)) return e;
    return '🍽';
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s2.subHeader}>
        <Text style={s2.subTitle}>🍕 Столовая</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s2.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<EmptyState emoji="🍽" title="Меню не добавлено" sub="Добавь сегодняшнее меню" />}
          renderItem={({ item }) => (
            <Card>
              <Text style={s2.menuDate}>{item.date} · от {item.userName}</Text>
              {item.menuItems.map((mi, idx) => {
                const avgR = item.ratings?.[mi]?.length
                  ? (item.ratings[mi].reduce((s, r) => s + r.value, 0) / item.ratings[mi].length).toFixed(1)
                  : null;
                return (
                  <View key={idx} style={s2.menuRow}>
                    <Text style={s2.menuItem}>{foodEmoji(mi)} {mi}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {avgR ? <Text style={{ color: T.warn, fontSize: 13 }}>⭐{avgR}</Text> : null}
                      <TouchableOpacity onPress={() => Alert.prompt ? null : rate(item.id, mi, 5)}>
                        <Text style={{ color: T.textSec, fontSize: 12 }}>Оценить</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        />
      )}

      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s2.overlay}>
          <View style={s2.modal}>
            <View style={s2.mh}>
              <Text style={s2.mt}>Добавить меню</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}><Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <TextInput style={s2.input} placeholder={`Дата (${new Date().toLocaleDateString('ru-RU')})`} placeholderTextColor={T.textDim} value={date} onChangeText={setDate} />
            <TextInput
              style={[s2.input, { height: 120, textAlignVertical: 'top' }]}
              placeholder={'Суп\nКурица с рисом\nСалат\nЯблоко\n...'} placeholderTextColor={T.textDim}
              value={menuText} onChangeText={setMenuText} multiline
            />
            <Btn label={posting ? 'Добавляю...' : 'Добавить'} onPress={post} disabled={posting} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TESTS (контрольные)
// ──────────────────────────────────────────────────────────────────────────────
function TestsTab() {
  const { api, uploadImage, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [classNum, setClassNum] = useState('');
  const [date, setDate]     = useState('');
  const [imgUri, setImgUri] = useState(null);
  const [text, setText]     = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data = await api(`/api/tests?school=${school}`); setItems(Array.isArray(data) ? data : []); }
    finally { setLoading(false); }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!res.canceled) setImgUri(res.assets[0].uri);
  }

  async function post() {
    if (!subject || !classNum) { Alert.alert('Выбери предмет и класс'); return; }
    setPosting(true);
    try {
      let image = null;
      if (imgUri) image = await uploadImage(imgUri);
      const today = new Date().toLocaleDateString('ru-RU');
      await api('/api/tests', 'POST', { school, classNum, subject, date: date || today, image, text: text || null });
      setSubject(''); setClassNum(''); setDate(''); setImgUri(null); setText('');
      setShowNew(false); load();
    } finally { setPosting(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s2.subHeader}>
        <Text style={s2.subTitle}>📋 Контрольные</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s2.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>
      {loading ? <Loader /> : (
        <FlatList
          data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<EmptyState emoji="📝" title="Контрольных нет" sub="Поделись фото контрольной" />}
          renderItem={({ item }) => (
            <Card>
              <Text style={s2.itmTitle}>{item.subject} · {item.classNum} класс</Text>
              <Text style={s2.itmMeta}>{item.date} · {item.userName}</Text>
              {item.text ? <Text style={{ color: T.text, fontSize: 14, marginTop: 6 }}>{item.text}</Text> : null}
              {item.image ? <Image source={{ uri: item.image }} style={{ width: '100%', height: 200, borderRadius: 10, marginTop: 8 }} resizeMode="cover" /> : null}
              {(item.deviceId === deviceId || isAdmin) && (
                <TouchableOpacity onPress={() => api(`/api/tests/${item.id}`, 'DELETE', { admin: isAdmin ? '19376' : undefined }).then(load)} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
                  <Text style={{ color: T.danger, fontSize: 12 }}>🗑 Удалить</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        />
      )}

      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s2.overlay}>
          <View style={s2.modal}>
            <View style={s2.mh}>
              <Text style={s2.mt}>Загрузить контрольную</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}><Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s2.lbl}>Предмет</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SUBJECTS.map(subj => (
                  <TouchableOpacity key={subj} onPress={() => setSubject(subject === subj ? '' : subj)} style={[s2.chip, subject === subj && s2.chipA]}>
                    <Text style={[{ color: T.textSec, fontSize: 13 }, subject === subj && { color: '#000', fontWeight: '700' }]}>{subj}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s2.lbl}>Класс (без буквы)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CLASS_NUMBERS.map(n => (
                  <TouchableOpacity key={n} onPress={() => setClassNum(classNum === n ? '' : n)} style={[s2.chip, classNum === n && s2.chipA]}>
                    <Text style={[{ color: T.textSec, fontSize: 15 }, classNum === n && { color: '#000', fontWeight: '700' }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={s2.input} placeholder={`Дата (${new Date().toLocaleDateString('ru-RU')})`} placeholderTextColor={T.textDim} value={date} onChangeText={setDate} />
              <TouchableOpacity onPress={pickImage} style={s2.imgBtn}>
                <Text style={{ color: T.textSec }}>📷 {imgUri ? 'Фото выбрано ✓' : 'Фото контрольной'}</Text>
              </TouchableOpacity>
              <TextInput style={[s2.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Комментарий (необязательно)" placeholderTextColor={T.textDim} value={text} onChangeText={setText} multiline />
              <Btn label={posting ? 'Загружаю...' : 'Загрузить'} onPress={post} disabled={posting} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPLAIN (объясни мне)
// ──────────────────────────────────────────────────────────────────────────────
function ExplainTab() {
  const { api, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [sendingAnswer, setSendingAnswer] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data = await api(`/api/explain?school=${school}`); setItems(Array.isArray(data) ? data : []); }
    finally { setLoading(false); }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  async function post() {
    if (!question.trim()) { Alert.alert('Напиши вопрос'); return; }
    setPosting(true);
    try {
      await api('/api/explain', 'POST', { school, subject: subject || 'Другое', question: question.trim() });
      setSubject(''); setQuestion(''); setShowNew(false); load();
    } finally { setPosting(false); }
  }

  async function sendAnswer(id) {
    if (!answerText.trim()) return;
    setSendingAnswer(true);
    try {
      await api(`/api/explain/${id}/answer`, 'POST', { text: answerText.trim() });
      setAnswerText('');
      load();
    } finally { setSendingAnswer(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s2.subHeader}>
        <Text style={s2.subTitle}>🧠 Объясни мне</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s2.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>
      {loading ? <Loader /> : (
        <FlatList
          data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<EmptyState emoji="🤔" title="Нет вопросов" sub="Задай первый вопрос — другие помогут" />}
          renderItem={({ item }) => (
            <Card>
              <TouchableOpacity onPress={() => setExpanded(expanded === item.id ? null : item.id)}>
                <Text style={s2.itmTitle}>{item.question}</Text>
                <Text style={s2.itmMeta}>{item.subject} · {item.userName} · {item.answers?.length || 0} ответов</Text>
              </TouchableOpacity>

              {expanded === item.id && (
                <View style={{ marginTop: 12 }}>
                  {item.answers?.map(a => (
                    <View key={a.id} style={{ backgroundColor: T.bgInput, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <Text style={{ color: T.textSec, fontSize: 11, marginBottom: 4 }}>{a.userName}</Text>
                      <Text style={{ color: T.text, fontSize: 14 }}>{a.text}</Text>
                      {a.image ? <Image source={{ uri: a.image }} style={{ width: '100%', height: 150, borderRadius: 8, marginTop: 6 }} resizeMode="cover" /> : null}
                    </View>
                  ))}

                  {item.deviceId !== deviceId && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TextInput
                        style={[s2.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Твой ответ..."
                        placeholderTextColor={T.textDim}
                        value={answerText}
                        onChangeText={setAnswerText}
                      />
                      <TouchableOpacity
                        onPress={() => sendAnswer(item.id)}
                        style={{ backgroundColor: T.white, borderRadius: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#000', fontWeight: '700' }}>→</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </Card>
          )}
        />
      )}

      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s2.overlay}>
          <View style={s2.modal}>
            <View style={s2.mh}>
              <Text style={s2.mt}>Задать вопрос</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}><Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={s2.lbl}>Предмет</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {SUBJECTS.map(subj => (
                <TouchableOpacity key={subj} onPress={() => setSubject(subject === subj ? '' : subj)} style={[s2.chip, subject === subj && s2.chipA]}>
                  <Text style={[{ color: T.textSec, fontSize: 13 }, subject === subj && { color: '#000', fontWeight: '700' }]}>{subj}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[s2.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Я не понимаю, как решать квадратные уравнения..."
              placeholderTextColor={T.textDim} value={question} onChangeText={setQuestion} multiline
            />
            <Btn label={posting ? 'Отправляю...' : 'Задать вопрос'} onPress={post} disabled={posting} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PARTNER (найди напарника)
// ──────────────────────────────────────────────────────────────────────────────
function PartnerTab() {
  const { api, user, deviceId, isAdmin, school } = useApp();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [grade, setGrade]   = useState('');
  const [level, setLevel]   = useState('');
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);
  const [meetModal, setMeetModal] = useState(null);
  const [meetPlace, setMeetPlace] = useState('');

  const load = useCallback(async () => {
    try { setLoading(true); const data = await api(`/api/partners?school=${school}`); setItems(Array.isArray(data) ? data : []); }
    finally { setLoading(false); }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  async function post() {
    if (!subject || !level) { Alert.alert('Выбери предмет и уровень'); return; }
    setPosting(true);
    try {
      await api('/api/partners', 'POST', { school, subject, grade, level, description: description.trim() });
      setSubject(''); setGrade(''); setLevel(''); setDescription(''); setShowNew(false); load();
    } finally { setPosting(false); }
  }

  async function meet(partnerId) {
    if (!meetPlace.trim()) { Alert.alert('Укажи место встречи'); return; }
    await api(`/api/partners/${partnerId}/meet`, 'POST', { place: meetPlace.trim() });
    setMeetModal(null); setMeetPlace(''); load();
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s2.subHeader}>
        <Text style={s2.subTitle}>🤝 Напарник</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={s2.addBtn}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>
      {loading ? <Loader /> : (
        <FlatList
          data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<EmptyState emoji="🤝" title="Никто не ищет" sub="Предложи подготовку первым" />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s2.itmTitle}>{item.subject}</Text>
                  <Text style={s2.itmMeta}>{item.userName} · {item.userClass} · {item.level}</Text>
                  {item.grade ? <Text style={{ color: T.textSec, fontSize: 12 }}>ОГЭ/ЕГЭ: {item.grade}</Text> : null}
                  {item.description ? <Text style={{ color: T.text, fontSize: 13, marginTop: 4 }}>{item.description}</Text> : null}
                </View>
                {item.deviceId !== deviceId && (
                  <TouchableOpacity onPress={() => setMeetModal(item)} style={{ backgroundColor: T.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>Встретиться</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
        />
      )}

      <Modal visible={showNew} animationType="slide" transparent>
        <View style={s2.overlay}>
          <View style={s2.modal}>
            <View style={s2.mh}>
              <Text style={s2.mt}>Найти напарника</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}><Text style={{ color: T.textSec, fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s2.lbl}>Предмет</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SUBJECTS.map(subj => (
                  <TouchableOpacity key={subj} onPress={() => setSubject(subject === subj ? '' : subj)} style={[s2.chip, subject === subj && s2.chipA]}>
                    <Text style={[{ color: T.textSec, fontSize: 13 }, subject === subj && { color: '#000', fontWeight: '700' }]}>{subj}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s2.lbl}>Уровень</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {LEVELS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setLevel(level === l ? '' : l)} style={[s2.chip, level === l && s2.chipA, { flex: 1, alignItems: 'center' }]}>
                    <Text style={[{ color: T.textSec, fontSize: 13 }, level === l && { color: '#000', fontWeight: '700' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s2.input} placeholder="ОГЭ / ЕГЭ / Просто" placeholderTextColor={T.textDim} value={grade} onChangeText={setGrade} />
              <TextInput style={[s2.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Доп. информация..." placeholderTextColor={T.textDim} value={description} onChangeText={setDescription} multiline />
              <Btn label={posting ? 'Ищу...' : 'Разместить'} onPress={post} disabled={posting} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!meetModal} animationType="slide" transparent>
        <View style={s2.overlay}>
          <View style={s2.modal}>
            <Text style={s2.mt}>Место встречи</Text>
            <Text style={{ color: T.textSec, fontSize: 13, marginTop: 4, marginBottom: 16 }}>Напиши, где встретиться с {meetModal?.userName}</Text>
            <TextInput style={s2.input} placeholder="Кабинет 204 / Библиотека / ..." placeholderTextColor={T.textDim} value={meetPlace} onChangeText={setMeetPlace} />
            <Btn label="Встретиться 🤝" onPress={() => meet(meetModal?.id)} />
            <Btn label="Отмена" variant="ghost" onPress={() => setMeetModal(null)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAP (карта школы)
// ──────────────────────────────────────────────────────────────────────────────
function MapTab({ school }) {
  const rooms4 = [
    { name: '🚻 Туалет (1 эт.)', loc: 'Первый этаж, крыло А' },
    { name: '🍽 Столовая', loc: 'Первый этаж, центр' },
    { name: '📚 Библиотека', loc: 'Второй этаж, правое крыло' },
    { name: '🏀 Спортзал', loc: 'Первый этаж, крыло Б' },
    { name: '🧪 Химия (кб. 204)', loc: 'Второй этаж' },
    { name: '🔬 Биология (кб. 206)', loc: 'Второй этаж' },
    { name: '💻 Информатика (кб. 301)', loc: 'Третий этаж' },
    { name: '🎨 ИЗО (кб. 108)', loc: 'Первый этаж' },
    { name: '🚪 Медпункт', loc: 'Первый этаж, вход' },
    { name: '👔 Администрация', loc: 'Второй этаж, центр' },
  ];
  const rooms7 = [
    { name: '🚻 Туалет (1 эт.)', loc: 'Первый этаж' },
    { name: '🍽 Столовая', loc: 'Цокольный этаж' },
    { name: '📚 Библиотека', loc: 'Второй этаж' },
    { name: '🏀 Спортзал', loc: 'Отдельный блок' },
    { name: '🧪 Химия (кб. 305)', loc: 'Третий этаж' },
    { name: '🔬 Биология (кб. 307)', loc: 'Третий этаж' },
    { name: '💻 Информатика (кб. 201)', loc: 'Второй этаж' },
    { name: '🎨 ИЗО (кб. 104)', loc: 'Первый этаж' },
    { name: '🚪 Медпункт', loc: 'Первый этаж' },
    { name: '👔 Администрация', loc: 'Второй этаж' },
  ];

  const rooms = school === 'n4' ? rooms4 : rooms7;
  const label = school === 'n4' ? 'МБОУ СОШ №4' : 'МБОУ СОШ №7';

  return (
    <View style={{ flex: 1 }}>
      <View style={s2.subHeader}>
        <Text style={s2.subTitle}>🏫 Карта школы</Text>
      </View>
      <Text style={{ color: T.textSec, fontSize: 13, paddingHorizontal: 16, marginBottom: 12 }}>
        {label} · Новый Уренгой
      </Text>
      <FlatList
        data={rooms}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.text, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: T.textSec, fontSize: 13, marginTop: 2 }}>{item.loc}</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN MoreScreen with internal tab bar
// ──────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'canteen',  label: '🍕 Столовая' },
  { id: 'tests',   label: '📋 Контрольные' },
  { id: 'explain', label: '🧠 Объясни' },
  { id: 'partner', label: '🤝 Напарник' },
  { id: 'map',     label: '🗺 Карта' },
];

export default function MoreScreen() {
  const { school } = useApp();
  const [tab, setTab] = useState('canteen');

  return (
    <SafeAreaView style={s2.safe}>
      {/* Internal tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s2.tabBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[s2.tabBtn, tab === t.id && s2.tabBtnActive]}
          >
            <Text style={[s2.tabLabel, tab === t.id && s2.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'canteen' && <CanteenTab />}
      {tab === 'tests'   && <TestsTab />}
      {tab === 'explain' && <ExplainTab />}
      {tab === 'partner' && <PartnerTab />}
      {tab === 'map'     && <MapTab school={school} />}
    </SafeAreaView>
  );
}

const s2 = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: T.bg },
  tabBar:  { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: T.border },
  tabBtn:  { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: T.white },
  tabLabel: { color: T.textSec, fontSize: 13, fontWeight: '500' },
  tabLabelActive: { color: T.white, fontWeight: '700' },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  subTitle:  { color: T.text, fontSize: 20, fontWeight: '800' },
  addBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center' },
  itmTitle:  { color: T.text, fontSize: 15, fontWeight: '700' },
  itmMeta:   { color: T.textSec, fontSize: 12, marginTop: 2 },
  menuDate:  { color: T.textSec, fontSize: 12, marginBottom: 8 },
  menuRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.borderSoft },
  menuItem:  { color: T.text, fontSize: 15 },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal:     { backgroundColor: T.bgModal, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  mh:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  mt:        { color: T.text, fontSize: 18, fontWeight: '700' },
  lbl:       { color: T.textSec, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input:     { backgroundColor: T.bgInput, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  chip:      { borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  chipA:     { backgroundColor: T.white, borderColor: T.white },
  imgBtn:    { borderRadius: 10, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed', padding: 14, alignItems: 'center', marginBottom: 10 },
});
