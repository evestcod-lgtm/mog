import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { T } from '../theme';

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ uri, nick, size = 36 }) {
  const letter = nick ? nick[0].toUpperCase() : '?';
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.bgCard }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
      alignItems: 'center', justifyContent: 'center'
    }}>
      <Text style={{ color: T.text, fontSize: size * 0.42, fontWeight: '600' }}>{letter}</Text>
    </View>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ── Btn ──────────────────────────────────────────────────────────────────────
export function Btn({ label, onPress, variant = 'primary', style, disabled }) {
  const bg = variant === 'primary' ? T.white
    : variant === 'danger'   ? T.danger
    : variant === 'warn'     ? T.warn
    : variant === 'ghost'    ? 'transparent'
    : T.bgCard;

  const textColor = variant === 'primary' ? '#000'
    : variant === 'ghost'    ? T.text
    : T.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, style]}
    >
      <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, style, inputStyle, ...props }) {
  return (
    <View style={[styles.inputWrap, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={T.textDim}
        style={[styles.input, inputStyle]}
        {...props}
      />
    </View>
  );
}

// ── StarRating ────────────────────────────────────────────────────────────────
export function StarRating({ value = 0, onRate, max = 5, size = 22 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <TouchableOpacity key={i} onPress={() => onRate && onRate(i + 1)}>
          <Text style={{ fontSize: size, opacity: i < value ? 1 : 0.25 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────
export function Loader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <ActivityIndicator color={T.white} size="large" />
    </View>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
export function EmptyState({ emoji = '📭', title, sub }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
      {title ? <Text style={{ color: T.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{title}</Text> : null}
      {sub ? <Text style={{ color: T.textSec, fontSize: 13, textAlign: 'center', marginTop: 6 }}>{sub}</Text> : null}
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, right }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ── TagPill ────────────────────────────────────────────────────────────────────
export function TagPill({ label, active, onPress, color }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tag,
        active && { backgroundColor: color || T.white, borderColor: color || T.white }
      ]}
    >
      <Text style={[styles.tagText, active && { color: active && color ? T.white : '#000' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── UserRow ────────────────────────────────────────────────────────────────────
export function UserRow({ user, right }) {
  return (
    <View style={styles.userRow}>
      <Avatar uri={user?.avatar} nick={user?.nick} size={32} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ color: T.text, fontSize: 13, fontWeight: '600' }}>{user?.nick || 'Аноним'}</Text>
        {user?.class ? <Text style={{ color: T.textSec, fontSize: 11 }}>{user.class}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.bgCard,
    borderRadius: T.rL,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 10,
  },
  btn: {
    borderRadius: T.r,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inputWrap: {
    marginBottom: 12,
  },
  inputLabel: {
    color: T.textSec,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: T.bgInput,
    borderRadius: T.r,
    borderWidth: 1,
    borderColor: T.border,
    color: T.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: '700',
  },
  tag: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    backgroundColor: T.bgCard,
  },
  tagText: {
    color: T.textSec,
    fontSize: 13,
    fontWeight: '500',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
