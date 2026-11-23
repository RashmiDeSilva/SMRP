import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function BookingFormScreen({ boarding, currentUser, onBack, onSubmitBooking }) {
  const [specialNote, setSpecialNote] = useState('');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || currentUser?.contactNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!boarding) return null;

  const userName = currentUser?.fullName || currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
  const userEmail = currentUser?.email || '';
  const userRole = currentUser?.role || 'Student';

  const pricePerBed = parseInt(boarding.pricePerMonth || 0, 10);
  const estimatedTotal = pricePerBed || 15000;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!contactPhone.trim()) {
      const msg = 'Please provide a valid contact phone number so the boarding owner can reach you.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Phone Required', msg);
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData = {
        boardingId: boarding._id,
        numberOfRooms: 1,
        numberOfBeds: 1,
        specialNote: specialNote.trim(),
        boardingName: boarding.boardingName || '',
        studentName: userName,
        studentEmail: userEmail,
        studentPhone: contactPhone.trim(),
        message: `Booking Request for ${boarding.boardingName || 'Boarding Place'}${specialNote.trim() ? ` • Note: "${specialNote.trim()}"` : ''}`,
      };

      if (onSubmitBooking) {
        await onSubmitBooking(bookingData);
      }
    } catch (err) {
      console.log('Booking submit error:', err);
      if (Platform.OS === 'web') {
        alert('Failed to submit booking request. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to submit booking request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Add Booking Request</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {boarding.boardingName || 'Boarding Place'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Boarding Summary Card */}
        <View style={styles.summaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {boarding.coverImage ? (
              <Image source={{ uri: boarding.coverImage }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="home-outline" size={24} color="#6D28D9" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.summaryBoardingName} numberOfLines={1}>
                {boarding.boardingName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Feather name="map-pin" size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.summaryLocation} numberOfLines={1}>
                  {boarding.location || 'Colombo, Sri Lanka'}
                </Text>
              </View>
              <Text style={styles.summaryPrice}>
                Rs. {pricePerBed ? pricePerBed.toLocaleString() : '—'}{' '}
                <Text style={styles.summaryPriceSuffix}>/ month</Text>
              </Text>
            </View>
          </View>

          <View style={styles.summaryBadgesRow}>
            <View style={styles.summaryMiniBadge}>
              <Ionicons name="home-outline" size={14} color="#6D28D9" style={{ marginRight: 4 }} />
              <Text style={styles.summaryMiniBadgeText}>
                {boarding.availableRooms !== undefined ? boarding.availableRooms : (boarding.totalRooms || 0)} Rooms Avail
              </Text>
            </View>
            <View style={[styles.summaryMiniBadge, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="bed-outline" size={14} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={[styles.summaryMiniBadgeText, { color: '#2563EB' }]}>
                {boarding.availableBeds !== undefined ? boarding.availableBeds : (boarding.totalBeds || 0)} Beds Avail
              </Text>
            </View>
            <View style={[styles.summaryMiniBadge, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="info" size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={[styles.summaryMiniBadgeText, { color: '#16A34A' }]}>
                {boarding.bedsPerRoom || 'Standard Room'}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Your Information (Auto-Filled) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Feather name="user" size={16} color="#6D28D9" />
            </View>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <View style={styles.autoFilledBadge}>
              <Feather name="check" size={12} color="#059669" style={{ marginRight: 3 }} />
              <Text style={styles.autoFilledText}>Auto-filled</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{userName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{userEmail || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Role</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
          </View>

          {/* Contact Phone (Editable) */}
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.fieldLabel}>Contact Phone Number</Text>
              <Text style={{ fontSize: 11, color: '#6D28D9', fontWeight: '700' }}>For Owner Call/SMS</Text>
            </View>
            <View style={styles.phoneInputContainer}>
              <Feather name="phone" size={16} color="#6D28D9" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.phoneInput}
                placeholder="e.g. 077 123 4567"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={contactPhone}
                onChangeText={setContactPhone}
              />
            </View>
          </View>
        </View>

        {/* 2. Special Note Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Feather name="edit-3" size={16} color="#6D28D9" />
            </View>
            <Text style={styles.sectionTitle}>Special Note / Requests</Text>
            <Text style={styles.optionalTag}>(Optional)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Add any specific requests (e.g. expected move-in date, quiet room preference):
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g. Hi! Looking forward to moving in soon. Please let me know the check-in process."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={specialNote}
            onChangeText={setSpecialNote}
          />
        </View>

        {/* 3. Boarding Agreement & Key Money Terms */}
        <View style={[styles.sectionCard, { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#DDD6FE' }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Feather name="file-text" size={16} color="#6D28D9" />
            </View>
            <Text style={styles.sectionTitle}>Boarding Agreement & Key Money Rules</Text>
          </View>

          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔑</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>1st Month Double Payment (Key Money)</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 }}>
                  Upon move-in, the 1st month payment includes 1 month rent + 1 month Key Money security deposit (Double Payment: Rs. {(pricePerBed * 2).toLocaleString()}).
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>📢</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>2-Month Move-Out Notice</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 }}>
                  You must inform the boarding owner at least 2 months in advance before vacating or leaving the boarding place.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🗓️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>1-Year Minimum Stay Requirement</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 }}>
                  Key money benefits and last-month rent coverage are valid only if you complete a minimum stay of 1 year (12 months).
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>💸</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#16A34A' }}>Last Month Rent Free (After 1 Year)</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 }}>
                  When completing a 1-year stay, no rental fee is required for the final month as it is covered by your initial key money deposit.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>Early Departure Policy (Under 1 Year)</Text>
                <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 2, lineHeight: 16 }}>
                  If you leave the boarding place before completing 1 full year, the key money deposit cannot be refunded or credited.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Financial / Cost Breakdown */}
        <View style={styles.costCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="credit-card" size={16} color="#6D28D9" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9', textTransform: 'uppercase' }}>
                Payment Breakdown
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#4C1D95', fontWeight: '600' }}>Monthly Rent:</Text>
              <Text style={{ fontSize: 13, color: '#4C1D95', fontWeight: '800' }}>Rs. {pricePerBed.toLocaleString()} / mo</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#4C1D95', fontWeight: '600' }}>Key Money Deposit (1st Month):</Text>
              <Text style={{ fontSize: 13, color: '#4C1D95', fontWeight: '800' }}>Rs. {pricePerBed.toLocaleString()}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#DDD6FE', marginVertical: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#6D28D9', fontWeight: '900' }}>Total 1st Month Move-In:</Text>
              <Text style={{ fontSize: 16, color: '#6D28D9', fontWeight: '900' }}>Rs. {(pricePerBed * 2).toLocaleString()}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: '#6D28D9', lineHeight: 16 }}>
            💡 <Text style={{ fontWeight: '700' }}>Note:</Text> No payment is charged right now. Your request will be sent to the owner for approval. Once accepted, you can proceed with the move-in payment.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>1st Month Move-In Total</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
              Rs. {(pricePerBed * 2).toLocaleString()}{' '}
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>(Includes Key Money)</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Send Booking Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryBoardingName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryLocation: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6D28D9',
    marginTop: 3,
  },
  summaryPriceSuffix: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryMiniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  autoFilledBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoFilledText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    paddingVertical: 2,
  },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  counterSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  counterBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  counterValue: {
    width: 46,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#6D28D9',
  },
  counterValueText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6D28D9',
  },
  roomTypeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  roomTypeCardSelected: {
    borderColor: '#6D28D9',
    backgroundColor: '#FAF5FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: '#6D28D9',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6D28D9',
  },
  roomTypeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  roomTypeLabelSelected: {
    color: '#6D28D9',
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeSelected: {
    backgroundColor: '#F3E8FF',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  typeBadgeTextSelected: {
    color: '#6D28D9',
  },
  roomTypeDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconBoxSelected: {
    backgroundColor: '#F3E8FF',
  },
  optionalTag: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 6,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 85,
    fontWeight: '500',
  },
  costCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    marginBottom: 14,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
  submitBtn: {
    backgroundColor: '#6D28D9',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

