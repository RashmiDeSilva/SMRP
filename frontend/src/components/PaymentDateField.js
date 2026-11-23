import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (value) => parseInputDate(value).toLocaleDateString(undefined, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function PaymentDateField({ value, onChange, accentColor = '#6D28D9' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseInputDate(value));
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const leadingDays = monthStart.getDay();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - leadingDays + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const selectedDate = value || toInputDate(new Date());

  const openPicker = () => {
    setVisibleMonth(parseInputDate(value));
    setIsOpen(true);
  };

  const changeMonth = (offset) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const selectDay = (day) => {
    onChange(toInputDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)));
    setIsOpen(false);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
        What date is this payment for?
      </Text>
      {Platform.OS === 'web' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 10, paddingHorizontal: 10 }}>
          <Feather name="calendar" size={16} color={accentColor} style={{ marginRight: 8 }} />
          <input
            aria-label="What date is this payment for?"
            type="date"
            value={selectedDate}
            onChange={(event) => onChange(event.target.value)}
            style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', padding: '10px 0', fontSize: 13, fontFamily: 'inherit', color: '#1E293B' }}
          />
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={openPicker}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 10, padding: 11 }}
          >
            <Feather name="calendar" size={16} color={accentColor} style={{ marginRight: 9 }} />
            <Text style={{ flex: 1, color: '#1E293B', fontSize: 13, fontWeight: '600' }}>{formatDisplayDate(selectedDate)}</Text>
            <Feather name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
          <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
            <View style={styles.modalBackdrop}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsOpen(false)} />
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => changeMonth(-1)} accessibilityLabel="Previous month" style={styles.monthArrow}>
                    <Feather name="chevron-left" size={20} color={accentColor} />
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} accessibilityLabel="Next month" style={styles.monthArrow}>
                    <Feather name="chevron-right" size={20} color={accentColor} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarGrid}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((weekday) => (
                    <Text key={weekday} style={styles.weekday}>{weekday}</Text>
                  ))}
                  {calendarCells.map((day, index) => {
                    const dateValue = day ? toInputDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)) : '';
                    const isSelected = dateValue === selectedDate;
                    return (
                      <TouchableOpacity
                        key={`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}-${index}`}
                        disabled={!day}
                        onPress={() => selectDay(day)}
                        style={[styles.dayCell, isSelected && { backgroundColor: accentColor }]}
                      >
                        <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day || ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                  <Text style={{ color: accentColor, fontWeight: '800' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  calendarCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthArrow: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  monthTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 8, color: '#64748B', fontSize: 11, fontWeight: '800' },
  dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  dayText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  selectedDayText: { color: '#FFFFFF', fontWeight: '900' },
  closeButton: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 8, paddingHorizontal: 10 },
});
