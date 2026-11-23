import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getBookingViewPreferences, saveBookingViewPreferences } from '../utils/sessionStorage';

export function useBookingViewPreferences(user) {
  const userKey = String(user?.email || user?._id || user?.id || '').trim().toLowerCase();
  const [preferences, setPreferences] = useState(() => getBookingViewPreferences(user));
  const [clearNotice, setClearNotice] = useState(null);

  useEffect(() => {
    setPreferences(getBookingViewPreferences(user));
    setClearNotice(null);
  }, [userKey]);

  useEffect(() => {
    if (!clearNotice) return undefined;
    const timer = setTimeout(() => setClearNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [clearNotice]);

  const togglePinned = (bookingId) => {
    const id = String(bookingId);
    setPreferences((current) => {
      const pinnedIds = current.pinnedIds.includes(id)
        ? current.pinnedIds.filter((savedId) => savedId !== id)
        : [id, ...current.pinnedIds];
      const next = { ...current, pinnedIds };
      saveBookingViewPreferences(user, { pinnedIds });
      return next;
    });
  };

  const clearBooking = (bookingId, label = 'Booking') => {
    const id = String(bookingId);
    setPreferences((current) => {
      const clearedIds = current.clearedIds.includes(id)
        ? current.clearedIds
        : [...current.clearedIds, id];
      const next = { ...current, clearedIds };
      saveBookingViewPreferences(user, { clearedIds });
      return next;
    });
    setClearNotice({ id, label });
  };

  const undoClear = () => {
    if (!clearNotice) return;
    const id = clearNotice.id;
    setPreferences((current) => {
      const clearedIds = current.clearedIds.filter((savedId) => savedId !== id);
      const next = { ...current, clearedIds };
      saveBookingViewPreferences(user, { clearedIds });
      return next;
    });
    setClearNotice(null);
  };

  return {
    pinnedBookingIds: preferences.pinnedIds,
    clearedBookingIds: preferences.clearedIds,
    clearNotice,
    togglePinned,
    clearBooking,
    undoClear,
  };
}

export default function BookingActionNotice({ notice, onUndo }) {
  if (!notice) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 76, zIndex: 2000, alignItems: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, maxWidth: 480, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 12 }}>
        <Feather name="check-circle" size={16} color="#C4B5FD" style={{ marginRight: 8 }} />
        <Text numberOfLines={1} style={{ flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
          {notice.label} hidden from your list
        </Text>
        <TouchableOpacity onPress={onUndo} activeOpacity={0.7} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#C4B5FD', fontWeight: '800', fontSize: 12 }}>Undo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
