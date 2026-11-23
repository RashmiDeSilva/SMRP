import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Image,
  ImageBackground,
  Alert,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';

import { SafeAreaView } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SidebarSectionModals from '../components/SidebarSectionModals';
import BookingActionNotice, { useBookingViewPreferences } from '../components/BookingActionNotice';

const PURPLE = '#6D28D9';
const PURPLE_LIGHT = '#EDE9FE';
const PURPLE_DARK = '#4C1D95';
const PURPLE_MUTED = '#7C3AED';

const POPULAR_BANKS = [
  'Commercial Bank of Ceylon',
  'Bank of Ceylon (BOC)',
  'Sampath Bank',
  'Hatton National Bank (HNB)',
  'People\'s Bank',
  'Nations Trust Bank (NTB)',
  'Seylan Bank',
  'DFCC Bank',
  'Other Bank',
];

const { width } = Dimensions.get('window');

export default function OwnerDashboardScreen({ 
  currentUser, 
  boardings = [], 
  onLogout, 
  onAddBoarding, 
  onDeleteBoarding, 
  onEditBoarding, 
  bookings = [], 
  onConfirmBooking, 
  onRejectBooking,
  onConfirmClientPayment,
}) {
  const [userState, setUserState] = useState(currentUser);
  const activeUser = userState || currentUser;
  const firstName = activeUser?.fullName?.split(' ')[0] || activeUser?.email?.split('@')[0] || 'Owner';
  const [activeTab, setActiveTab] = React.useState('dashboard'); // 'dashboard', 'reservations', 'payments'
  const [reservationFilter, setReservationFilter] = React.useState('all'); // 'all', 'pending', 'confirmed', 'rejected'
  const [paymentFilter, setPaymentFilter] = React.useState('all'); // 'all', 'pending', 'confirmed'
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuModal, setActiveMenuModal] = useState(null);
  const [selectedReservation, setSelectedReservation] = React.useState(null);
  const [activeReservationMenu, setActiveReservationMenu] = React.useState(null);
  const {
    pinnedBookingIds: pinnedReservationIds,
    clearedBookingIds: clearedReservationIds,
    clearNotice,
    togglePinned,
    clearBooking,
    undoClear,
  } = useBookingViewPreferences(activeUser);
  const [selectedAgreementBooking, setSelectedAgreementBooking] = React.useState(null);
  const [selectedReceiptImage, setSelectedReceiptImage] = React.useState(null);
  const [expandedClientId, setExpandedClientId] = React.useState(null);
  const [helpVisible, setHelpVisible] = React.useState(false);

  // Owner Bank Details on Confirmation States
  const [confirmingBooking, setConfirmingBooking] = React.useState(null);
  const [bankName, setBankName] = React.useState('Commercial Bank of Ceylon');
  const [customBankName, setCustomBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [branchName, setBranchName] = React.useState('');
  const [accountHolderName, setAccountHolderName] = React.useState(
    currentUser?.fullName || currentUser?.name || 'Boarding Owner'
  );

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('nestora_owner_bank_details');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.bankName) setBankName(parsed.bankName);
          if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
          if (parsed.branchName) setBranchName(parsed.branchName);
          if (parsed.accountHolderName) setAccountHolderName(parsed.accountHolderName);
        }
      }
    } catch (e) {}
  }, []);

  const handleConfirmWithBankDetails = () => {
    if (!accountNumber.trim()) {
      alert('Please enter your Account Number so the tenant can transfer the rent.');
      return;
    }
    if (!branchName.trim()) {
      alert('Please enter your Bank Branch name.');
      return;
    }
    if (!accountHolderName.trim()) {
      alert('Please enter the Account Holder Name.');
      return;
    }
    const finalBank = bankName === 'Other Bank' ? (customBankName.trim() || 'Bank') : bankName;
    const bankDetails = {
      bankName: finalBank,
      accountNumber: accountNumber.trim(),
      branchName: branchName.trim(),
      accountHolderName: accountHolderName.trim(),
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nestora_owner_bank_details', JSON.stringify(bankDetails));
      }
    } catch (e) {}

    const bookingId = confirmingBooking._id;
    setConfirmingBooking(null);
    if (onConfirmBooking) {
      onConfirmBooking(bookingId, bankDetails);
    }
  };

  const formatMonthDisplay = (booking, monthNum, rawTitle) => {
    if (rawTitle && !rawTitle.startsWith('Month ')) {
      return rawTitle;
    }
    const baseDate = new Date(booking?.checkInDate || booking?.createdAt || Date.now());
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + (monthNum - 1), 1);
    const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (monthNum === 1) {
      return `${monthName} (Move-in & Key Money)`;
    }
    return `${monthName} (Monthly Rent)`;
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this boarding place?');
      if (confirmDelete && onDeleteBoarding) {
        onDeleteBoarding(id);
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this boarding place?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (onDeleteBoarding) onDeleteBoarding(id);
            },
          },
        ]
      );
    }
  };

  const clearReservationFromView = (booking) => {
    setActiveReservationMenu(null);
    clearBooking(booking._id, booking.boardingName || booking.boarding?.boardingName || 'Reservation');
  };

  // Dynamic stats calculation
  const totalBoardings = boardings.length;
  const totalBeds = boardings.reduce((sum, b) => sum + (parseInt(b.totalBeds, 10) || 0), 0);
  const pendingReservationsCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedReservationsCount = bookings.filter((b) => b.status === 'confirmed').length;
  const confirmedClients = bookings.filter((b) => b.status === 'confirmed');
  const pendingPaymentsCount = confirmedClients.filter((b) =>
    b.paymentStatus === 'pending_confirmation' ||
    (b.payments && b.payments.some((p) => p.status === 'pending_confirmation'))
  ).length;
  const visibleReservations = bookings
    .filter((booking) => !clearedReservationIds.includes(String(booking._id)))
    .filter((booking) => reservationFilter === 'all' || booking.status === reservationFilter || (reservationFilter === 'rejected' && booking.status === 'cancelled'))
    .sort((a, b) => {
      const aPinned = pinnedReservationIds.includes(String(a._id));
      const bPinned = pinnedReservationIds.includes(String(b._id));
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  // Stat cards data
  const stats = [
    {
      title: 'Total Boardings',
      value: String(totalBoardings),
      titleColor: '#3B82F6', // Blue
      onPress: () => setActiveTab('dashboard'),
    },
    {
      title: 'Active Clients',
      value: String(confirmedReservationsCount),
      titleColor: '#16A34A', // Green
      onPress: () => {
        setActiveTab('payments');
        setPaymentFilter('all');
      },
    },
    {
      title: pendingPaymentsCount > 0 ? 'Pending Payments' : 'Pending Bookings',
      value: String(pendingPaymentsCount > 0 ? pendingPaymentsCount : pendingReservationsCount),
      titleColor: PURPLE,
      hasIcon: true,
      onPress: () => {
        if (pendingPaymentsCount > 0) {
          setActiveTab('payments');
          setPaymentFilter('pending');
        } else {
          setActiveTab('reservations');
          setReservationFilter('pending');
        }
      },
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('../../assets/background.jpg')}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(248, 250, 252, 0.88)' }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
        {/* Dark Purple to Light Purple Header (Picture 3 Theme) */}
        <ImageBackground
          source={require('../../assets/purple_wave_header.png')}
          style={styles.headerContainer}
          imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
          resizeMode="cover"
        >
          <SafeAreaView>
            {/* Top Bar */}
            {isSearchActive ? (
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => { setIsSearchActive(false); setSearchQuery(''); }}>
                  <Feather name="arrow-left" size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.searchInput, { color: '#FFFFFF', marginLeft: 10, fontSize: 16 }]}
                  placeholder="Search boarding by name..."
                  placeholderTextColor="#EDE9FE"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuOpen(true)}>
                  <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Owner Dashboard</Text>

                <View style={styles.topBarRight}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearchActive(true)}>
                    <Feather name="search" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Greeting */}
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>
                Hello, {currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Owner'}! 👋
              </Text>
              <Text style={styles.subGreetingText}>Here's your property overview.</Text>
            </View>
          </SafeAreaView>

          {/* Stats Grid Layout */}
          {/* Stats Grid Layout */}
          <View style={styles.statsGrid}>
            {stats.map((item, index) => {
              const isPendingCard = item.hasIcon && pendingReservationsCount > 0;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.statCard,
                    isPendingCard && {
                      borderColor: PURPLE,
                      borderWidth: 1.5,
                      backgroundColor: PURPLE_LIGHT,
                    }
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statCardTitle, { color: item.titleColor }]}>
                    {item.title}
                  </Text>
                  <View style={styles.statCardValueRow}>
                    <Text style={[styles.statCardValue, isPendingCard && { color: PURPLE }]}>
                      {item.value}
                    </Text>
                    {item.hasIcon && (
                      <MaterialCommunityIcons
                        name="clock-alert-outline"
                        size={18}
                        color={PURPLE}
                        style={styles.statIcon}
                      />
                    )}
                  </View>
                  <Text style={{ fontSize: 9, color: isPendingCard ? PURPLE : '#94A3B8', marginTop: 3, fontWeight: '700' }}>
                    Tap to view →
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ImageBackground>

        {/* Lower Content Section */}
        <View style={styles.lowerSection}>
          {activeTab === 'reservations' ? (
            /* Reservations Tab content */
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Reservations</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'all', label: `All (${bookings.length})` },
                    { id: 'pending', label: `Pending (${pendingReservationsCount})` },
                    { id: 'confirmed', label: `Confirmed (${confirmedReservationsCount})` },
                    { id: 'rejected', label: `Rejected (${bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length})` },
                  ].map((filterTab) => (
                    <TouchableOpacity
                      key={filterTab.id}
                      onPress={() => setReservationFilter(filterTab.id)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: reservationFilter === filterTab.id ? PURPLE : '#F1F5F9',
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: reservationFilter === filterTab.id ? '#FFFFFF' : '#475569',
                      }}>
                        {filterTab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {visibleReservations.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Feather name="calendar" size={32} color="#94A3B8" />
                  <Text style={styles.emptyStateText}>No {reservationFilter !== 'all' ? reservationFilter : ''} reservations found.</Text>
                  <Text style={styles.emptyStateSubtext}>When students book your properties, they will appear here!</Text>
                </View>
              ) : (
                visibleReservations.map((booking) => {
                    const studentName = booking.studentName || booking.student?.fullName || booking.student?.name || booking.student?.email?.split('@')[0] || 'Student';
                    const studentEmail = booking.studentEmail || booking.student?.email || 'N/A';
                    const studentPhone = booking.studentPhone || booking.student?.phone || 'Not provided';
                    const roomsCount = booking.numberOfRooms || 1;
                    const bedsCount = booking.numberOfBeds || 1;
                    const roomType = booking.roomType || 'Separate Rooms';
                    const pricePerBed = parseInt(booking.boarding?.pricePerMonth || 0, 10);
                    const totalEst = pricePerBed ? pricePerBed * bedsCount : 0;

                  return (
                    <TouchableOpacity
                      key={booking._id}
                      style={[styles.boardingCard, { padding: 16, position: 'relative', zIndex: activeReservationMenu === booking._id ? 100 : 1 }]}
                      activeOpacity={0.92}
                      onPress={() => setSelectedReservation(booking)}
                      onLongPress={() => setActiveReservationMenu(booking._id)}
                      delayLongPress={350}
                      onContextMenu={Platform.OS === 'web' ? (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveReservationMenu(booking._id);
                      } : undefined}
                    >
                      <View style={styles.boardingHeaderRow}>
                        <View style={[
                          styles.statusBadge,
                          booking.status === 'confirmed' && styles.statusConfirmed,
                          (booking.status === 'rejected' || booking.status === 'cancelled') && styles.statusRejected,
                          booking.status === 'pending' && styles.statusPending,
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            booking.status === 'confirmed' && styles.statusTextConfirmed,
                            (booking.status === 'rejected' || booking.status === 'cancelled') && styles.statusTextRejected,
                            booking.status === 'pending' && styles.statusTextPending,
                          ]}>
                            {booking.status === 'confirmed'
                              ? '✓ CONFIRMED STAY'
                              : booking.status === 'cancelled'
                              ? '🚫 CANCELLED BY CLIENT'
                              : (booking.status ? booking.status.toUpperCase() : 'PENDING')}
                          </Text>
                        </View>
                        <Text style={styles.propertyName} numberOfLines={1}>
                          {pinnedReservationIds.includes(String(booking._id)) ? '📌 ' : ''}{booking.boardingName || booking.boarding?.boardingName || 'Boarding Place'}
                        </Text>
                        <Feather name="chevron-right" size={18} color={PURPLE} style={{ marginLeft: 6 }} />
                        <TouchableOpacity
                          accessibilityLabel="Reservation options"
                          style={{ padding: 6, marginLeft: 4, borderRadius: 8, backgroundColor: activeReservationMenu === booking._id ? PURPLE_LIGHT : '#F8FAFC' }}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            setActiveReservationMenu((prev) => prev === booking._id ? null : booking._id);
                          }}
                          onLongPress={() => setActiveReservationMenu(booking._id)}
                          delayLongPress={350}
                        >
                          <MaterialCommunityIcons name="dots-vertical" size={18} color={PURPLE} />
                        </TouchableOpacity>
                      </View>



                      {/* Detailed Reservation Grid */}
                      <View style={[styles.reservationDetailBox, { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' }]}>
                        {/* Student Details & Quick Call */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Feather name="user" size={15} color={PURPLE} style={{ marginRight: 6 }} />
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{studentName}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginLeft: 21 }}>
                              {studentEmail}
                            </Text>
                            {studentPhone !== 'Not provided' && (
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 2, marginLeft: 21 }}>
                                📞 {studentPhone}
                              </Text>
                            )}
                          </View>

                          {studentPhone !== 'Not provided' && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: PURPLE,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                              onPress={() => {
                                if (Platform.OS === 'web') {
                                  window.location.href = `tel:${studentPhone}`;
                                } else {
                                  Alert.alert('Contact Student', `Call ${studentPhone}?`);
                                }
                              }}
                              activeOpacity={0.8}
                            >
                              <Feather name="phone-call" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Call</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Prominent Bed & Room Requirements */}
                        <View style={{ backgroundColor: '#F5F3FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#DDD6FE' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: PURPLE, textTransform: 'uppercase' }}>
                              Booking Request Specifications
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#4C1D95' }}>
                              {roomsCount} Room(s) with {bedsCount} Bed(s)
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' }}>
                              <Text style={{ fontSize: 12, fontWeight: '900', color: '#1D4ED8' }}>🛏️ {bedsCount} Bed(s) Requested</Text>
                            </View>
                            <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#EDE9FE' }}>
                              <Text style={{ fontSize: 12, fontWeight: '900', color: '#6D28D9' }}>🏠 {roomsCount} Room(s)</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>📋 {roomType}</Text>
                            </View>
                          </View>

                          {/* Full Payment Breakdown with Monthly Fee, Key Money, and Full 1st Month Income */}
                          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDE9FE' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, color: '#4C1D95', fontWeight: '700' }}>Monthly Fee:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#4C1D95' }}>Rs. {(totalEst || 15000).toLocaleString()} / mo</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, color: '#4C1D95', fontWeight: '700' }}>Key Money (Deposit):</Text>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#4C1D95' }}>Rs. {(totalEst || 15000).toLocaleString()}</Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: '#DDD6FE', marginVertical: 5 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#4C1D95' }}>Full 1st Month Payment:</Text>
                                <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '600' }}>Monthly Fee + Key Money</Text>
                              </View>
                              <Text style={{ fontSize: 16, color: PURPLE, fontWeight: '900' }}>
                                Rs. {((totalEst || 15000) * 2).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {booking.status === 'cancelled' ? (
                          <View style={{ marginTop: 6, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Feather name="alert-triangle" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Client cancellation notice</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '700' }}>
                              {booking.ownerCancelMessage || `${studentName} cancelled this reservation.`}
                            </Text>
                            {booking.cancellationReason ? (
                              <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 4, fontStyle: 'italic' }}>
                                Reason: "{booking.cancellationReason}"
                              </Text>
                            ) : null}
                          </View>
                        ) : null}

                        {booking.specialNote ? (
                          <View style={{ marginTop: 4, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>💬 Student's Special Note:</Text>
                            <Text style={{ fontSize: 12, color: '#0F172A', marginTop: 3, fontStyle: 'italic', lineHeight: 18 }}>
                              "{booking.specialNote}"
                            </Text>
                          </View>
                        ) : null}

                        <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 8, fontWeight: '600' }}>
                          Requested: {new Date(booking.createdAt).toLocaleDateString()} at {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>

                      {booking.status === 'pending' ? (
                        <View style={[styles.actionRow, { marginTop: 12 }]}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={() => onRejectBooking && onRejectBooking(booking._id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.declineButtonText}>Decline</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.confirmButton]}
                            onPress={() => setConfirmingBooking(booking)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.confirmButtonText}>Confirm Stay</Text>
                          </TouchableOpacity>
                        </View>
                      ) : booking.status === 'confirmed' ? (
                        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: '#FEF2F2',
                              borderWidth: 1,
                              borderColor: '#FECACA',
                            }}
                            onPress={() => onRejectBooking && onRejectBooking(booking._id)}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Cancel / Decline Stay</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    {activeReservationMenu === booking._id && (
                      <View style={{ position: 'absolute', top: 54, right: 12, minWidth: 185, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 6, borderWidth: 1, borderColor: '#EDE9FE', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 20, zIndex: 1000 }}>
                        <Pressable
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 7, backgroundColor: pressed ? PURPLE_LIGHT : 'transparent' })}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            setActiveReservationMenu(null);
                            setSelectedReservation(booking);
                          }}
                        >
                          <Feather name="file-text" size={15} color={PURPLE} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: PURPLE }}>View details</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 7, backgroundColor: pinnedReservationIds.includes(String(booking._id)) || pressed ? PURPLE_LIGHT : 'transparent' })}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            setActiveReservationMenu(null);
                            togglePinned(booking._id);
                          }}
                        >
                          <MaterialCommunityIcons name={pinnedReservationIds.includes(String(booking._id)) ? 'pin-off' : 'pin'} size={16} color={PURPLE} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: PURPLE }}>{pinnedReservationIds.includes(String(booking._id)) ? 'Unpin reservation' : 'Pin reservation'}</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 7, backgroundColor: pressed ? PURPLE_LIGHT : 'transparent' })}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            clearReservationFromView(booking);
                          }}
                        >
                          <Feather name="eye-off" size={15} color="#64748B" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Clear from list</Text>
                        </Pressable>
                      </View>
                    )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : activeTab === 'payments' ? (
            /* Payments & Clients Tab content */
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 2 }]}>Clients & Payments</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>
                    Track tenancy agreements & verify monthly slips
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'all', label: `All (${confirmedClients.length})` },
                    { id: 'pending', label: `Pending (${pendingPaymentsCount})` },
                    { id: 'confirmed', label: `Verified (${confirmedClients.length - pendingPaymentsCount})` },
                  ].map((filterTab) => (
                    <TouchableOpacity
                      key={filterTab.id}
                      onPress={() => setPaymentFilter(filterTab.id)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: 10,
                        backgroundColor: paymentFilter === filterTab.id ? PURPLE : '#F1F5F9',
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: paymentFilter === filterTab.id ? '#FFFFFF' : '#475569',
                      }}>
                        {filterTab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filter clients according to paymentFilter */}
              {(() => {
                const filteredClients = confirmedClients.filter((client) => {
                  const hasPending = client.paymentStatus === 'pending_confirmation' ||
                    (client.payments && client.payments.some((p) => p.status === 'pending_confirmation'));
                  if (paymentFilter === 'pending') return hasPending;
                  if (paymentFilter === 'confirmed') return !hasPending;
                  return true;
                });

                if (filteredClients.length === 0) {
                  return (
                    <View style={styles.emptyStateContainer}>
                      <Feather name="credit-card" size={32} color="#94A3B8" />
                      <Text style={styles.emptyStateText}>
                        {paymentFilter === 'pending'
                          ? 'No pending payment slips waiting for verification.'
                          : 'No clients or tenants found.'}
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        When students book and you confirm their stay, they will appear here to sign the agreement and submit receipts!
                      </Text>
                    </View>
                  );
                }

                                return filteredClients.map((client) => {
                  const sName = client.studentName || client.student?.fullName || client.student?.name || client.student?.email?.split('@')[0] || 'Tenant';
                  const sEmail = client.studentEmail || client.student?.email || 'N/A';
                  const sPhone = client.studentPhone || client.student?.phone || 'Not provided';
                  const bedsCount = client.numberOfBeds || 1;
                  const pricePerBed = parseInt(client.boarding?.pricePerMonth || 15000, 10);
                  const monthlyRent = pricePerBed * bedsCount;
                  const firstMonthTotal = monthlyRent * 2;

                  const hasAgreementSigned = client.agreementStatus === 'signed';
                  const pendingPaymentItem = (client.payments || []).find((p) => p.status === 'pending_confirmation') ||
                    (client.paymentStatus === 'pending_confirmation' ? { monthNumber: 1, amount: firstMonthTotal } : null);

                  const clientPayments = (client.payments && client.payments.length > 0)
                    ? client.payments
                    : [
                        {
                          monthNumber: 1,
                          monthTitle: formatMonthDisplay(client, 1, null),
                          amount: firstMonthTotal,
                          status: client.paymentStatus || 'unpaid',
                          paymentMethod: client.paymentMethod || 'bank_transfer',
                          receiptImage: client.paymentReceipt || '',
                          paidAt: client.updatedAt || new Date(),
                          branch: 'Main Campus Branch',
                        },
                        {
                          monthNumber: 2,
                          monthTitle: formatMonthDisplay(client, 2, null),
                          amount: monthlyRent,
                          status: 'unpaid',
                          paymentMethod: 'bank_transfer',
                        },
                      ];

                  const isExpanded = expandedClientId === client._id;

                  return (
                    <View
                      key={client._id}
                      style={[styles.boardingCard, { padding: 14, marginBottom: 12 }]}
                    >
                      {/* Collapsed Client Row — tap to reach payment details */}
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        onPress={() => setExpandedClientId(isExpanded ? null : client._id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                            <Feather name="user" size={20} color={PURPLE} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{sName}</Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              {client.boardingName || client.boarding?.boardingName || 'Boarding Place'} • {bedsCount} Bed(s)
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {pendingPaymentItem ? (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>⚠️ Slip Pending</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#16A34A' }}>✓ Verified</Text>
                            </View>
                          )}
                          <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={PURPLE} />
                        </View>
                      </TouchableOpacity>

                      {/* Expanded Section: Full payment details, slip, date, branch */}
                      {isExpanded && (
                        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                          {/* Contact Info */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 }}>
                            <View>
                              <Text style={{ fontSize: 11, color: '#475569' }}>✉️ {sEmail}</Text>
                              {sPhone !== 'Not provided' && (
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 2 }}>📞 {sPhone}</Text>
                              )}
                            </View>
                            {sPhone !== 'Not provided' && (
                              <TouchableOpacity
                                style={{
                                  backgroundColor: PURPLE,
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}
                                onPress={() => {
                                  if (Platform.OS === 'web') {
                                    window.location.href = `tel:${sPhone}`;
                                  } else {
                                    Alert.alert('Contact Tenant', `Call ${sPhone}?`);
                                  }
                                }}
                              >
                                <Feather name="phone-call" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Call</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* 1. Tenancy Agreement Verification Box */}
                          <View style={{
                            backgroundColor: hasAgreementSigned ? '#F0FDF4' : '#FFFBEB',
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: hasAgreementSigned ? '#BBF7D0' : '#FDE68A',
                            marginBottom: 12,
                          }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                <Feather
                                  name={hasAgreementSigned ? 'check-circle' : 'clock'}
                                  size={16}
                                  color={hasAgreementSigned ? '#16A34A' : '#D97706'}
                                  style={{ marginRight: 8 }}
                                />
                                <View>
                                  <Text style={{
                                    fontSize: 12,
                                    fontWeight: '800',
                                    color: hasAgreementSigned ? '#166534' : '#92400E',
                                  }}>
                                    {hasAgreementSigned ? '✓ Tenancy Agreement Signed' : '⏳ Agreement Pending Signature'}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: hasAgreementSigned ? '#15803D' : '#B45309', marginTop: 1 }}>
                                    {hasAgreementSigned
                                      ? `Signed by ${client.signedByName || sName} on ${new Date(client.signedDate || client.updatedAt).toLocaleDateString()}`
                                      : 'Client has not yet submitted signed agreement'}
                                  </Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: hasAgreementSigned ? '#86EFAC' : '#FCD34D',
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}
                                onPress={() => setSelectedAgreementBooking(client)}
                                activeOpacity={0.8}
                              >
                                <Feather name="file-text" size={12} color="#334155" style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }}>
                                  {hasAgreementSigned ? 'View Signed' : 'View Contract'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Continuous Monthly Payments Timeline with Slips Attached Per Month */}
                          <View style={{
                            backgroundColor: '#FAF5FF',
                            borderRadius: 14,
                            padding: 14,
                            borderWidth: 1.5,
                            borderColor: '#DDD6FE',
                          }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <Text style={{ fontSize: 12, fontWeight: '900', color: '#6D28D9', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Continuous Monthly Rent Ledger
                              </Text>
                              <View style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                backgroundColor: pendingPaymentItem ? '#FEF3C7' : '#DCFCE7',
                              }}>
                                <Text style={{
                                  fontSize: 10,
                                  fontWeight: '800',
                                  color: pendingPaymentItem ? '#D97706' : '#16A34A',
                                }}>
                                  {pendingPaymentItem ? '⚠️ SLIP AWAITING REVIEW' : '✓ UP TO DATE'}
                                </Text>
                              </View>
                            </View>

                            <View style={{ gap: 10 }}>
                              {clientPayments.map((p, pIdx) => {
                                const isPaid = p.status === 'confirmed';
                                const isPending = p.status === 'pending_confirmation';
                                const pDateStr = p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
                                const pBranchStr = p.branch || (p.paymentMethod && p.paymentMethod !== 'bank_transfer' ? p.paymentMethod : null);
                                const slipUri = p.receiptImage || (p.monthNumber === 1 ? client.paymentReceipt : null);

                                return (
                                  <View
                                    key={pIdx}
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: 12,
                                      padding: 12,
                                      borderWidth: 1,
                                      borderColor: isPaid ? '#BBF7D0' : (isPending ? '#FDE68A' : '#E2E8F0'),
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <View style={{ flex: 1, marginRight: 6 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                          {formatMonthDisplay(client, p.monthNumber, p.monthTitle)}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1, fontWeight: '600' }}>
                                          Rs. {(p.amount || 0).toLocaleString()} {p.notes ? `• ${p.notes}` : ''}
                                        </Text>
                                        {(pDateStr || pBranchStr) && (
                                          <Text style={{ fontSize: 11, color: isPaid ? '#16A34A' : '#64748B', marginTop: 3, fontWeight: '600' }}>
                                            {pDateStr ? `📅 ${pDateStr}` : ''}{pBranchStr ? ` • 🏦 ${pBranchStr}` : ''}
                                          </Text>
                                        )}
                                      </View>

                                      <View style={{
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                        backgroundColor: isPaid ? '#DCFCE7' : (isPending ? '#FEF3C7' : '#F1F5F9'),
                                      }}>
                                        <Text style={{
                                          fontSize: 10,
                                          fontWeight: '800',
                                          color: isPaid ? '#16A34A' : (isPending ? '#D97706' : '#64748B'),
                                        }}>
                                          {isPaid ? '✓ CONFIRMED' : (isPending ? '⏳ SLIP IN REVIEW' : 'UNPAID')}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* Bank Slip Attachment Preview attached under this exact month */}
                                    {slipUri ? (
                                      <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: 8,
                                        padding: 8,
                                        borderWidth: 1,
                                        borderColor: '#E2E8F0',
                                        marginTop: 10,
                                      }}>
                                        <Image
                                          source={{ uri: slipUri }}
                                          style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: '#E2E8F0', marginRight: 10 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>Attached Bank Slip / Receipt</Text>
                                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                                            {pDateStr ? `Date: ${pDateStr}` : 'Receipt available'}
                                          </Text>
                                        </View>
                                        <TouchableOpacity
                                          style={{
                                            backgroundColor: '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: '#CBD5E1',
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            borderRadius: 6,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                          onPress={() => setSelectedReceiptImage(slipUri)}
                                        >
                                          <Feather name="maximize-2" size={11} color="#334155" style={{ marginRight: 4 }} />
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }}>View Slip</Text>
                                        </TouchableOpacity>
                                      </View>
                                    ) : null}

                                    {/* Confirm Payment button right inside this month if pending */}
                                    {isPending ? (
                                      <TouchableOpacity
                                        style={{
                                          backgroundColor: '#16A34A',
                                          borderRadius: 8,
                                          paddingVertical: 10,
                                          flexDirection: 'row',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          marginTop: 10,
                                          shadowColor: '#16A34A',
                                          shadowOffset: { width: 0, height: 2 },
                                          shadowOpacity: 0.15,
                                          shadowRadius: 4,
                                          elevation: 2,
                                        }}
                                        onPress={() => onConfirmClientPayment && onConfirmClientPayment(client._id, p.monthNumber || 1)}
                                        activeOpacity={0.85}
                                      >
                                        <Feather name="check-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                                          Confirm & Approve {p.monthTitle || `Month ${p.monthNumber}`} Payment
                                        </Text>
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                });
              })()}
            </View>
          ) : (
            /* Dashboard Tab content */
            <View>
              {pendingReservationsCount > 0 && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#F5F3FF',
                    borderWidth: 1.5,
                    borderColor: '#FDBA74',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    shadowColor: PURPLE,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  activeOpacity={0.88}
                  onPress={() => {
                    setActiveTab('reservations');
                    setReservationFilter('pending');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                      <View style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: '#EDE9FE',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <Feather name="bell" size={18} color={PURPLE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#4C1D95' }}>
                          {pendingReservationsCount} Pending Booking {pendingReservationsCount === 1 ? 'Request' : 'Requests'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6D28D9', fontWeight: '500', marginTop: 2 }}>
                          Students waiting for your confirmation or decline
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        backgroundColor: PURPLE,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF', marginRight: 4 }}>Review</Text>
                      <Feather name="arrow-right" size={13} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.sectionTitle}>My Boarding Places</Text>

              {boardings.filter(b => b.boardingName?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Feather name="home" size={32} color="#94A3B8" />
                  <Text style={styles.emptyStateText}>No boarding places found.</Text>
                  <Text style={styles.emptyStateSubtext}>Try adjusting your search or add a new property!</Text>
                </View>
              ) : (
                boardings.filter(b => b.boardingName?.toLowerCase().includes(searchQuery.toLowerCase())).map((boarding, index) => (
                  <TouchableOpacity
                    key={boarding._id || index}
                    style={styles.boardingCard}
                    activeOpacity={0.9}
                    onPress={() => onEditBoarding && onEditBoarding(boarding)}
                  >
                    <View style={styles.boardingHeaderRow}>
                      <View style={styles.boardingTypeContainer}>
                        <Text style={styles.boardingTypeText}>{boarding.boardingType}</Text>
                      </View>
                      <Text style={styles.propertyName} numberOfLines={1}>
                        {boarding.boardingName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDelete(boarding._id)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      >
                        <Feather name="trash-2" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.boardingBodyRow}>
                      {boarding.coverImage ? (
                        <Image source={{ uri: boarding.coverImage }} style={styles.boardingImage} />
                      ) : (
                        <View style={styles.boardingImagePlaceholder}>
                          <Ionicons name="image-outline" size={20} color="#94A3B8" />
                        </View>
                      )}

                      <View style={styles.boardingDetails}>
                        <View style={styles.locationRow}>
                          <Feather name="map-pin" size={11} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.boardingLocation} numberOfLines={1}>
                            {boarding.location}
                          </Text>
                        </View>
                        <Text style={styles.boardingRoomStats}>
                          Avail: {boarding.availableRooms !== undefined ? boarding.availableRooms : (boarding.totalRooms || 0)}/{boarding.totalRooms || 0} Rooms • {boarding.availableBeds !== undefined ? boarding.availableBeds : (boarding.totalBeds || 0)}/{boarding.totalBeds || 0} Beds
                        </Text>
                        <Text style={[styles.boardingRoomStats, { color: '#6D28D9', marginTop: 1, fontWeight: '700' }]}>
                          • {boarding.bedsPerRoom || 'One Room per Bed (1 Bed/Room)'}
                        </Text>
                        <Text style={styles.boardingPrice}>
                          Rs. {parseInt(boarding.pricePerMonth || 0).toLocaleString()} / mo (per bed)
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity
                style={styles.addBoardingButton}
                onPress={onAddBoarding}
                activeOpacity={0.85}
              >
                <Text style={styles.addBoardingButtonText}>Add New Boarding</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <BookingActionNotice notice={clearNotice} onUndo={undoClear} />

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('dashboard')}
        >
          <Feather name="home" size={22} color={activeTab === 'dashboard' ? PURPLE : '#64748B'} />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.activeTabLabel]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('reservations')}
        >
          <View>
            <Feather name="calendar" size={22} color={activeTab === 'reservations' ? PURPLE : '#64748B'} />
            {pendingReservationsCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -8,
                backgroundColor: PURPLE,
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>{pendingReservationsCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'reservations' && styles.activeTabLabel]}>Reservations</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('payments')}
        >
          <View>
            <Feather name="credit-card" size={22} color={activeTab === 'payments' ? PURPLE : '#64748B'} />
            {pendingPaymentsCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -8,
                backgroundColor: '#EF4444',
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>{pendingPaymentsCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'payments' && styles.activeTabLabel]}>Payments</Text>
        </TouchableOpacity>
      </View>
    
      {/* ── Side Menu Modal ── */}
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <View style={styles.menuOverlay}>
          <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
            <View style={styles.menuBackdrop} />
          </TouchableWithoutFeedback>
          
          <View style={styles.menuContent}>
            <ImageBackground
              source={require('../../assets/background.jpg')}
              style={{ flex: 1, width: '100%', height: '100%' }}
              resizeMode="cover"
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.45)', paddingTop: Platform.OS === 'ios' ? 50 : 30 }}>
                <View style={styles.menuHeader}>
                  <View style={styles.menuAvatarWrapper}>
                    <Image 
                      source={{uri: activeUser?.profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}} 
                      style={styles.menuAvatar} 
                    />
                  </View>
                  <Text style={[styles.menuUserName, {color: PURPLE}]}>{firstName || 'Owner'}</Text>
                  <View style={{ backgroundColor: PURPLE_LIGHT, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: PURPLE }}>{activeUser?.role || 'Boarding Owner'}</Text>
                  </View>
                </View>

                <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('edit_profile');
                    }}
                  >
                    <Feather name="user" size={20} color={PURPLE} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('security');
                    }}
                  >
                    <Feather name="lock" size={20} color={PURPLE} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Security Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('notifications');
                    }}
                  >
                    <Feather name="bell" size={20} color={PURPLE} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Notification Preferences</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('verification');
                    }}
                  >
                    <Feather name="shield" size={20} color={PURPLE} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Verification Center</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('account');
                    }}
                  >
                    <Feather name="settings" size={20} color={PURPLE} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Account Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setHelpVisible(true);
                    }}
                  >
                    <Feather name="help-circle" size={20} color={PURPLE} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { color: PURPLE, fontWeight: '700' }]}>Help & Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setIsMenuOpen(false); onLogout && onLogout(); }}
                  >
                    <Feather name="log-out" size={20} color="#DC2626" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { color: '#DC2626', fontWeight: '700' }]}>Logout</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </ImageBackground>
          </View>
        </View>
      </Modal>

      {/* ── Sidebar Section Modals ── */}
      <SidebarSectionModals
        activeModal={activeMenuModal}
        onClose={() => setActiveMenuModal(null)}
        currentUser={activeUser}
        onUpdateUser={(updated) => setUserState(updated)}
        themeColor={PURPLE}
      />

      {/* ── Owner Bank Details on Confirmation Modal ── */}
      <Modal
        visible={!!confirmingBooking}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setConfirmingBooking(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            maxHeight: '90%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Feather name="credit-card" size={20} color={PURPLE} />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                    Confirm Stay & Bank Details
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Share your receiving account with the tenant
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setConfirmingBooking(null)} style={{ padding: 6 }}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tenant & Stay Summary */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      {confirmingBooking?.boardingName || 'Boarding Stay'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Tenant: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{confirmingBooking?.studentName || confirmingBooking?.studentEmail || 'Tenant'}</Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>1st Month Total</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: PURPLE }}>
                      Rs. {((confirmingBooking?.numberOfBeds || 1) * parseInt(confirmingBooking?.boarding?.pricePerMonth || 15000, 10) * 2).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                  Includes 1 month rent + 1 month Key Money deposit. The tenant will transfer to the account specified below.
                </Text>
              </View>

              {/* 1. Bank Name Selection */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                SELECT YOUR BANK
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {POPULAR_BANKS.map((b) => {
                  const isSel = bankName === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      onPress={() => setBankName(b)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSel ? PURPLE : '#E2E8F0',
                        backgroundColor: isSel ? PURPLE_LIGHT : '#FFFFFF',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isSel ? PURPLE : '#475569' }}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {bankName === 'Other Bank' && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                    Custom Bank Name
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, fontSize: 13 }}
                    placeholder="Enter Bank Name"
                    placeholderTextColor="#94A3B8"
                    value={customBankName}
                    onChangeText={setCustomBankName}
                  />
                </View>
              )}

              {/* 2. Account Number */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                ACCOUNT NUMBER
              </Text>
              <TextInput
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: '700', marginBottom: 12 }}
                placeholder="e.g. 800123456789"
                placeholderTextColor="#94A3B8"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
              />

              {/* 3. Branch Name */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                BRANCH NAME
              </Text>
              <TextInput
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12 }}
                placeholder="e.g. Colombo Fort / City Campus"
                placeholderTextColor="#94A3B8"
                value={branchName}
                onChangeText={setBranchName}
              />

              {/* 4. Owner Name of Account */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                OWNER NAME OF ACCOUNT (Account Holder)
              </Text>
              <TextInput
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 16 }}
                placeholder="e.g. K. M. Perera"
                placeholderTextColor="#94A3B8"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                  onPress={() => setConfirmingBooking(null)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 2,
                    backgroundColor: '#16A34A',
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={handleConfirmWithBankDetails}
                >
                  <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                    Confirm Stay & Send Details
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Owner Reservation Inspection Modal ── */}
      <Modal
        visible={!!selectedReservation}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedReservation(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            maxHeight: '92%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Feather name="user-check" size={20} color={PURPLE} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Reservation Details</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Status: <Text style={{ fontWeight: '800', color: selectedReservation?.status === 'confirmed' ? '#16A34A' : selectedReservation?.status === 'cancelled' ? '#DC2626' : '#D97706' }}>
                      {selectedReservation?.status === 'cancelled' ? '🚫 CANCELLED BY CLIENT' : (selectedReservation?.status ? selectedReservation.status.toUpperCase() : 'PENDING')}
                    </Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedReservation(null)} style={{ padding: 6 }}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Student Information Box */}
              {(() => {
                const sName = selectedReservation?.studentName || selectedReservation?.student?.fullName || selectedReservation?.student?.name || selectedReservation?.student?.email?.split('@')[0] || 'Student';
                const sEmail = selectedReservation?.studentEmail || selectedReservation?.student?.email || 'N/A';
                const sPhone = selectedReservation?.studentPhone || selectedReservation?.student?.phone || 'Not provided';
                return (
                  <>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{sName}</Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>✉️ {sEmail}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 }}>📞 {sPhone}</Text>
                      </View>
                      {sPhone !== 'Not provided' && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: PURPLE,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.location.href = `tel:${sPhone}`;
                            } else {
                              Alert.alert('Contact Student', `Call ${sPhone}?`);
                            }
                          }}
                        >
                          <Feather name="phone-call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Call</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {selectedReservation?.status === 'cancelled' && (
                    <View style={{ backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Feather name="alert-triangle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>Student cancellation notice</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '700' }}>
                        {selectedReservation.ownerCancelMessage || `${sName} cancelled this reservation.`}
                      </Text>
                      {selectedReservation.cancellationReason ? (
                        <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 4, fontStyle: 'italic' }}>
                          Reason: "{selectedReservation.cancellationReason}"
                        </Text>
                      ) : null}
                    </View>
                  )}
                  </>
                );
              })()}

              {/* Property & Stay Requirements */}
              <View style={{ backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#4C1D95', marginBottom: 4 }}>
                  {selectedReservation?.boardingName || selectedReservation?.boarding?.boardingName || 'Boarding Place'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6D28D9', marginBottom: 8 }}>
                  📍 {selectedReservation?.boarding?.location || 'Location'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DDD6FE' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>🛏️ {selectedReservation?.numberOfBeds || 1} Bed(s)</Text>
                  </View>
                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DDD6FE' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>🏠 {selectedReservation?.numberOfRooms || 1} Room(s)</Text>
                  </View>
                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DDD6FE' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>📋 {selectedReservation?.roomType || 'Separate Rooms'}</Text>
                  </View>
                </View>
              </View>

              {/* 📜 Boarding Agreement & Key Money Rules */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#DDD6FE', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Feather name="file-text" size={16} color={PURPLE} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: PURPLE, textTransform: 'uppercase' }}>
                    Boarding Agreement & Key Money Rules
                  </Text>
                </View>

                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>🔑</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>1st Month Double Payment (Key Money)</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Student pays 1st month rent + 1 month Key Money deposit (Double payment).
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>📢</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>2-Month Move-Out Notice</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Student must notify you at least 2 months prior to vacating.
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>🗓️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>1-Year Minimum Stay Requirement</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Key money covers the final month only if the occupant completes 1 full year.
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>💸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#16A34A' }}>Last Month Fee Waived (After 1 Year)</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Upon completing a 1-year stay, no rental fee is collected for the final month (covered by Key Money).
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Early Departure Policy</Text>
                      <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 1 }}>
                        If the occupant leaves before 1 full year, key money is non-refundable.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 💰 Income Breakdown */}
              {(() => {
                const beds = selectedReservation?.numberOfBeds || 1;
                const pricePerBed = parseInt(selectedReservation?.boarding?.pricePerMonth || 15000, 10);
                const monthlyTotal = pricePerBed * beds;
                const firstMonthTotal = monthlyTotal * 2;
                return (
                  <View style={{ backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#4C1D95', marginBottom: 8, textTransform: 'uppercase' }}>
                      Payment & Income Summary
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#4C1D95' }}>Monthly Rent ({beds} Bed(s)):</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#4C1D95' }}>Rs. {monthlyTotal.toLocaleString()} / mo</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#4C1D95' }}>Key Money Security Deposit (1st Month):</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#4C1D95' }}>Rs. {monthlyTotal.toLocaleString()}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#DDD6FE', marginVertical: 6 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#4C1D95' }}>1st Month Total Income (Double Payment):</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: PURPLE }}>Rs. {firstMonthTotal.toLocaleString()}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Student Note */}
              {selectedReservation?.specialNote ? (
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 4 }}>💬 Student's Note / Requests:</Text>
                  <Text style={{ fontSize: 13, color: '#0F172A', fontStyle: 'italic', lineHeight: 18 }}>
                    "{selectedReservation.specialNote}"
                  </Text>
                </View>
              ) : null}

              {/* Actions */}
              {selectedReservation?.status === 'cancelled' ? (
                <View style={{ marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{
                      width: '100%',
                      backgroundColor: '#F1F5F9',
                      borderRadius: 14,
                      paddingVertical: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => setSelectedReservation(null)}
                  >
                    <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '800' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      borderRadius: 14,
                      paddingVertical: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      const rId = selectedReservation._id;
                      setSelectedReservation(null);
                      if (onRejectBooking) onRejectBooking(rId);
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '800' }}>Decline Request</Text>
                  </TouchableOpacity>

                  {selectedReservation?.status !== 'confirmed' && (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#16A34A',
                        borderRadius: 14,
                        paddingVertical: 14,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        const b = selectedReservation;
                        setSelectedReservation(null);
                        setConfirmingBooking(b);
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Confirm Stay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Owner Signed Agreement Viewer Modal ── */}
      <Modal
        visible={!!selectedAgreementBooking}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAgreementBooking(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="file-document-check" size={24} color="#6D28D9" style={{ marginRight: 8 }} />
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Tenancy Rental Contract</Text>
                <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>
                  {selectedAgreementBooking?.agreementStatus === 'signed' ? '✓ Digitally Signed by Client' : '⏳ Pending Client Signature'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedAgreementBooking(null)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 18 }} showsVerticalScrollIndicator={false}>
            {/* Header Banner */}
            <View style={{ backgroundColor: '#6D28D9', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' }}>
                OFFICIAL BOARDING RENTAL AGREEMENT
              </Text>
              <Text style={{ color: '#E9D5FF', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                SMRP NESTORA PLATFORM • LEGAL TENANCY RECORD
              </Text>
            </View>

            {/* Digital Signature Card */}
            {selectedAgreementBooking?.agreementStatus === 'signed' ? (
              <View style={{
                backgroundColor: '#F0FDF4',
                borderRadius: 14,
                padding: 16,
                borderWidth: 1.5,
                borderColor: '#86EFAC',
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name="draw" size={22} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#166534', textTransform: 'uppercase' }}>
                    Digital Signature Verification
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  Signed by: {selectedAgreementBooking.signedByName || selectedAgreementBooking.studentName || 'Client'}
                </Text>
                <Text style={{ fontSize: 12, color: '#166534', marginTop: 3 }}>
                  Electronic Signature: <Text style={{ fontStyle: 'italic', fontWeight: '800' }}>"{selectedAgreementBooking.digitalSignature || selectedAgreementBooking.signedByName}"</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                  Timestamp: {new Date(selectedAgreementBooking.signedDate || selectedAgreementBooking.updatedAt).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700', marginTop: 6 }}>
                  ✓ Terms accepted with full legal responsibility.
                </Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: '#FFFBEB',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#FCD34D',
                marginBottom: 16,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                  ⏳ Awaiting Student Signature
                </Text>
                <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                  The client will review and sign this agreement when submitting their payment receipt.
                </Text>
              </View>
            )}

            {/* 1. Property Overview */}
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 6 }}>
                1. Property & Occupancy Details
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>
                {selectedAgreementBooking?.boardingName || selectedAgreementBooking?.boarding?.boardingName || 'Boarding Place'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Location: {selectedAgreementBooking?.boarding?.location || 'Campus Area'}
              </Text>
              <Text style={{ fontSize: 12, color: '#475569', marginTop: 4, fontWeight: '700' }}>
                Reserved: {selectedAgreementBooking?.numberOfRooms || 1} Room(s) • {selectedAgreementBooking?.numberOfBeds || 1} Bed(s) ({selectedAgreementBooking?.roomType || 'Standard'})
              </Text>
            </View>

            {/* 2. Financial Terms */}
            {(() => {
              const beds = selectedAgreementBooking?.numberOfBeds || 1;
              const pricePerBed = parseInt(selectedAgreementBooking?.boarding?.pricePerMonth || 15000, 10);
              const monthlyRent = pricePerBed * beds;
              const doublePayment = monthlyRent * 2;
              return (
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 8 }}>
                    2. Financial & Payment Terms
                  </Text>
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Monthly Rent ({beds} Bed(s)):</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9' }}>Rs. {monthlyRent.toLocaleString()} / mo</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Key Money Security Deposit:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Rs. {monthlyRent.toLocaleString()}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>1st Month Move-In (Double Payment):</Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#6D28D9' }}>Rs. {doublePayment.toLocaleString()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Move-Out Notice Required:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: PURPLE }}>2 Months (60 Days)</Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* 3. 5 Boarding Agreement & Key Money Rules */}
            <View style={{ backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#92400E', textTransform: 'uppercase' }}>
                  3. Key Money & Tenancy Clauses
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>🔑 1st Month Double Payment (Key Money)</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    Upon move-in, the 1st month payment includes 1 month rent + 1 month Key Money security deposit.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>📢 2-Month Move-Out Notice</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    The tenant must notify the boarding owner at least 2 months (60 days) before vacating the property.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>🗓️ 1-Year Minimum Stay Requirement</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    Deposit benefits and final month rent coverage apply only upon completing a 1-year (12-month) stay.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>💸 Last Month Rent Free (After 1 Year)</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    Upon fulfilling the 1-year stay, no rent is due for the final 12th month as it is covered by the key money deposit.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>⚠️ Early Departure Policy (Under 1 Year)</Text>
                  <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 2, lineHeight: 16 }}>
                    Leaving the boarding before 1 full year forfeits the key money deposit in accordance with the agreement.
                  </Text>
                </View>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={{
                backgroundColor: PURPLE,
                borderRadius: 14,
                paddingVertical: 14,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 30,
              }}
              onPress={() => setSelectedAgreementBooking(null)}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Close Contract Viewer</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Owner Payment Slip Receipt Zoom Modal ── */}
      <Modal
        visible={!!selectedReceiptImage}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedReceiptImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.88)', justifyContent: 'center', alignItems: 'center', padding: 18 }}>
          <View style={{ width: '100%', maxWidth: 500, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Payment Slip Receipt</Text>
              <TouchableOpacity onPress={() => setSelectedReceiptImage(null)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              {selectedReceiptImage ? (
                <Image
                  source={{ uri: selectedReceiptImage }}
                  style={{ width: '100%', height: 360, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#E2E8F0' }}
                />
              ) : null}
            </View>

            <View style={{ padding: 16 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: PURPLE,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => setSelectedReceiptImage(null)}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Help & Support Modal ── */}
      <Modal
        visible={helpVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setHelpVisible(false)}
      >
        <ImageBackground
          source={require('../../assets/background.jpg')}
          style={{ flex: 1, width: '100%', height: '100%' }}
          resizeMode="cover"
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.94)' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Feather name="help-circle" size={20} color={PURPLE} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Help & Support</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Owner assistance & platform guidelines</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={{ padding: 6 }}>
              <Feather name="x" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 18 }} showsVerticalScrollIndicator={false}>
            {/* Banner */}
            <View style={{ backgroundColor: PURPLE, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
                How can we help you?
              </Text>
              <Text style={{ color: '#E9D5FF', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                Quick guidance on managing properties, agreements & payments
              </Text>
            </View>

            {/* Quick Contact Options */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 10 }}>
              Direct Support Channels
            </Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = 'tel:+94112345678';
                  } else {
                    Alert.alert('Customer Care Hotline', 'Call +94 11 234 5678?');
                  }
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Feather name="phone-call" size={18} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Owner Support Hotline</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>+94 11 234 5678 • Available 24/7</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = 'mailto:support@nestora.lk';
                  } else {
                    Alert.alert('Email Support', 'Send email to support@nestora.lk?');
                  }
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Feather name="mail" size={18} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Email Support Desk</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>support@nestora.lk</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* FAQs */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 10 }}>
              Frequently Asked Questions
            </Text>

            <View style={{ gap: 10, marginBottom: 24 }}>
              {[
                {
                  q: 'How do I confirm client payments?',
                  a: 'Navigate to Payments tab, click on any client name to expand their payment details, inspect the uploaded bank slip, and tap "Confirm & Approve Payment".'
                },
                {
                  q: 'Where can I find signed tenancy contracts?',
                  a: 'Under each client in the Payments tab, click "View Signed" to review the client electronic signature, timestamp, and terms.'
                },
                {
                  q: 'How does Key Money deposit work?',
                  a: 'The 1st month requires double payment (1st month rent + 1 month Key Money deposit). If the client completes a full 1-year stay, their 12th month rent is waived.'
                },
                {
                  q: 'How to add or edit my boarding places?',
                  a: 'Use the Dashboard tab and tap "+ Add New Boarding" or tap the pencil edit icon on any listed boarding card.'
                },
              ].map((faq, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                    {faq.q}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                    {faq.a}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: PURPLE,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 30,
              }}
              onPress={() => setHelpVisible(false)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </Modal>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 100, // Margin to prevent overlapping with bottom tab bar
  },
  headerContainer: {
    backgroundColor: '#3B0764', // Deep purple fallback matching gradient
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 25,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
  },
  greetingContainer: {
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subGreetingText: {
    color: '#EDE9FE', // Soft purple
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    width: (width - 32 - 16) / 3, // Calculated width for 3 cards per row including paddings
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
    height: 78,
  },
  statCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  statCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  statCardValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statIcon: {
    marginLeft: 4,
  },
  lowerSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reservationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  floorText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A', // Dark blue
    marginRight: 10,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  arrowIcon: {
    alignSelf: 'center',
  },
  reservationBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reservationDetails: {
    flex: 1,
  },
  guestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A', // matching the mockup's guest name style color
  },
  checkInDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#F5F3FF', // light orange
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  statusText: {
    color: PURPLE, // purple
    fontSize: 12,
    fontWeight: '700',
  },
  
  // ── Menu Styles ──
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContent: {
    width: width * 0.75,
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuAvatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  menuAvatar: {
    width: '100%',
    height: '100%',
  },
  menuUserName: {
    fontSize: 22,
    fontWeight: '900',
  },
  menuList: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuItemIcon: {
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 15 : 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  activeTabLabel: {
    color: PURPLE,
    fontWeight: '700',
  },
  addBoardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  addBoardingButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  boardingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  boardingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardingTypeContainer: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
  },
  boardingTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: PURPLE,
  },
  boardingBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardingImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  boardingImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boardingDetails: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  boardingLocation: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  boardingRoomStats: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  boardingPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 25,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    fontWeight: '700',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  deleteButton: {
    padding: 6,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reservationDetailBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  reservationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  reservationValue: {
    fontWeight: '500',
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  declineButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
  confirmButton: {
    backgroundColor: PURPLE,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextConfirmed: {
    color: '#059669',
  },
  statusTextRejected: {
    color: '#DC2626',
  },
});
