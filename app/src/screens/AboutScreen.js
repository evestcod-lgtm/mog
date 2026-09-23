import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { T } from '../theme';

export default function AboutScreen({ navigation }) {
  const features = [
    { emoji: '📢', title: 'Доска объявлений', desc: 'Объявления школы по категориям — найдено, потеряно, команды, собрания.' },
    { emoji: '📝', title: 'Что задали?', desc: 'Домашние задания от одноклассников по предметам и датам.' },
    { emoji: '📚', title: 'Конспекты', desc: 'Загружай и оценивай конспекты других учеников.' },
    { emoji: '📋', title: 'Контрольные', desc: 'Фото контрольных работ по предметам и классам.' },
    { emoji: '🍕', title: 'Столовая', desc: 'Меню на сегодня с оценками блюд.' },
    { emoji: '🧠', title: 'Объясни мне', desc: 'Задай вопрос — другие ученики ответят.' },
    { emoji: '🤝', title: 'Найди напарника', desc: 'Ищи партнёра для подготовки к ОГЭ/ЕГЭ.' },
    { emoji: '🗺', title: 'Карта школы', desc: 'Где находятся кабинеты, столовая, туалеты.' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: T.textSec, fontSize: 14 }}>← Назад</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.bigEmoji}>🏫</Text>
        <Text style={s.title}>MOGG School</Text>
        <Text style={s.version}>Версия 1.0</Text>
        <Text style={s.desc}>
          Приложение для учеников школ №4 и №7 в Новом Уренгое.{'\n'}
          Всё необходимое для учёбы — в одном месте.
        </Text>

        <View style={s.divider} />

        <Text style={s.sectionTitle}>Возможности</Text>
        {features.map((f, i) => (
          <View key={i} style={s.feature}>
            <Text style={s.featureEmoji}>{f.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <View style={s.divider} />

        <Text style={s.sectionTitle}>Правила</Text>
        <Text style={s.rule}>• Публикуй только реальную и полезную информацию</Text>
        <Text style={s.rule}>• Уважай других пользователей</Text>
        <Text style={s.rule}>• Не загружай неприемлемый контент</Text>
        <Text style={s.rule}>• Все объявления удаляются автоматически через 20 дней</Text>

        <Text style={s.footer}>MOGG School · Новый Уренгой · 2024</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  header:     { padding: 16 },
  container:  { padding: 24, paddingBottom: 60, alignItems: 'center' },
  bigEmoji:   { fontSize: 56, marginBottom: 12 },
  title:      { color: T.text, fontSize: 28, fontWeight: '800' },
  version:    { color: T.textSec, fontSize: 13, marginTop: 4, marginBottom: 12 },
  desc:       { color: T.textSec, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  divider:    { height: 1, backgroundColor: T.border, width: '100%', marginVertical: 24 },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 16 },
  feature:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14, width: '100%' },
  featureEmoji: { fontSize: 24, width: 32 },
  featureTitle: { color: T.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  featureDesc:  { color: T.textSec, fontSize: 13, lineHeight: 18 },
  rule:       { color: T.textSec, fontSize: 13, alignSelf: 'flex-start', marginBottom: 8, lineHeight: 20 },
  footer:     { color: T.textDim, fontSize: 12, marginTop: 32 },
});
