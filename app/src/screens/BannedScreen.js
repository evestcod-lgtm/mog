import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { T } from '../theme';

export default function BannedScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.emoji}>🚫</Text>
        <Text style={s.title}>Доступ ограничен</Text>
        <Text style={s.sub}>
          Твой аккаунт заблокирован за нарушение правил сообщества.
        </Text>
        <View style={s.card}>
          <Text style={s.rule}>📋 Правила MOGG School:</Text>
          <Text style={s.ruleItem}>• Уважай других учеников</Text>
          <Text style={s.ruleItem}>• Публикуй только реальную информацию</Text>
          <Text style={s.ruleItem}>• Никакого неприемлемого контента</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji:     { fontSize: 64, marginBottom: 16 },
  title:     { color: T.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  sub:       { color: T.textSec, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  card:      { backgroundColor: T.bgCard, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 20, width: '100%' },
  rule:      { color: T.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  ruleItem:  { color: T.textSec, fontSize: 14, marginBottom: 8, lineHeight: 20 },
});
