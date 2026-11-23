import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StatusBar,
  TextInput,
  Dimensions,
  Platform,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateBookingApi } from '../services/bookingService';
import SidebarSectionModals from '../components/SidebarSectionModals';
import BookingActionNotice, { useBookingViewPreferences } from '../components/BookingActionNotice';
import PaymentDateField from '../components/PaymentDateField';

const { width } = Dimensions.get('window');

export default function EmployeeDashboardScreen({
  currentUser,
  boardings = [],
  onLogout,
  onViewBoarding,
  savedBoardingIds = [],
  onToggleSave,
  bookings = [],
  onReloadBookings,
  onSubmitAgreementAndPayment,
  onSubmitMonthlyPayment,
  onCancelBooking,
}) {
  const [userState, setUserState] = useState(currentUser);
  const activeUser = userState || currentUser;
  const [activeFilter, setActiveFilter] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuModal, setActiveMenuModal] = useState(null);
  const [activeBookingMenu, setActiveBookingMenu] = useState(null);
  const [bookingTab, setBookingTab] = useState('Active'); // Active or All
  const [searchText, setSearchText] = useState('');
  const [bookingSearchText, setBookingSearchText] = useState('');
  const {
    pinnedBookingIds,
    clearedBookingIds,
    clearNotice,
    togglePinned,
    clearBooking,
    undoClear,
  } = useBookingViewPreferences(activeUser);

  // In-app confirmation dialog for cross-platform reliability (web & mobile)
  const [confirmDialog, setConfirmDialog] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmColor: '#DC2626',
    onConfirm: null,
  });

  const handleShareBoarding = async (item) => {
    const title = item.boardingName || 'Nestora Boarding';
    const message = `Check out ${title} in ${item.location || 'Sri Lanka'} for Rs. ${parseInt(item.pricePerMonth || 0).toLocaleString()}/month on Nestora!`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title, text: message, url: window.location.href });
          return;
        } catch (e) {}
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${title} - ${message}`);
        alert('📋 Boarding details copied to clipboard!');
      } else {
        alert(message);
      }
    } else {
      try {
        await Share.share({ title, message });
      } catch (err) {
        console.log('Share error:', err);
      }
    }
  };

  const firstName = activeUser?.fullName?.split(' ')[0]
    || activeUser?.email?.split('@')[0]
    || 'Employee';

  const stats = [
    {
      id: 'saved',
      icon: 'heart',
      label: 'Saveds',
      value: String(savedBoardingIds.length),
      iconColor: '#005B66',
    },
    {
      id: 'bookings',
      icon: 'calendar',
      label: 'Bookings',
      value: String(bookings.length),
      iconColor: '#005B66',
    },
  ];

  // Filter list depending on active filter and search text
  let baseBoardings = activeFilter === 'saved'
    ? boardings.filter((b) => savedBoardingIds.includes(b._id))
    : boardings;

  const filteredBoardings = searchText.trim() === ''
    ? baseBoardings
    : baseBoardings.filter(b => {
      const q = searchText.toLowerCase();
      return (b.location && b.location.toLowerCase().includes(q)) ||
        (b.boardingName && b.boardingName.toLowerCase().includes(q));
    });

  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
  const [paidBookingIds, setPaidBookingIds] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [paymentBranch, setPaymentBranch] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // OTP flow states for 1st-month card payment
  const [cardStep, setCardStep] = useState('details'); // 'details' | 'otp' | 'success'
  const [cardHolder, setCardHolder] = useState(currentUser?.fullName || 'Employee Tenant');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState('');

  // OTP flow states for monthly card payment
  const [monthlyCardStep, setMonthlyCardStep] = useState('details'); // 'details' | 'otp' | 'success'
  const [monthlyCardHolder, setMonthlyCardHolder] = useState(currentUser?.fullName || 'Employee Tenant');
  const [monthlyCardNumber, setMonthlyCardNumber] = useState('');
  const [monthlyCardExpiry, setMonthlyCardExpiry] = useState('');
  const [monthlyCardCvv, setMonthlyCardCvv] = useState('');
  const [monthlyOtpValue, setMonthlyOtpValue] = useState('');
  const [monthlyGeneratedOtp, setMonthlyGeneratedOtp] = useState('');
  const [monthlyOtpTimer, setMonthlyOtpTimer] = useState(60);
  const [monthlyOtpError, setMonthlyOtpError] = useState('');

  // Timer countdowns for OTP
  useEffect(() => {
    let interval = null;
    if (cardStep === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cardStep, otpTimer]);

  useEffect(() => {
    let interval = null;
    if (monthlyCardStep === 'otp' && monthlyOtpTimer > 0) {
      interval = setInterval(() => {
        setMonthlyOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [monthlyCardStep, monthlyOtpTimer]);

  const handleSendMoveInOtp = () => {
    if (!signatureName.trim()) {
      Alert.alert('Digital Signature Required', 'Please enter your Full Legal Name to digitally sign the agreement.');
      return;
    }
    if (!hasAgreedToRules) {
      Alert.alert('Agreement Required', 'Please check the box to agree to the Tenancy Agreement & Key Money Rules.');
      return;
    }
    const cleanCard = String(cardNumber || '').replace(/\s+/g, '');
    if (cleanCard.length < 12) {
      Alert.alert('Card Details', 'Please provide a valid card number.');
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpValue('');
    setOtpError('');
    setOtpTimer(60);
    setCardStep('otp');
  };

  const handleSendMonthlyOtp = () => {
    const cleanCard = String(monthlyCardNumber || '').replace(/\s+/g, '');
    if (cleanCard.length < 12) {
      Alert.alert('Card Details', 'Please provide a valid card number.');
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setMonthlyGeneratedOtp(code);
    setMonthlyOtpValue('');
    setMonthlyOtpError('');
    setMonthlyOtpTimer(60);
    setMonthlyCardStep('otp');
  };

  // Tenancy Agreement & Payment Slip states
  const [signatureName, setSignatureName] = useState(currentUser?.fullName || currentUser?.name || '');
  const [hasAgreedToRules, setHasAgreedToRules] = useState(false);
  const [slipImage, setSlipImage] = useState(null);
  const [selectedMonthlyBooking, setSelectedMonthlyBooking] = useState(null);
  const [selectedMonthToPay, setSelectedMonthToPay] = useState(2);
  const [monthlyPaymentMethod, setMonthlyPaymentMethod] = useState('bank');
  const [monthlySlipImage, setMonthlySlipImage] = useState(null);
  const [isProcessingMonthly, setIsProcessingMonthly] = useState(false);
  const [selectedAgreementPreview, setSelectedAgreementPreview] = useState(null);

  const pickSlipImage = async (forMonthly = false) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery access is required to attach your payment slip.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert('Could not attach slip', 'This image could not be prepared for upload. Choose another image and try again.');
          return;
        }
        const mimeType = asset.mimeType || 'image/jpeg';
        const b64 = `data:${mimeType};base64,${asset.base64}`;
        if (forMonthly) {
          setMonthlySlipImage(b64);
        } else {
          setSlipImage(b64);
        }
      }
    } catch (e) {
      console.log('Pick slip error:', e);
      Alert.alert('Could not attach slip', 'Choose an image from your photo library and try again.');
    }
  };

  // Booking Details & Edit/Resend state
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [editPhone, setEditPhone] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const openBookingDetails = (booking) => {
    setSelectedBookingDetails(booking);
    setEditPhone(booking.studentPhone || currentUser?.phone || '');
    setEditNote(booking.specialNote || '');
    setUpdateSuccess(false);
  };

  const renderBookingCard = (booking) => {
    let statusLabel = 'Pending';
    let statusColor = '#D97706';
    let statusBg = '#FEF3C7';

    const isConfirmed = booking.status === 'confirmed';
    const isPaid = paidBookingIds.includes(booking._id) || booking.status === 'paid';

    if (isConfirmed) {
      statusLabel = 'Confirmed';
      statusColor = '#10B981';
      statusBg = '#ECFDF5';
    } else if (booking.status === 'completed' || isPaid) {
      statusLabel = 'Active Stay';
      statusColor = '#10B981';
      statusBg = '#ECFDF5';
    } else if (booking.status === 'rejected' || booking.status === 'cancelled') {
      statusLabel = 'Cancelled';
      statusColor = '#EF4444';
      statusBg = '#FEF2F2';
    }

    const dateObj = new Date(booking.createdAt || Date.now());
    const checkinDateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const roomsCount = booking.numberOfRooms || 1;
    const bedsCount = booking.numberOfBeds || 1;
    const roomType = booking.roomType || 'Separate Rooms';
    const pricePerBed = parseInt(booking.boarding?.pricePerMonth || 0, 10);
    const totalMonthlyAmount = pricePerBed ? pricePerBed * bedsCount : 15000;

    return (
      <View
        key={booking._id}
        style={[styles.mockupCard, { flexDirection: 'column', padding: 16, marginBottom: 16, position: 'relative', zIndex: activeBookingMenu === booking._id ? 100 : 1, elevation: activeBookingMenu === booking._id ? 100 : 3 }]}
        onContextMenu={Platform.OS === 'web' ? (event) => {
          event.preventDefault();
          event.stopPropagation();
          setActiveBookingMenu(booking._id);
        } : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            activeOpacity={0.88}
            onPress={() => openBookingDetails(booking)}
            onLongPress={() => setActiveBookingMenu(booking._id)}
            delayLongPress={350}
          >
            <View style={styles.mockupImageWrapper}>
              {booking.boarding?.coverImage ? (
                <Image source={{ uri: booking.boarding.coverImage }} style={styles.mockupImage} />
              ) : (
                <View style={[styles.mockupImage, { backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="home-outline" size={24} color="#005B66" />
                </View>
              )}
            </View>

            <View style={[styles.mockupInfo, { flex: 1 }]}>
              <View style={styles.mockupTitleRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  {pinnedBookingIds.includes(String(booking._id)) && (
                    <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#6D28D9' }}>📌 PINNED</Text>
                    </View>
                  )}
                  <Text style={styles.mockupTitle} numberOfLines={1}>{booking.boardingName || booking.boarding?.boardingName || 'Boarding Place'}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Action Box: details, pin, clear, and cancel active reservations */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative', zIndex: 9999 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: activeBookingMenu === booking._id ? '#EDE9FE' : '#F8FAFC',
                borderWidth: 1,
                borderColor: activeBookingMenu === booking._id ? '#C4B5FD' : '#E2E8F0',
              }}
              onPress={() => {
                setActiveBookingMenu(prev => prev === booking._id ? null : booking._id);
              }}
              onLongPress={() => setActiveBookingMenu(booking._id)}
              delayLongPress={350}
              title="Booking Options"
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={18}
                color="#005B66"
              />
              <Feather name="chevron-down" size={12} color="#005B66" style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openBookingDetails(booking)} style={{ padding: 4 }}>
              <Feather name="chevron-right" size={18} color="#005B66" />
            </TouchableOpacity>


          </View>
        </View>
        

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={[styles.mockupBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.mockupBadgeText, { color: statusColor }]}>
              {isConfirmed ? '✓ CONFIRMED STAY' : statusLabel.toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
            {checkinDateStr}
          </Text>
        </View>

        {/* Configuration Details & Accommodation Breakdown */}
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#005B66', textTransform: 'uppercase' }}>
              Accommodation Details
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
              {roomsCount} Room(s) with {bedsCount} Bed(s)
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#B2DFDB' }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#005B66' }}>🏠 {roomsCount} Room(s)</Text>
            </View>
            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#1D4ED8' }}>🛏️ {bedsCount} Bed(s)</Text>
            </View>
            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>📋 {roomType}</Text>
            </View>
          </View>

          {/* Full Payment Breakdown with Monthly Fee, Key Money, and Full Payment */}
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Monthly Fee:</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>Rs. {totalMonthlyAmount.toLocaleString()} / mo</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Key Money (Deposit):</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>Rs. {totalMonthlyAmount.toLocaleString()}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 5 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#005B66' }}>Full Payment (1st Month):</Text>
                <Text style={{ fontSize: 10, color: '#004D40', fontWeight: '600' }}>Monthly Fee + Key Money</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#005B66' }}>
                Rs. {(totalMonthlyAmount * 2).toLocaleString()}
              </Text>
            </View>
          </View>

          {booking.specialNote ? (
            <View style={{ marginTop: 8, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                Note: "{booking.specialNote}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* 💳 Payment & Tenancy Agreement Section for Confirmed Stays */}
        {isConfirmed ? (() => {
          const isAgreementSigned = booking.agreementStatus === 'signed';
          const isMonth1Confirmed = booking.paymentStatus === 'confirmed' || paidBookingIds.includes(booking._id) ||
            (booking.payments && booking.payments.some(p => p.monthNumber === 1 && p.status === 'confirmed'));
          const isMonth1Pending = !isMonth1Confirmed && (
            booking.paymentStatus === 'pending_confirmation' ||
            (booking.payments && booking.payments.some(p => p.monthNumber === 1 && p.status === 'pending_confirmation'))
          );

          return (
            <View style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: isMonth1Confirmed ? '#ECFDF5' : (isMonth1Pending ? '#FFFBEB' : '#E0F2F1'),
              borderWidth: 1.5,
              borderColor: isMonth1Confirmed ? '#10B981' : (isMonth1Pending ? '#FCD34D' : '#005B66'),
            }}>
              {/* Header Status */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather
                    name={isMonth1Confirmed ? 'check-circle' : (isMonth1Pending ? 'clock' : 'alert-circle')}
                    size={16}
                    color={isMonth1Confirmed ? '#059669' : (isMonth1Pending ? '#D97706' : '#005B66')}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isMonth1Confirmed ? '#059669' : (isMonth1Pending ? '#92400E' : '#005B66'),
                    textTransform: 'uppercase',
                  }}>
                    {isMonth1Confirmed
                      ? '✓ Stay Confirmed & Move-In Ready'
                      : (isMonth1Pending
                          ? '⏳ Payment Slip Under Owner Review'
                          : 'Action Required: Sign Agreement & Pay')}
                  </Text>
                </View>

                {isAgreementSigned && (
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#16A34A' }}>✓ AGREEMENT SIGNED</Text>
                  </View>
                )}
              </View>

              {/* Description & Action */}
              {!isMonth1Confirmed && !isMonth1Pending ? (
                <View>
                  <Text style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 16 }}>
                    To finalize your boarding place, review and digitally sign the Tenancy Agreement and submit your 1st month payment slip.
                  </Text>
                  <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                      1st Month Total: <Text style={{ color: '#005B66' }}>Rs. {(totalMonthlyAmount * 2).toLocaleString()}</Text>
                    </Text>

                    <TouchableOpacity
                      style={{
                        backgroundColor: '#005B66',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: '#005B66',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                      onPress={() => {
                        setSelectedPaymentBooking(booking);
                        setSignatureName(currentUser?.fullName || currentUser?.name || '');
                        setHasAgreedToRules(false);
                        setSlipImage(null);
                        setPaymentSuccess(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Feather name="file-text" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Sign & Pay Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isMonth1Pending ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 16 }}>
                    Your signed agreement and payment receipt have been sent to the owner. The owner will review the slip and approve your stay shortly.
                  </Text>
                </View>
              ) : (
                /* Month 1 Confirmed - Show Continuous Monthly Payments Tracker */
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>
                    1st Month Move-In & Key Money Deposit (Rs. {(totalMonthlyAmount * 2).toLocaleString()}) has been confirmed by the owner!
                  </Text>

                  {/* Monthly Payments Tracker */}
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857', textTransform: 'uppercase', marginBottom: 6 }}>
                      Continuous Monthly Rent Ledger
                    </Text>

                    {/* Month 2 Status */}
                    {(() => {
                      const m2Record = (booking.payments || []).find(p => p.monthNumber === 2);
                      const isM2Confirmed = m2Record?.status === 'confirmed';
                      const isM2Pending = m2Record?.status === 'pending_confirmation';

                      return (
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#FFFFFF',
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isM2Confirmed ? '#BBF7D0' : (isM2Pending ? '#FDE68A' : '#E2E8F0'),
                          marginTop: 4,
                        }}>
                          <View>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Month 2 (Monthly Rent)</Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>Rs. {totalMonthlyAmount.toLocaleString()} / mo</Text>
                          </View>

                          {isM2Confirmed ? (
                            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>✓ PAID</Text>
                            </View>
                          ) : isM2Pending ? (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>⏳ SLIP IN REVIEW</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#005B66',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                              onPress={() => {
                                setSelectedMonthlyBooking(booking);
                                setSelectedMonthToPay(2);
                                setMonthlySlipImage(null);
                              }}
                            >
                              <Feather name="upload" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Pay Month 2</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}
            </View>
          );
        })() : booking.status === 'pending' ? (
          <View style={{ marginTop: 10, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FEF3C7', flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="clock" size={14} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700', flex: 1 }}>
              Pending Owner Approval • Agreement & payment section activates once accepted
            </Text>
          </View>
        ) : null}

        {activeBookingMenu === booking._id && (
          <View style={{
            position: 'absolute',
            top: 68,
            right: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 20,
            zIndex: 99999,
            borderWidth: 1,
            borderColor: '#EDE9FE',
            minWidth: 145,
          }}>
            <Pressable
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, backgroundColor: pressed ? '#F3E8FF' : 'transparent' })}
              onPress={() => {
                setActiveBookingMenu(null);
                openBookingDetails(booking);
              }}
            >
              <Feather name="file-text" size={15} color="#6D28D9" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D28D9' }}>View details</Text>
            </Pressable>

            {/* Pin or unpin the booking */}
            <Pressable
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: pinnedBookingIds.includes(String(booking._id)) ? '#EDE9FE' : pressed ? '#F3E8FF' : 'transparent',
              })}
              onPress={() => {
                setActiveBookingMenu(null);
                togglePinned(booking._id);
              }}
            >
              <MaterialCommunityIcons
                name={pinnedBookingIds.includes(String(booking._id)) ? 'pin-off' : 'pin'}
                size={16}
                color="#6D28D9"
                style={{ marginRight: 8 }}
              />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D28D9' }}>
                {pinnedBookingIds.includes(String(booking._id)) ? 'Unpin' : 'Pin'}
              </Text>
            </Pressable>

            {/* Hide the booking from this list */}
            <Pressable
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: pressed ? '#F3E8FF' : 'transparent',
              })}
              onPress={() => {
                setActiveBookingMenu(null);
                clearBooking(booking._id, booking.boardingName || booking.boarding?.boardingName || 'Booking');
              }}
            >
              <Feather name="trash-2" size={15} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Clear</Text>
            </Pressable>

            {['pending', 'confirmed'].includes(booking.status) && onCancelBooking ? (
              <>
                <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 3 }} />
                <Pressable
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, backgroundColor: pressed ? '#FEF2F2' : 'transparent' })}
                  onPress={() => {
                    setActiveBookingMenu(null);
                    const cancel = () => onCancelBooking(booking._id, 'Cancelled by client');
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      if (window.confirm('Cancel this reservation? The owner will see it in Rejected bookings.')) cancel();
                    } else {
                      Alert.alert('Cancel reservation?', 'The owner will be notified and this reservation will appear in Rejected bookings.', [
                        { text: 'Keep reservation', style: 'cancel' },
                        { text: 'Cancel reservation', style: 'destructive', onPress: cancel },
                      ]);
                    }
                  }}
                >
                  <Feather name="x-circle" size={14} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Cancel reservation</Text>
                </Pressable>
              </>
            ) : null}

          </View>
        )}
      </View>
    );
  };

  const renderBoardingCard = (item) => {
    const isSaved = savedBoardingIds.includes(item._id);

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.propertyCard}
        activeOpacity={0.88}
        onPress={() => onViewBoarding && onViewBoarding(item)}
      >
        {/* Top-Right Action Buttons: Save & Share */}
        <View style={{
          position: 'absolute',
          top: 12,
          right: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          zIndex: 10,
        }}>
          {/* Share Button */}
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={(e) => {
              e?.stopPropagation && e.stopPropagation();
              handleShareBoarding(item);
            }}
            title="Share Boarding"
          >
            <Feather name="share-2" size={15} color="#64748B" />
          </TouchableOpacity>

          {/* Save (Heart) Button */}
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isSaved ? '#FEE2E2' : '#F8FAFC',
              borderWidth: 1,
              borderColor: isSaved ? '#FECACA' : '#E2E8F0',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={(e) => {
              e?.stopPropagation && e.stopPropagation();
              if (onToggleSave) onToggleSave(item._id);
            }}
            title={isSaved ? "Saved" : "Save"}
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={17}
              color={isSaved ? "#EF4444" : "#64748B"}
            />
          </TouchableOpacity>
        </View>

        {/* Property Image */}
        <View style={styles.propertyImageWrapper}>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.propertyImage} />
          ) : (
            <View style={styles.propertyImagePlaceholder}>
              <Ionicons name="home-outline" size={32} color="#005B66" />
            </View>
          )}
        </View>

        {/* Property Info */}
        <View style={[styles.propertyInfo, { paddingRight: 74 }]}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.boardingType}</Text>
          </View>
          <Text style={styles.propertyName} numberOfLines={1}>{item.boardingName}</Text>

          <View style={styles.propertyLocationRow}>
            <Feather name="map-pin" size={11} color="#94A3B8" style={{ marginRight: 3 }} />
            <Text style={styles.propertyLocation} numberOfLines={1}>{item.location}</Text>
          </View>

          <Text style={styles.propertyPrice}>
            Rs. {parseInt(item.pricePerMonth || 0).toLocaleString()}{' '}
            <Text style={styles.propertyPriceSuffix}>/ month (per bed)</Text>
          </Text>

          <View style={styles.propertyMeta}>
            <Text style={styles.roomsText}>
              Avail: {item.availableRooms !== undefined ? item.availableRooms : (item.totalRooms || 0)} Rooms • {item.availableBeds !== undefined ? item.availableBeds : (item.totalBeds || 0)} Beds
            </Text>
          </View>
          <Text style={[styles.roomsText, { color: '#005B66', marginTop: 2, fontSize: 10, fontWeight: '700' }]}>
            • {item.bedsPerRoom || 'One Room per Bed (1 Bed/Room)'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        {activeFilter === 'bookings' ? (
          <ImageBackground
            source={require('../../assets/purple_wave_header.png')}
            style={styles.headerContainer}
            imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
            resizeMode="cover"
          >
            <SafeAreaView>
              {/* Bookings Top Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => setActiveFilter('all')}>
                  <Feather name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar" size={20} color="#E9D5FF" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>My Bookings</Text>
                </View>

                <View style={{ width: 36 }} />
              </View>

              {/* Bookings Search Bar */}
              <View style={[styles.searchBar, { marginTop: 8, marginBottom: 14 }]}>
                <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bookings by name or location..."
                  placeholderTextColor="#CBD5E1"
                  value={bookingSearchText}
                  onChangeText={setBookingSearchText}
                />
                {bookingSearchText.trim() !== '' && (
                  <TouchableOpacity onPress={() => setBookingSearchText('')} style={{ padding: 4 }}>
                    <Feather name="x" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Keep active requests and past outcomes together without a separate cancellation tab. */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['Active', 'All'].map(tab => {
                  const isActive = bookingTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: isActive ? '#005B66' : 'rgba(255,255,255,0.18)',
                        borderWidth: 1.5,
                        borderColor: isActive ? '#5EEAD4' : 'rgba(255,255,255,0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setBookingTab(tab)}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isActive ? '#FFFFFF' : '#E9D5FF',
                      }}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SafeAreaView>
          </ImageBackground>
        ) : activeFilter === 'saved' ? (
          <ImageBackground
            source={require('../../assets/purple_wave_header.png')}
            style={styles.headerContainer}
            imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
            resizeMode="cover"
          >
            <SafeAreaView>
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => setActiveFilter('all')}>
                  <Feather name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="heart" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>Saved Boardings</Text>
                </View>

                <View style={{ width: 36 }} />
              </View>

              {/* Search in Saved */}
              <View style={[styles.searchBar, { marginTop: 10 }]}>
                <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search saved places..."
                  placeholderTextColor="#CBD5E1"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                <TouchableOpacity style={[styles.searchButton, { backgroundColor: '#005B66' }]}>
                  <Feather name="search" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </ImageBackground>
        ) : activeFilter === 'notifications' ? (
          <ImageBackground
            source={require('../../assets/purple_wave_header.png')}
            style={styles.headerContainer}
            imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
            resizeMode="cover"
          >
            <SafeAreaView>
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => setActiveFilter('all')}>
                  <Feather name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="bell" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>Notifications</Text>
                </View>

                <View style={{ width: 36 }} />
              </View>
            </SafeAreaView>
          </ImageBackground>
        ) : activeFilter === 'profile' ? (
          null
        ) : (
          <>
            {/* ── Dark Purple to Light Purple Header (Picture 3 Theme) ── */}
            <ImageBackground
              source={require('../../assets/purple_wave_header.png')}
              style={styles.headerContainer}
              imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
              resizeMode="cover"
            >
              <SafeAreaView>
                {/* Top Bar with Menu on Left, Nestora Logo in Middle, Saved & Notification in Right */}
                <View style={styles.topBar}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuOpen(true)}>
                    <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Clear Nestora brand lockup on a soft light pill */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 32, backgroundColor: 'rgba(250, 248, 255, 0.98)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', shadowColor: '#1E104A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }} accessibilityLabel="SMRP Nestora">
                    <Image source={require('../../assets/nestora_mark.png')} style={{ width: 40, height: 44, resizeMode: 'contain', marginRight: 8 }} />
                    <View style={{ alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
                        <View style={{ width: 12, height: 2, backgroundColor: '#6D28D9' }} />
                        <Text style={{ color: '#5B21B6', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginHorizontal: 5 }}>SMRP</Text>
                        <View style={{ width: 12, height: 2, backgroundColor: '#0D9488' }} />
                      </View>
                      <Text style={{ color: '#111B55', fontSize: 19, fontWeight: '900', letterSpacing: -0.5, lineHeight: 21 }}>Nestora</Text>
                      <Text style={{ fontSize: 7, fontWeight: '900', letterSpacing: 0.6 }}>
                        <Text style={{ color: '#5B21B6' }}>FIND. </Text><Text style={{ color: '#0D9488' }}>BOOK. </Text><Text style={{ color: '#D97706' }}>STAY.</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Right Hand Corner: Save section & Notification section (Full White on click) */}
                  <View style={styles.topBarRight}>
                    {/* Save Section */}
                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        {
                          position: 'relative',
                          marginRight: 4,
                          backgroundColor: activeFilter === 'saved' ? 'rgba(255,255,255,0.25)' : 'transparent',
                          borderRadius: 20,
                        }
                      ]}
                      onPress={() => setActiveFilter(activeFilter === 'saved' ? 'all' : 'saved')}
                    >
                      <Feather
                        name="heart"
                        size={22}
                        color="#FFFFFF"
                      />
                      {savedBoardingIds.length > 0 && (
                        <View style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 9,
                          minWidth: 18,
                          height: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 3,
                          borderWidth: 1.5,
                          borderColor: '#005B66',
                        }}>
                          <Text style={{ color: '#005B66', fontSize: 10, fontWeight: '800' }}>
                            {savedBoardingIds.length}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Notification Section */}
                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        {
                          position: 'relative',
                          backgroundColor: activeFilter === 'notifications' ? 'rgba(255,255,255,0.25)' : 'transparent',
                          borderRadius: 20,
                        }
                      ]}
                      onPress={() => setActiveFilter(activeFilter === 'notifications' ? 'all' : 'notifications')}
                    >
                      <Feather name="bell" size={22} color="#FFFFFF" />
                      {bookings.some(b => b.status === 'confirmed' || b.status === 'rejected') && (
                        <View style={[styles.notifDot, { backgroundColor: '#FFFFFF', borderColor: '#005B66' }]} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchBar, { marginTop: 14 }]}>
                  <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by location"
                    placeholderTextColor="#CBD5E1"
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                  <TouchableOpacity style={[styles.searchButton, { backgroundColor: '#005B66' }]}>
                    <Feather name="search" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </ImageBackground>

            {/* ── Stats Row ── */}

          </>
        )}

        {/* ── Main List Area ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {activeFilter !== 'bookings' && (
              <Text style={styles.sectionTitle}>
                {activeFilter === 'saved' ? 'Saved Boardings' : 'Available Boardings'}
              </Text>
            )}
            {activeFilter !== 'all' && activeFilter !== 'bookings' && (
              <TouchableOpacity onPress={() => setActiveFilter('all')}>
                <Text style={styles.viewAllText}>Show All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Main List mappings */}
          {activeFilter === 'notifications' ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <View style={{ backgroundColor: '#E0F2FE', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Feather name="bell" size={28} color="#005B66" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>No Notifications Yet</Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 30 }}>
                You'll receive notifications when your booking status changes or when there are updates from boarding owners.
              </Text>
              {bookings.filter(b => b.status === 'confirmed' || b.status === 'rejected').length > 0 && (
                <View style={{ width: '100%', marginTop: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>Recent Updates</Text>
                  {bookings.filter(b => b.status === 'confirmed' || b.status === 'rejected').map((b, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: b.status === 'confirmed' ? '#ECFDF5' : '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: b.status === 'confirmed' ? '#D1FAE5' : '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Feather name={b.status === 'confirmed' ? 'check-circle' : 'x-circle'} size={18} color={b.status === 'confirmed' ? '#059669' : '#DC2626'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Booking {b.status === 'confirmed' ? 'Confirmed' : 'Rejected'}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{b.boardingName || 'Boarding Place'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : activeFilter === 'profile' ? (
            <View style={{ paddingVertical: 20 }}>
              {/* Profile Avatar & Name */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity
                  style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#005B66', overflow: 'hidden' }}
                  onPress={() => setActiveMenuModal('edit_profile')}
                  activeOpacity={0.8}
                >
                  {activeUser?.profilePicture ? (
                    <Image source={{ uri: activeUser.profilePicture }} style={{ width: '100%', height: '100%', borderRadius: 42 }} />
                  ) : (
                    <Feather name="user" size={36} color="#005B66" />
                  )}
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>{activeUser?.fullName || firstName}</Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{currentUser?.email || 'employee@email.com'}</Text>
                <View style={{ marginTop: 6, backgroundColor: '#F3E8FF', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#005B66', textTransform: 'uppercase' }}>{currentUser?.role || 'Employee'}</Text>
                </View>
              </View>

              {/* Account Info */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Account Info</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Feather name="mail" size={18} color="#005B66" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>Email</Text>
                    <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>{currentUser?.email || 'N/A'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Feather name="phone" size={18} color="#005B66" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>Phone</Text>
                    <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>{currentUser?.phone || currentUser?.contactNumber || 'Not set'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                  <Feather name="bookmark" size={18} color="#005B66" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>Activity</Text>
                    <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>{savedBoardingIds.length} Saved • {bookings.length} Bookings</Text>
                  </View>
                </View>
              </View>

              {/* Quick Actions - with working onPress handlers */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Quick Actions</Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }} onPress={() => { setActiveMenuModal('edit_profile'); }}>
                  <Feather name="edit-3" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '600' }}>Edit Profile</Text>
                  <Feather name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }} onPress={() => { setActiveMenuModal('security'); }}>
                  <Feather name="lock" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '600' }}>Change Password</Text>
                  <Feather name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }} onPress={() => { setHelpVisible(true); }}>
                  <Feather name="help-circle" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '600' }}>Help & Support</Text>
                  <Feather name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={() => onLogout && onLogout()}>
                  <Feather name="log-out" size={18} color="#DC2626" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '700' }}>Logout</Text>
                  <Feather name="chevron-right" size={18} color="#FCA5A5" />
                </TouchableOpacity>
              </View>
            </View>
          ) : activeFilter === 'bookings' ? (() => {
            const tabBookings = bookings
              .filter(b => !clearedBookingIds.includes(String(b._id)))
              .filter(b => {
                if (bookingTab === 'Active') return b.status === 'pending' || b.status === 'confirmed' || b.status === 'completed' || b.status === 'paid';
                return true;
              });

            const searchedBookings = bookingSearchText.trim() === ''
              ? tabBookings
              : tabBookings.filter(b => {
                  const q = bookingSearchText.toLowerCase();
                  const name = (b.boardingName || b.boarding?.boardingName || '').toLowerCase();
                  const loc = (b.location || b.boarding?.location || '').toLowerCase();
                  return name.includes(q) || loc.includes(q);
                });

            // Sort pinned bookings to the top
            const sortedBookings = [...searchedBookings].sort((a, b) => {
              const aPinned = pinnedBookingIds.includes(String(a._id));
              const bPinned = pinnedBookingIds.includes(String(b._id));
              if (aPinned && !bPinned) return -1;
              if (!aPinned && bPinned) return 1;
              return 0;
            });

            return sortedBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>
                  {bookingSearchText.trim() !== ''
                    ? `No ${bookingTab.toLowerCase()} bookings match "${bookingSearchText}"`
                    : `No ${bookingTab.toLowerCase()} bookings found.`}
                </Text>
                <Text style={styles.emptyStateSub}>
                  {bookingSearchText.trim() !== ''
                    ? 'Try searching with a different keyword or location.'
                    : 'Tap any boarding place card and select "Inquire / Book" to start!'}
                </Text>
              </View>
            ) : (
              <View style={{ position: 'relative' }}>
                {activeBookingMenu && (
                  <TouchableOpacity
                    style={[StyleSheet.absoluteFillObject, { zIndex: 50, elevation: 50 }]}
                    activeOpacity={1}
                    onPress={() => setActiveBookingMenu(null)}
                  />
                )}
                {sortedBookings.map(renderBookingCard)}
              </View>
            );
          })() : (
            filteredBoardings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="home-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>
                  {activeFilter === 'saved' ? 'No saved boardings yet.' : 'No boarding places available yet.'}
                </Text>
                <Text style={styles.emptyStateSub}>
                  {activeFilter === 'saved' ? 'Go back and click the heart icon to save!' : 'Check back soon!'}
                </Text>
              </View>
            ) : (
              filteredBoardings.map(renderBoardingCard)
            )
          )}
        </View>
      </ScrollView>

      <BookingActionNotice notice={clearNotice} onUndo={undoClear} />

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveFilter('all')}
        >
          <Feather name="home" size={22} color={activeFilter === 'all' || activeFilter === 'saved' ? '#005B66' : '#94A3B8'} />
          <Text style={[styles.tabLabel, (activeFilter === 'all' || activeFilter === 'saved') && styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveFilter('bookings')}
        >
          <Feather name="calendar" size={22} color={activeFilter === 'bookings' ? '#005B66' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeFilter === 'bookings' && styles.activeTabLabel]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveFilter('profile')}
        >
          <Feather name="user" size={22} color={activeFilter === 'profile' ? '#005B66' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeFilter === 'profile' && styles.activeTabLabel]}>Profile</Text>
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
                  <Text style={[styles.menuUserName, {color: '#005B66'}]}>{firstName || 'Employee'}</Text>
                  <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>{activeUser?.role || 'Corporate Resident'}</Text>
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
                    <Feather name="user" size={20} color="#005B66" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('security');
                    }}
                  >
                    <Feather name="lock" size={20} color="#005B66" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Security Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('notifications');
                    }}
                  >
                    <Feather name="bell" size={20} color="#005B66" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Notification Preferences</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('verification');
                    }}
                  >
                    <Feather name="shield" size={20} color="#005B66" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Verification Center</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      setActiveMenuModal('account');
                    }}
                  >
                    <Feather name="settings" size={20} color="#005B66" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { fontWeight: '600' }]}>Account Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuOpen(false);
                      alert('Nestora Support: For assistance, email support@nestora.lk or call +94 11 234 5678.');
                    }}
                  >
                    <Feather name="help-circle" size={20} color="#005B66" style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { color: '#005B66', fontWeight: '700' }]}>Help & Support</Text>
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
        themeColor="#005B66"
      />

      {/* ── Secure Payment Modal ── */}
      <Modal
        visible={!!selectedPaymentBooking}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedPaymentBooking(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            maxHeight: '90%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Feather name="credit-card" size={20} color="#005B66" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Online Rent Payment</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>SMRP Nestora Secure Checkout</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedPaymentBooking(null)} style={{ padding: 4 }}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {paymentSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Feather name="check" size={36} color="#16A34A" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>Payment Successful!</Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                  Your rent payment of Rs. {selectedPaymentBooking ? ((selectedPaymentBooking.numberOfBeds || 1) * parseInt(selectedPaymentBooking.boarding?.pricePerMonth || 15000)).toLocaleString() : '0'} has been processed. Your stay is now active!
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#005B66',
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                    marginTop: 24,
                    width: '100%',
                    alignItems: 'center',
                  }}
                  onPress={() => setSelectedPaymentBooking(null)}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Stay Summary & Cost Breakdown */}
                {(() => {
                  const pBeds = selectedPaymentBooking?.numberOfBeds || 1;
                  const pMonthly = (selectedPaymentBooking ? (pBeds * parseInt(selectedPaymentBooking.boarding?.pricePerMonth || 15000)) : 15000);
                  const pTotal = pMonthly * 2;
                  return (
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                        {selectedPaymentBooking?.boardingName || selectedPaymentBooking?.boarding?.boardingName || 'Boarding Place'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        Reserved: {selectedPaymentBooking?.numberOfRooms || 1} Room(s) • {pBeds} Bed(s) ({selectedPaymentBooking?.roomType || 'Separate Rooms'})
                      </Text>
                      
                      <View style={{ backgroundColor: '#E0F2F1', borderRadius: 10, padding: 10, marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: '#004D40', fontWeight: '600' }}>Monthly Fee:</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#004D40' }}>Rs. {pMonthly.toLocaleString()} / mo</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: '#004D40', fontWeight: '600' }}>Key Money (Deposit):</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#004D40' }}>Rs. {pMonthly.toLocaleString()}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: '#B2DFDB', marginVertical: 6 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#005B66' }}>Full 1st Month Move-In:</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#005B66' }}>Rs. {pTotal.toLocaleString()}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Tenancy Agreement & Digital Signature Card */}
                <View style={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#FCD34D',
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="shield-check" size={20} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#92400E', textTransform: 'uppercase' }}>
                        Tenancy Agreement
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedAgreementPreview(selectedPaymentBooking)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>Read Full Terms →</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 11, color: '#78350F', lineHeight: 16, marginBottom: 8 }}>
                    • 1st Month includes Key Money Deposit (Double Payment){'\n'}
                    • 2 Months Move-Out Notice required before vacating{'\n'}
                    • Minimum stay 1 Year (12 Months){'\n'}
                    • 12th Month is Rent-Free (covered by Key Money){'\n'}
                    • Early departure under 1 year forfeits deposit
                  </Text>

                  {/* Digital Signature Input */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#78350F', marginBottom: 4 }}>
                      TYPE FULL LEGAL NAME (DIGITAL SIGNATURE):
                    </Text>
                    <TextInput
                      style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', paddingVertical: 2 }}
                      placeholder="e.g. Full Legal Name"
                      placeholderTextColor="#94A3B8"
                      value={signatureName}
                      onChangeText={setSignatureName}
                    />
                  </View>

                  {/* Agreement Checkbox */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setHasAgreedToRules(!hasAgreedToRules)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={hasAgreedToRules ? 'check-square' : 'square'}
                      size={18}
                      color={hasAgreedToRules ? '#D97706' : '#94A3B8'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E', flex: 1 }}>
                      I agree to the Tenancy Agreement & Key Money Rules.
                    </Text>
                  </TouchableOpacity>
                </View>

                <PaymentDateField value={paymentDate} onChange={setPaymentDate} accentColor="#005B66" />

                {/* Payment Method Selector */}
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 10 }}>Select Payment Method</Text>
                
                {[
                  { id: 'bank', label: 'Online Bank Transfer / Slip Upload', icon: 'server' },
                  { id: 'cash', label: 'Pay on Move-in (Handover to Owner)', icon: 'dollar-sign' },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: paymentMethod === method.id ? '#005B66' : '#E2E8F0',
                      backgroundColor: paymentMethod === method.id ? '#E0F2F1' : '#FFFFFF',
                      marginBottom: 10,
                    }}
                    onPress={() => setPaymentMethod(method.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name={method.icon} size={18} color={paymentMethod === method.id ? '#005B66' : '#64748B'} style={{ marginRight: 12 }} />
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: paymentMethod === method.id ? '#005B66' : '#1E293B' }}>
                      {method.label}
                    </Text>
                    <Feather name={paymentMethod === method.id ? 'check-circle' : 'circle'} size={18} color={paymentMethod === method.id ? '#005B66' : '#CBD5E1'} />
                  </TouchableOpacity>
                ))}

                {/* Bank Transfer Details & Upload Slip */}
                {paymentMethod === 'bank' && (
                  <View style={{ backgroundColor: '#F0FDFA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F766E', marginBottom: 6 }}>
                      Owner Bank Account Details
                    </Text>
                    <View style={{ backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#99F6E4', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, color: '#334155', fontWeight: '700' }}>Bank: {selectedPaymentBooking?.ownerBankDetails?.bankName || 'Not provided'}</Text>
                      <Text style={{ fontSize: 12, color: '#334155', fontWeight: '700', marginTop: 2 }}>Account Name (Owner): {selectedPaymentBooking?.ownerBankDetails?.accountHolderName || 'Not provided'}</Text>
                      <Text style={{ fontSize: 12, color: '#0F766E', fontWeight: '900', marginTop: 2 }}>Account No: {selectedPaymentBooking?.ownerBankDetails?.accountNumber || 'Not provided'}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Branch: {selectedPaymentBooking?.ownerBankDetails?.branchName || 'Not provided'}</Text>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F766E', marginBottom: 6 }}>Your Bank Branch Name</Text>
                    <TextInput
                      style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#99F6E4', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 12 }}
                      placeholder="e.g. Galle Branch"
                      placeholderTextColor="#94A3B8"
                      value={paymentBranch}
                      onChangeText={setPaymentBranch}
                    />

                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F766E', marginBottom: 6 }}>
                      Attach Bank Transfer Slip / Payment Receipt
                    </Text>

                    {slipImage ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#99F6E4', marginBottom: 8 }}>
                        <Image source={{ uri: slipImage }} style={{ width: 48, height: 48, borderRadius: 6, marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F766E' }}>Receipt Attached ✓</Text>
                          <Text style={{ fontSize: 10, color: '#64748B' }}>Ready for owner verification</Text>
                        </View>
                        <TouchableOpacity onPress={() => pickSlipImage(false)} style={{ padding: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#005B66' }}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#005B66',
                          borderRadius: 10,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                        onPress={() => pickSlipImage(false)}
                      >
                        <Feather name="upload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Upload Transfer Receipt Slip</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic' }}>
                      After submitting, the owner will verify your receipt and confirm your check-in.
                    </Text>
                  </View>
                )}

                {paymentMethod === 'card' && (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#CCFBF1', marginBottom: 16 }}>
                    {cardStep === 'details' ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="shield" size={16} color="#005B66" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Card Payment Details</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            <View style={{ backgroundColor: '#E0F2F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: '900', color: '#005B66' }}>VISA</Text>
                            </View>
                            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: '900', color: '#DC2626' }}>MC</Text>
                            </View>
                          </View>
                        </View>

                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Cardholder Name</Text>
                        <TextInput
                          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}
                          placeholder="Full Name as on Card"
                          placeholderTextColor="#94A3B8"
                          value={cardHolder}
                          onChangeText={setCardHolder}
                        />

                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Card Number</Text>
                        <TextInput
                          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 4 }}
                          placeholder="4111 2222 3333 4444"
                          placeholderTextColor="#94A3B8"
                          value={cardNumber}
                          onChangeText={setCardNumber}
                        />
                        <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' }}>
                          Pre-filled test card for instant sandbox testing.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Expiry Date</Text>
                            <TextInput
                              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13 }}
                              placeholder="MM/YY"
                              placeholderTextColor="#94A3B8"
                              value={cardExpiry}
                              onChangeText={setCardExpiry}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>CVC / CVV</Text>
                            <TextInput
                              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13 }}
                              placeholder="123"
                              placeholderTextColor="#94A3B8"
                              value={cardCvv}
                              onChangeText={setCardCvv}
                              secureTextEntry
                            />
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8, marginTop: 12 }}>
                          <Feather name="lock" size={13} color="#475569" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 11, color: '#475569', flex: 1 }}>
                            3D Secure OTP verification will be required on the next step.
                          </Text>
                        </View>
                      </>
                    ) : (
                      /* OTP Verification Screen (Dialog reload payment style) */
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                            <Feather name="shield" size={18} color="#16A34A" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>3D Secure OTP Verification</Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>Verified by Visa / Mastercard ID Check</Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 10 }}>
                          An authentication code (OTP) has been sent to your registered mobile ending in <Text style={{ fontWeight: '800', color: '#0F172A' }}>077•••••89</Text> and email <Text style={{ fontWeight: '800', color: '#0F172A' }}>{activeUser?.email || 'tenant@email.com'}</Text>.
                        </Text>

                        {/* Dialog App Style Simulated SMS Toast */}
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#FEF9C3',
                            borderColor: '#FDE047',
                            borderWidth: 1,
                            borderRadius: 10,
                            padding: 10,
                            marginBottom: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                          onPress={() => {
                            setOtpValue(generatedOtp);
                            setOtpError('');
                          }}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons name="message-text-lock" size={20} color="#854D0E" style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#854D0E', textTransform: 'uppercase' }}>
                              Simulated SMS Notification
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#713F12', marginTop: 1 }}>
                              Your Nestora OTP is <Text style={{ fontWeight: '900', color: '#005B66', fontSize: 13 }}>{generatedOtp}</Text>
                            </Text>
                          </View>
                          <View style={{ backgroundColor: '#005B66', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>⚡ Autofill</Text>
                          </View>
                        </TouchableOpacity>

                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                          Enter 6-Digit OTP Code
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: otpError ? '#EF4444' : '#005B66',
                            borderRadius: 10,
                            padding: 12,
                            fontSize: 20,
                            fontWeight: '900',
                            letterSpacing: 8,
                            textAlign: 'center',
                            color: '#1E293B',
                            marginBottom: 6,
                          }}
                          placeholder="••••••"
                          placeholderTextColor="#CBD5E1"
                          value={otpValue}
                          onChangeText={(txt) => {
                            setOtpValue(txt);
                            if (otpError) setOtpError('');
                          }}
                          keyboardType="number-pad"
                          maxLength={6}
                        />

                        {otpError ? (
                          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                            {otpError}
                          </Text>
                        ) : null}

                        {/* Resend Timer */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                          {otpTimer > 0 ? (
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              Resend OTP in <Text style={{ fontWeight: '800', color: '#005B66' }}>{otpTimer}s</Text>
                            </Text>
                          ) : (
                            <TouchableOpacity onPress={handleSendMoveInOtp}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#005B66' }}>
                                🔄 Resend OTP Code
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Confirm Pay / OTP Action Buttons */}
                {(() => {
                  const pBeds = selectedPaymentBooking?.numberOfBeds || 1;
                  const pMonthly = (selectedPaymentBooking ? (pBeds * parseInt(selectedPaymentBooking.boarding?.pricePerMonth || 15000)) : 15000);
                  const pTotal = pMonthly * 2;

                  if (paymentMethod === 'card') {
                    if (cardStep === 'details') {
                      return (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#005B66',
                            borderRadius: 14,
                            paddingVertical: 16,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 4,
                            marginBottom: 16,
                            shadowColor: '#005B66',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                          onPress={handleSendMoveInOtp}
                          activeOpacity={0.85}
                        >
                          <Feather name="arrow-right-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                            Proceed to OTP Verification (Rs. {pTotal.toLocaleString()})
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    // cardStep === 'otp'
                    return (
                      <View style={{ marginBottom: 16 }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#16A34A',
                            borderRadius: 14,
                            paddingVertical: 16,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 10,
                            shadowColor: '#16A34A',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                          onPress={async () => {
                            if (!otpValue || otpValue.trim().length < 4) {
                              setOtpError('Please enter the 6-digit OTP code.');
                              return;
                            }
                            if (otpValue.trim() !== generatedOtp) {
                              setOtpError('Invalid OTP code. Please enter the code shown above or tap Autofill.');
                              return;
                            }

                            setIsProcessingPayment(true);
                            const paymentPayload = {
                              signedByName: signatureName.trim(),
                              digitalSignature: signatureName.trim(),
                              paymentMethod: 'credit_card',
                              paymentReceipt: '',
                              amount: pTotal,
                              monthNumber: 1,
                              cardLast4: (cardNumber || '5678').slice(-4),
                              authStatus: 'OTP_VERIFIED',
                            };

                            if (onSubmitAgreementAndPayment) {
                              const res = await onSubmitAgreementAndPayment(selectedPaymentBooking._id, paymentPayload);
                              setIsProcessingPayment(false);
                              if (res?.success) {
                                setPaidBookingIds(prev => [...prev, selectedPaymentBooking._id]);
                                setCardStep('details');
                                setPaymentSuccess(true);
                              }
                            } else {
                              setIsProcessingPayment(false);
                              setPaidBookingIds(prev => [...prev, selectedPaymentBooking._id]);
                              setCardStep('details');
                              setPaymentSuccess(true);
                            }
                          }}
                          activeOpacity={0.85}
                          disabled={isProcessingPayment}
                        >
                          {isProcessingPayment ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                                Authorize & Pay Rs. {pTotal.toLocaleString()}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            borderRadius: 12,
                            paddingVertical: 10,
                            alignItems: 'center',
                          }}
                          onPress={() => {
                            setCardStep('details');
                            setOtpError('');
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                            ← Change Card Details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  // Default for bank slip & cash handover
                  return (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#005B66',
                        borderRadius: 14,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 8,
                        marginBottom: 16,
                        shadowColor: '#005B66',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                      onPress={async () => {
                        if (!signatureName.trim()) {
                          Alert.alert('Digital Signature Required', 'Please enter your Full Legal Name to digitally sign the agreement.');
                          return;
                        }
                        if (!hasAgreedToRules) {
                          Alert.alert('Agreement Required', 'Please check the box to agree to the Tenancy Agreement & Key Money Rules.');
                          return;
                        }
                        if (paymentMethod === 'bank' && (!slipImage || !selectedPaymentBooking?.ownerBankDetails?.accountNumber)) {
                          Alert.alert('Payment details required', 'Ask the owner to add bank details, then attach your real bank transfer slip.');
                          return;
                        }

                        setIsProcessingPayment(true);
                        const paymentPayload = {
                          signedByName: signatureName.trim(),
                          digitalSignature: signatureName.trim(),
                          paymentMethod,
                          paymentReceipt: paymentMethod === 'bank' ? slipImage : '',
                          amount: pTotal,
                          monthNumber: 1,
                          branch: paymentMethod === 'bank' ? paymentBranch.trim() : 'Cash Handover',
                          paidAt: paymentDate || new Date().toISOString(),
                        };

                        const result = onSubmitAgreementAndPayment
                          ? await onSubmitAgreementAndPayment(selectedPaymentBooking._id, paymentPayload)
                          : { success: false };
                        setIsProcessingPayment(false);
                        if (result?.success) {
                          setPaidBookingIds(prev => [...prev, selectedPaymentBooking._id]);
                          setPaymentSuccess(true);
                        }
                      }}
                      activeOpacity={0.85}
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Feather name="file-text" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                            {paymentMethod === 'cash'
                              ? `Confirm Cash Handover (Rs. ${pTotal.toLocaleString()})`
                              : `Sign Agreement & Submit Slip (Rs. ${pTotal.toLocaleString()})`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Client Monthly Rent Payment Modal (Month 2, 3...) ── */}
      <Modal
        visible={!!selectedMonthlyBooking}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMonthlyBooking(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            maxHeight: '85%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Feather name="calendar" size={20} color="#005B66" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                    Pay Month {selectedMonthToPay} Rent
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Continuous Monthly Stay Payment</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedMonthlyBooking(null)} style={{ padding: 6 }}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => {
                const beds = selectedMonthlyBooking?.numberOfBeds || 1;
                const monthlyFee = beds * parseInt(selectedMonthlyBooking?.boarding?.pricePerMonth || 15000, 10);
                return (
                  <View>
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        {selectedMonthlyBooking?.boardingName || selectedMonthlyBooking?.boarding?.boardingName || 'Boarding Place'}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>Monthly Amount Due:</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#005B66' }}>Rs. {monthlyFee.toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Bank Info */}
                    <View style={{ backgroundColor: '#E0F2F1', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#B2DFDB', marginBottom: 14 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#005B66', marginBottom: 4 }}>
                        Transfer to Owner Account
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
                        {selectedMonthlyBooking?.ownerBankDetails?.bankName || 'Not provided'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#004D40', marginTop: 2 }}>
                        Account Number: <Text style={{ fontWeight: '800', color: '#005B66' }}>{selectedMonthlyBooking?.ownerBankDetails?.accountNumber || 'Not provided'}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#004D40', marginTop: 2 }}>
                        Account Name (Owner): <Text style={{ fontWeight: '700' }}>{selectedMonthlyBooking?.ownerBankDetails?.accountHolderName || 'Not provided'}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#004D40', marginTop: 2 }}>
                        Branch: <Text style={{ fontWeight: '700' }}>{selectedMonthlyBooking?.ownerBankDetails?.branchName || 'Not provided'}</Text>
                      </Text>
                    </View>

                    {/* Payment Method Selector */}
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
                      Select Payment Method
                    </Text>
                    {[
                      { id: 'bank', label: 'Online Bank Transfer / Slip Upload', icon: 'server' },
                      { id: 'cash', label: 'Pay on Handover (Direct to Owner)', icon: 'dollar-sign' },
                    ].map((method) => (
                      <TouchableOpacity
                        key={method.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: monthlyPaymentMethod === method.id ? '#005B66' : '#E2E8F0',
                          backgroundColor: monthlyPaymentMethod === method.id ? '#E0F2F1' : '#FFFFFF',
                          marginBottom: 8,
                        }}
                        onPress={() => setMonthlyPaymentMethod(method.id)}
                        activeOpacity={0.8}
                      >
                        <Feather name={method.icon} size={18} color={monthlyPaymentMethod === method.id ? '#005B66' : '#64748B'} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: monthlyPaymentMethod === method.id ? '#005B66' : '#1E293B' }}>
                          {method.label}
                        </Text>
                        <Feather name={monthlyPaymentMethod === method.id ? 'check-circle' : 'circle'} size={18} color={monthlyPaymentMethod === method.id ? '#005B66' : '#CBD5E1'} />
                      </TouchableOpacity>
                    ))}

                    {/* Method 1: Slip Upload */}
                    {monthlyPaymentMethod === 'bank' && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                          Attach Month {selectedMonthToPay} Bank Slip
                        </Text>
                        {monthlySlipImage ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 14 }}>
                            <Image source={{ uri: monthlySlipImage }} style={{ width: 44, height: 44, borderRadius: 6, marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>✓ Slip Attached</Text>
                            </View>
                            <TouchableOpacity onPress={() => pickSlipImage(true)} style={{ padding: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#005B66' }}>Change</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#005B66',
                              borderRadius: 10,
                              paddingVertical: 10,
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginBottom: 14,
                            }}
                            onPress={() => pickSlipImage(true)}
                          >
                            <Feather name="upload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Upload Payment Slip</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Method 2: Card */}
                    {monthlyPaymentMethod === 'card' && (
                      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#CCFBF1', marginBottom: 14 }}>
                        {monthlyCardStep === 'details' ? (
                          <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Feather name="shield" size={16} color="#005B66" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Monthly Rent Card Payment</Text>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 4 }}>
                                <View style={{ backgroundColor: '#E0F2F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#005B66' }}>VISA</Text>
                                </View>
                                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#DC2626' }}>MC</Text>
                                </View>
                              </View>
                            </View>

                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Cardholder Name</Text>
                            <TextInput
                              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}
                              placeholder="Full Name on Card"
                              placeholderTextColor="#94A3B8"
                              value={monthlyCardHolder}
                              onChangeText={setMonthlyCardHolder}
                            />

                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Card Number</Text>
                            <TextInput
                              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 4 }}
                              placeholder="4111 2222 3333 4444"
                              placeholderTextColor="#94A3B8"
                              value={monthlyCardNumber}
                              onChangeText={setMonthlyCardNumber}
                            />
                            <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' }}>
                              Pre-filled test card for instant sandbox testing.
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Expiry Date</Text>
                                <TextInput
                                  style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13 }}
                                  placeholder="MM/YY"
                                  placeholderTextColor="#94A3B8"
                                  value={monthlyCardExpiry}
                                  onChangeText={setMonthlyCardExpiry}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>CVC / CVV</Text>
                                <TextInput
                                  style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13 }}
                                  placeholder="123"
                                  placeholderTextColor="#94A3B8"
                                  value={monthlyCardCvv}
                                  onChangeText={setMonthlyCardCvv}
                                  secureTextEntry
                                />
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8, marginTop: 12 }}>
                              <Feather name="lock" size={13} color="#475569" style={{ marginRight: 6 }} />
                              <Text style={{ fontSize: 11, color: '#475569', flex: 1 }}>
                                3D Secure OTP verification will be required on the next step.
                              </Text>
                            </View>
                          </>
                        ) : (
                          /* OTP Verification Step */
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                <Feather name="shield" size={18} color="#16A34A" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>3D Secure OTP Verification</Text>
                                <Text style={{ fontSize: 11, color: '#64748B' }}>Verified by Visa / Mastercard ID Check</Text>
                              </View>
                            </View>

                            <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 10 }}>
                              An authentication code (OTP) has been sent to your registered mobile ending in <Text style={{ fontWeight: '800', color: '#0F172A' }}>077•••••89</Text> and email <Text style={{ fontWeight: '800', color: '#0F172A' }}>{activeUser?.email || 'tenant@email.com'}</Text>.
                            </Text>

                            {/* Dialog App Style Simulated SMS Toast */}
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#FEF9C3',
                                borderColor: '#FDE047',
                                borderWidth: 1,
                                borderRadius: 10,
                                padding: 10,
                                marginBottom: 14,
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                              onPress={() => {
                                setMonthlyOtpValue(monthlyGeneratedOtp);
                                setMonthlyOtpError('');
                              }}
                              activeOpacity={0.85}
                            >
                              <MaterialCommunityIcons name="message-text-lock" size={20} color="#854D0E" style={{ marginRight: 8 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#854D0E', textTransform: 'uppercase' }}>
                                  Simulated SMS Notification
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#713F12', marginTop: 1 }}>
                                  Your Nestora Rent OTP is <Text style={{ fontWeight: '900', color: '#005B66', fontSize: 13 }}>{monthlyGeneratedOtp}</Text>
                                </Text>
                              </View>
                              <View style={{ backgroundColor: '#005B66', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>⚡ Autofill</Text>
                              </View>
                            </TouchableOpacity>

                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                              Enter 6-Digit OTP Code
                            </Text>
                            <TextInput
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1.5,
                                borderColor: monthlyOtpError ? '#EF4444' : '#005B66',
                                borderRadius: 10,
                                padding: 12,
                                fontSize: 20,
                                fontWeight: '900',
                                letterSpacing: 8,
                                textAlign: 'center',
                                color: '#1E293B',
                                marginBottom: 6,
                              }}
                              placeholder="••••••"
                              placeholderTextColor="#CBD5E1"
                              value={monthlyOtpValue}
                              onChangeText={(txt) => {
                                setMonthlyOtpValue(txt);
                                if (monthlyOtpError) setMonthlyOtpError('');
                              }}
                              keyboardType="number-pad"
                              maxLength={6}
                            />

                            {monthlyOtpError ? (
                              <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                                {monthlyOtpError}
                              </Text>
                            ) : null}

                            {/* Resend Timer */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                              {monthlyOtpTimer > 0 ? (
                                <Text style={{ fontSize: 11, color: '#64748B' }}>
                                  Resend OTP in <Text style={{ fontWeight: '800', color: '#005B66' }}>{monthlyOtpTimer}s</Text>
                                </Text>
                              ) : (
                                <TouchableOpacity onPress={handleSendMonthlyOtp}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#005B66' }}>
                                    🔄 Resend OTP Code
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Method 3: Cash Handover */}
                    {monthlyPaymentMethod === 'cash' && (
                      <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Feather name="dollar-sign" size={18} color="#92400E" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                            Handover Cash in Person
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
                          You can hand over Rs. {monthlyFee.toLocaleString()} directly to the boarding owner. Click submit below to record this payment and notify the owner.
                        </Text>
                      </View>
                    )}

                    {/* Action Button: Card OTP vs Submit */}
                    {monthlyPaymentMethod === 'card' ? (
                      monthlyCardStep === 'details' ? (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#005B66',
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                            marginBottom: 16,
                          }}
                          onPress={handleSendMonthlyOtp}
                          activeOpacity={0.85}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                            Proceed to OTP Verification (Rs. {monthlyFee.toLocaleString()}) ➔
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ marginBottom: 16 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#16A34A',
                              borderRadius: 12,
                              paddingVertical: 14,
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                            onPress={async () => {
                              if (!monthlyOtpValue || monthlyOtpValue.trim().length < 4) {
                                setMonthlyOtpError('Please enter the 6-digit OTP code.');
                                return;
                              }
                              if (monthlyOtpValue.trim() !== monthlyGeneratedOtp) {
                                setMonthlyOtpError('Invalid OTP code. Please enter the code shown above or tap Autofill.');
                                return;
                              }

                              setIsProcessingMonthly(true);
                              const payData = {
                                monthNumber: selectedMonthToPay,
                                amount: monthlyFee,
                                paymentMethod: 'credit_card',
                                branch: 'Online Card Payment (OTP Verified)',
                                paidAt: new Date().toISOString(),
                                paymentReceipt: '',
                                cardLast4: (monthlyCardNumber || '5678').slice(-4),
                                authStatus: 'OTP_VERIFIED',
                              };

                              if (onSubmitMonthlyPayment) {
                                await onSubmitMonthlyPayment(selectedMonthlyBooking._id, payData);
                              }
                              setIsProcessingMonthly(false);
                              setMonthlyCardStep('details');
                              setSelectedMonthlyBooking(null);
                            }}
                            disabled={isProcessingMonthly}
                          >
                            {isProcessingMonthly ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                                Authorize & Pay Rs. {monthlyFee.toLocaleString()} with Card
                              </Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              borderRadius: 10,
                              paddingVertical: 10,
                              alignItems: 'center',
                            }}
                            onPress={() => {
                              setMonthlyCardStep('details');
                              setMonthlyOtpError('');
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                              ← Change Card Details
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#16A34A',
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: 'center',
                          marginBottom: 16,
                        }}
                        onPress={async () => {
                          if (monthlyPaymentMethod === 'bank' && (!monthlySlipImage || !selectedMonthlyBooking?.ownerBankDetails?.accountNumber)) {
                            Alert.alert('Payment details required', 'Ask the owner to add bank details, then attach your real bank transfer slip.');
                            return;
                          }
                          setIsProcessingMonthly(true);
                          const payData = {
                            monthNumber: selectedMonthToPay,
                            amount: monthlyFee,
                            paymentMethod: monthlyPaymentMethod === 'cash' ? 'cash' : 'bank_transfer',
                            branch: monthlyPaymentMethod === 'cash' ? 'Cash Handover' : 'Bank Transfer',
                            paidAt: new Date().toISOString(),
                            paymentReceipt: monthlyPaymentMethod === 'bank' ? monthlySlipImage : '',
                          };

                          const result = onSubmitMonthlyPayment
                            ? await onSubmitMonthlyPayment(selectedMonthlyBooking._id, payData)
                            : { success: false };
                          setIsProcessingMonthly(false);
                          if (result?.success) setSelectedMonthlyBooking(null);
                        }}
                        disabled={isProcessingMonthly}
                      >
                        {isProcessingMonthly ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                            {monthlyPaymentMethod === 'cash'
                              ? `Confirm Cash Handover of Rs. ${monthlyFee.toLocaleString()}`
                              : `Submit Slip to Owner`}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Client Tenancy Agreement Preview Modal ── */}
      <Modal
        visible={!!selectedAgreementPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAgreementPreview(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
              <MaterialCommunityIcons name="file-document" size={24} color="#005B66" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Tenancy Agreement Terms</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedAgreementPreview(null)} style={{ padding: 6 }}>
              <Feather name="x" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 18 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: '#005B66', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' }}>
                BOARDING RENTAL AGREEMENT
              </Text>
              <Text style={{ color: '#E0F2F1', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                SMRP NESTORA PLATFORM • LEGAL RECORD
              </Text>
            </View>

            <View style={{ backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#92400E', textTransform: 'uppercase', marginBottom: 10 }}>
                Mandatory Key Money & Agreement Clauses
              </Text>
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
                    You must notify the boarding owner at least 2 months (60 days) before leaving the property.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>🗓️ 1-Year Minimum Stay Requirement</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    Key money benefits and last-month rent coverage require completing a minimum stay of 1 year (12 months).
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>💸 Last Month Rent Free (After 1 Year)</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    When completing a 1-year stay, no rent is due for the final 12th month as it is covered by your deposit.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>⚠️ Early Departure Policy (Under 1 Year)</Text>
                  <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 2, lineHeight: 16 }}>
                    Leaving the boarding before 1 year forfeits the key money deposit.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#005B66',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 20,
              }}
              onPress={() => setSelectedAgreementPreview(null)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>I Understand & Agree</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Booking Details & Edit/Resend Modal ── */}
      <Modal
        visible={!!selectedBookingDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBookingDetails(null)}
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
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Feather name="calendar" size={20} color="#005B66" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Booking Details</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Status: <Text style={{ fontWeight: '800', color: selectedBookingDetails?.status === 'confirmed' ? '#16A34A' : '#D97706' }}>
                      {selectedBookingDetails?.status ? selectedBookingDetails.status.toUpperCase() : 'PENDING'}
                    </Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedBookingDetails(null)} style={{ padding: 6 }}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Property Summary */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {selectedBookingDetails?.boardingName || selectedBookingDetails?.boarding?.boardingName || 'Boarding Place'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  📍 {selectedBookingDetails?.boarding?.location || 'Colombo, Sri Lanka'}
                </Text>
              </View>

              {/* 📜 Boarding Agreement & Key Money Rules */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#B2DFDB', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Feather name="file-text" size={16} color="#005B66" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#005B66', textTransform: 'uppercase' }}>
                    Boarding Agreement & Key Money Rules
                  </Text>
                </View>

                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>🔑</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>1st Month Double Payment (Key Money)</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        The 1st month requires paying monthly rent + 1 month Key Money deposit (Double payment).
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>📢</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>2-Month Move-Out Notice</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Must inform the boarding owner at least 2 months before leaving.
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>🗓️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>1-Year Minimum Stay Requirement</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Key money benefits are valid only when completing a stay of 1 year (12 months).
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>💸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#16A34A' }}>Last Month Rent Free (After 1 Year)</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        Upon completing a 1-year stay, no rental fee is required for the final month (covered by Key Money).
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Early Departure Policy</Text>
                      <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 1 }}>
                        If leaving before 1 full year, key money is non-refundable.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 💰 Payment Details */}
              {(() => {
                const rent = parseInt(selectedBookingDetails?.boarding?.pricePerMonth || 15000, 10);
                return (
                  <View style={{ backgroundColor: '#E0F2F1', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#004D40', marginBottom: 8, textTransform: 'uppercase' }}>
                      Financial Breakdown
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#004D40' }}>Monthly Rent:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#004D40' }}>Rs. {rent.toLocaleString()} / mo</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#004D40' }}>Key Money Deposit (1st Month):</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#004D40' }}>Rs. {rent.toLocaleString()}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#B2DFDB', marginVertical: 6 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#005B66' }}>Total 1st Month Move-In (Double Payment):</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#005B66' }}>Rs. {(rent * 2).toLocaleString()}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* ✏️ Edit & Resend Section */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Feather name="edit" size={15} color="#005B66" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Update Booking Information</Text>
                </View>

                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>Contact Phone Number</Text>
                <TextInput
                  style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 12 }}
                  placeholder="e.g. 077 123 4567"
                  placeholderTextColor="#94A3B8"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />

                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>Special Note / Requests</Text>
                <TextInput
                  style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, fontSize: 13, minHeight: 70, textAlignVertical: 'top', marginBottom: 12 }}
                  placeholder="Update your special note or move-in requirements..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={editNote}
                  onChangeText={setEditNote}
                />

                {updateSuccess ? (
                  <View style={{ backgroundColor: '#DCFCE7', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Feather name="check-circle" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>Booking details updated & resent successfully!</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={{
                    backgroundColor: '#005B66',
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={async () => {
                    if (!selectedBookingDetails) return;
                    setIsUpdatingBooking(true);
                    const token = currentUser ? currentUser.token : null;
                    const email = currentUser ? currentUser.email : null;
                    const res = await updateBookingApi(
                      selectedBookingDetails._id,
                      {
                        studentPhone: editPhone.trim(),
                        specialNote: editNote.trim(),
                      },
                      token,
                      email
                    );
                    setIsUpdatingBooking(false);
                    if (res.success) {
                      setUpdateSuccess(true);
                      if (onReloadBookings) await onReloadBookings();
                      setTimeout(() => {
                        setSelectedBookingDetails(null);
                      }, 1200);
                    } else {
                      Alert.alert('Update Failed', res.message || 'Could not update booking');
                    }
                  }}
                  disabled={isUpdatingBooking}
                  activeOpacity={0.85}
                >
                  {isUpdatingBooking ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Save & Resend Booking Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Pay Now shortcut if confirmed */}
              {selectedBookingDetails?.status === 'confirmed' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#16A34A',
                    borderRadius: 14,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                  onPress={() => {
                    const bookingToPay = selectedBookingDetails;
                    setSelectedBookingDetails(null);
                    setSelectedPaymentBooking(bookingToPay);
                    setPaymentSuccess(false);
                  }}
                >
                  <Feather name="credit-card" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Proceed to Online Payment</Text>
                </TouchableOpacity>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Cross-Platform Confirmation Modal ── */}
      <Modal
        visible={confirmDialog.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          activeOpacity={1}
          onPress={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
        >
          <TouchableWithoutFeedback>
            <View style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}>
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: confirmDialog.confirmColor === '#DC2626' ? '#FEF2F2' : '#E0F2F1',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                alignSelf: 'center',
              }}>
                <Feather
                  name={confirmDialog.confirmColor === '#DC2626' ? 'alert-triangle' : 'help-circle'}
                  size={26}
                  color={confirmDialog.confirmColor}
                />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
                {confirmDialog.title}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                {confirmDialog.message}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Keep / Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: confirmDialog.confirmColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(prev => ({ ...prev, visible: false }));
                    if (action) action();
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{confirmDialog.confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
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
    paddingBottom: 90,
  },

  // ── Header ──────────────────────────────────────────────
  headerContainer: {
    backgroundColor: '#3B0764',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 18 : 10,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
  },
  notifButton: {
    padding: 6,
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#005B66',
  },
  greetingContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subGreetingText: {
    color: '#E9D5FF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },

  // ── Search Bar ──────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 8,
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    marginLeft: 6,
  },

  // ── Stats ────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#005B66',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
    textAlign: 'center',
  },

  // ── Section ──────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#005B66',
  },

  // ── Property Card ────────────────────────────────────────
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  propertyImageWrapper: {
    marginRight: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  propertyImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  propertyImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  propertyLocation: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
    fontWeight: '500',
  },
  propertyPriceRow: {
    marginBottom: 6,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#005B66',
  },
  propertyPriceSuffix: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // ── Bottom Tab Bar ───────────────────────────────────────
  
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
    color: '#94A3B8',
    marginTop: 3,
  },
  activeTabLabel: {
    color: '#005B66',
    fontWeight: '700',
  },

  // ── Type Badge ───────────────────────────────────────────
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#005B66',
  },

  // ── Property Meta ────────────────────────────────────────
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  roomsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Empty State ──────────────────────────────────────────
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },

  // ── Mockup UI (Bookings) ──────────────────────────────
  bookingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  bookingsHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  bookingTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingTabButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  bookingTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  bookingTabTextActive: {
    color: '#FFFFFF',
  },
  mockupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    shadowColor: '#005B66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  mockupImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  mockupImage: {
    width: '100%',
    height: '100%',
  },
  mockupHeartIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
  },
  mockupInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mockupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mockupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  mockupDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mockupDateCol: {
    flexDirection: 'column',
  },
  mockupDateLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  mockupDateValue: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  mockupStatusCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mockupStatusTopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  mockupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mockupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  bookingMessage: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 4,
    fontWeight: '500',
  },
});
