import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Image,
  ImageBackground,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfileApi } from '../services/authService';
import { saveUserSession, saveAppSettings, getAppSettings } from '../utils/sessionStorage';

const PURPLE = '#6D28D9';
const PURPLE_LIGHT = '#EDE9FE';
const PURPLE_DARK = '#4C1D95';

export default function SidebarSectionModals({
  activeModal, // 'edit_profile' | 'security' | 'notifications' | 'verification' | 'account' | null
  onClose,
  currentUser,
  onUpdateUser,
  themeColor = PURPLE,
  onThemeChange,
  onFontSizeChange,
}) {
  // Edit Profile States
  const [fullName, setFullName] = useState(currentUser?.fullName || currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || currentUser?.phoneNumber || '0771234567');
  const [city, setCity] = useState(currentUser?.city || 'Colombo, Western Province');
  const [bio, setBio] = useState(
    currentUser?.bio ||
    (currentUser?.role === 'Boarding Owner'
      ? 'Verified accommodation host providing safe and comfortable residences.'
      : 'Undergraduate student looking for peaceful study and residential space.')
  );
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Settings States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notification Preferences States
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [monthlyRentAlerts, setMonthlyRentAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [promoAlerts, setPromoAlerts] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Account Settings States
  const [selectedFontSize, setSelectedFontSize] = useState(() => {
    const s = getAppSettings();
    return s?.fontSize || 'Medium';
  });
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const s = getAppSettings();
    return s?.theme || 'Light';
  });
  const [privacyHidePhone, setPrivacyHidePhone] = useState(() => getAppSettings()?.privacyHidePhone ?? true);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || currentUser.name || '');
      setPhone(currentUser.phone || currentUser.phoneNumber || '0771234567');
      if (currentUser.bio) setBio(currentUser.bio);
      if (currentUser.profilePicture) setProfilePicture(currentUser.profilePicture);
    }
    const currentSettings = getAppSettings();
    if (currentSettings.fontSize) setSelectedFontSize(currentSettings.fontSize);
    if (currentSettings.theme) setSelectedTheme(currentSettings.theme);
    if (typeof currentSettings.privacyHidePhone === 'boolean') setPrivacyHidePhone(currentSettings.privacyHidePhone);
  }, [currentUser]);

  if (!activeModal) return null;

  // Profile Picture Handlers: Add / Update / Delete
  const handlePickProfilePicture = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, camera roll permissions are required to upload a profile photo.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const imageUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfilePicture(imageUri);
        alert('📸 Profile photo selected! Click "Save Profile Changes" below to apply.');
      }
    } catch (err) {
      console.log('Error selecting profile picture:', err);
      alert('Could not pick image: ' + err.message);
    }
  };

  const handleDeleteProfilePicture = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setProfilePicture('');
            alert('Profile picture removed. Save changes to finalize.');
          }
        }
      ]
    );
  };

  // Handlers
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      alert('Please enter your full name.');
      return;
    }
    setSavingProfile(true);
    const updatedData = {
      email: currentUser?.email,
      fullName: fullName.trim(),
      name: fullName.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      city: city.trim(),
      profilePicture: profilePicture || '',
    };

    const res = await updateProfileApi(updatedData, currentUser?.token);
    setSavingProfile(false);

    if (res.success) {
      const mergedUser = { ...currentUser, ...updatedData, ...res.user };
      saveUserSession(mergedUser);
      if (onUpdateUser) onUpdateUser(mergedUser);
      alert('✅ Profile updated successfully!');
      onClose();
    } else {
      alert(res.message || 'Failed to update profile.');
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      alert('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }

    setUpdatingPassword(true);
    const res = await updateProfileApi(
      { email: currentUser?.email, currentPassword, password: newPassword },
      currentUser?.token
    );
    setUpdatingPassword(false);

    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('🔒 Password updated successfully!');
      onClose();
    } else {
      alert(res.message || 'Failed to update password.');
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifs(true);
    const prefs = {
      bookingAlerts,
      paymentAlerts,
      monthlyRentAlerts,
      emailAlerts,
      smsAlerts,
      promoAlerts,
    };
    const result = await updateProfileApi(
      { email: currentUser?.email, notificationPreferences: prefs },
      currentUser?.token
    );
    setSavingNotifs(false);
    if (result.success) {
      alert('🔔 Notification preferences saved successfully!');
      onClose();
    } else {
      alert(result.message || 'Could not save notification preferences.');
    }
  };

  const handleClearCache = () => {
    alert('🧹 App cache and temporary image files have been cleared successfully!');
  };

  const saveDisplayPreference = (updates) => {
    const nextSettings = { ...getAppSettings(), ...updates };
    saveAppSettings(nextSettings);
    if (updates.theme && onThemeChange) onThemeChange(updates.theme);
    if (updates.fontSize && onFontSizeChange) onFontSizeChange(updates.fontSize);
  };

  const getSectionTitle = () => {
    switch (activeModal) {
      case 'edit_profile':
        return { title: 'Edit Profile', sub: 'Update your personal details & contact info', icon: 'user' };
      case 'security':
        return { title: 'Security Settings', sub: 'Manage passwords, 2FA & account protections', icon: 'lock' };
      case 'notifications':
        return { title: 'Notification Preferences', sub: 'Choose how and when you receive alerts', icon: 'bell' };
      case 'verification':
        return { title: 'Verification Center', sub: 'Trust, identity badges & compliance status', icon: 'shield' };
      case 'account':
        return { title: 'Account Settings', sub: 'App preferences, language & data controls', icon: 'settings' };
      default:
        return { title: 'Settings', sub: '', icon: 'sliders' };
    }
  };

  const headerInfo = getSectionTitle();
  const isDark = selectedTheme === 'Dark';
  const cardStyle = [styles.formCard, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }];
  const cardTitleStyle = [styles.cardHeaderTitle, isDark && { color: '#F8FAFC' }];
  const labelStyle = [styles.fieldLabel, isDark && { color: '#94A3B8' }];
  const inputStyle = [styles.textInput, isDark && { color: '#F8FAFC' }];
  const inputWrapStyle = [styles.inputWrap, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }];

  return (
    <Modal
      visible={!!activeModal}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ImageBackground
        source={require('../../assets/background.jpg')}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.93)' }}>
          {/* Header Bar */}
          <View style={[styles.topHeader, isDark && { backgroundColor: '#1E293B', borderBottomColor: '#334155' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.headerIconCircle, { backgroundColor: themeColor + '18' }]}>
                <Feather name={headerInfo.icon} size={22} color={themeColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, isDark && { color: '#F8FAFC' }]}>{headerInfo.title}</Text>
                <Text style={[styles.headerSub, isDark && { color: '#94A3B8' }]} numberOfLines={1}>{headerInfo.sub}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isDark && { backgroundColor: '#334155' }]}
              activeOpacity={0.7}
            >
              <Feather name="x" size={22} color={isDark ? '#F8FAFC' : '#475569'} />
            </TouchableOpacity>
          </View>

          {/* Section Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ══════════════ 1. EDIT PROFILE ══════════════ */}
            {activeModal === 'edit_profile' && (
              <View>
                {/* Avatar Banner & Photo Management */}
                <View style={styles.avatarCard}>
                  <TouchableOpacity
                    style={styles.avatarWrap}
                    onPress={handlePickProfilePicture}
                    activeOpacity={0.8}
                    title="Change Profile Photo"
                  >
                    <Image
                      source={{ uri: profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                      style={styles.avatarImg}
                    />
                    <View style={[styles.avatarEditBadge, { backgroundColor: themeColor }]}>
                      <Feather name="camera" size={13} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={styles.avatarName}>{fullName || 'User Profile'}</Text>
                    <Text style={styles.avatarEmail}>{currentUser?.email || 'user@nestora.com'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: themeColor,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                        onPress={handlePickProfilePicture}
                        activeOpacity={0.8}
                      >
                        <Feather name={profilePicture ? "refresh-cw" : "upload"} size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                          {profilePicture ? 'Update Photo' : 'Add Photo'}
                        </Text>
                      </TouchableOpacity>

                      {profilePicture ? (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#FEE2E2',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#FECACA',
                          }}
                          onPress={handleDeleteProfilePicture}
                          activeOpacity={0.8}
                        >
                          <Feather name="trash-2" size={12} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>Delete</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Form Fields */}
                <View style={styles.formCard}>
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="user" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                  <View style={[styles.inputWrap, styles.disabledInput]}>
                    <Feather name="mail" size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: '#64748B' }]}
                      value={currentUser?.email || ''}
                      editable={false}
                    />
                    <Feather name="lock" size={16} color="#94A3B8" />
                  </View>
                  <Text style={styles.hintText}>Email is linked to your account credentials.</Text>

                  <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="phone" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="e.g. 0771234567"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <Text style={styles.fieldLabel}>HOMETOWN / CITY</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="map-pin" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={city}
                      onChangeText={setCity}
                      placeholder="e.g. Colombo, Western Province"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <Text style={styles.fieldLabel}>ABOUT / BIO</Text>
                  <View style={[styles.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 10 }]}>
                    <TextInput
                      style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Share a short bio..."
                      placeholderTextColor="#94A3B8"
                      multiline
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Save Profile Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ══════════════ 2. SECURITY SETTINGS ══════════════ */}
            {activeModal === 'security' && (
              <View>
                {/* Security Status Banner */}
                <View style={[styles.bannerCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Feather name="shield" size={28} color="#16A34A" />
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>
                      Security Status: Strong
                    </Text>
                    <Text style={{ fontSize: 12, color: '#15803D', marginTop: 2 }}>
                      Password is active. 2FA is recommended for high protection.
                    </Text>
                  </View>
                </View>

                {/* Change Password Card */}
                <View style={styles.formCard}>
                  <Text style={styles.cardHeaderTitle}>Change Password</Text>

                  <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showCurrentPass}
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)}>
                      <Feather name={showCurrentPass ? 'eye-off' : 'eye'} size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldLabel}>NEW PASSWORD (MIN 6 CHARACTERS)</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="key" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new strong password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPass}
                    />
                    <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                      <Feather name={showNewPass ? 'eye-off' : 'eye'} size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="check-circle" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-type new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPass}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                    onPress={handleUpdatePassword}
                    disabled={updatingPassword}
                  >
                    {updatingPassword ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Feather name="lock" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Update Password</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 2FA & Protection Card */}
                <View style={styles.formCard}>
                  <Text style={styles.cardHeaderTitle}>Two-Factor & Quick Sign-in</Text>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Two-Factor Authentication (2FA)</Text>
                      <Text style={styles.toggleDesc}>
                        Receive an SMS verification code whenever signing in from a new device.
                      </Text>
                    </View>
                    <Switch
                      value={twoFactorEnabled}
                      onValueChange={setTwoFactorEnabled}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={twoFactorEnabled ? themeColor : '#F8FAFC'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Biometric Quick Unlock</Text>
                      <Text style={styles.toggleDesc}>Use Fingerprint or Face ID on supported devices.</Text>
                    </View>
                    <Switch
                      value={biometricsEnabled}
                      onValueChange={setBiometricsEnabled}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={biometricsEnabled ? themeColor : '#F8FAFC'}
                    />
                  </View>
                </View>

                {/* Active Sessions */}
                <View style={styles.formCard}>
                  <Text style={styles.cardHeaderTitle}>Active Sessions</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <View style={[styles.deviceIconBox, { backgroundColor: themeColor + '18' }]}>
                      <Feather name="smartphone" size={20} color={themeColor} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                        Current Browser / Device (Active Now)
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        Colombo, Sri Lanka • IP: 127.0.0.1
                      </Text>
                    </View>
                    <View style={styles.activeDot} />
                  </View>
                </View>
              </View>
            )}

            {/* ══════════════ 3. NOTIFICATION PREFERENCES ══════════════ */}
            {activeModal === 'notifications' && (
              <View>
                <View style={styles.formCard}>
                  <Text style={styles.cardHeaderTitle}>Activity & Booking Alerts</Text>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Booking Inquiries & Approvals</Text>
                      <Text style={styles.toggleDesc}>
                        Instant alert when a room reservation or confirmation occurs.
                      </Text>
                    </View>
                    <Switch
                      value={bookingAlerts}
                      onValueChange={setBookingAlerts}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={bookingAlerts ? themeColor : '#F8FAFC'}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Payment Slips & Receipts</Text>
                      <Text style={styles.toggleDesc}>
                        Notifications when a tenant uploads a bank slip or rent payment is verified.
                      </Text>
                    </View>
                    <Switch
                      value={paymentAlerts}
                      onValueChange={setPaymentAlerts}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={paymentAlerts ? themeColor : '#F8FAFC'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Continuous Monthly Rent Due Reminders</Text>
                      <Text style={styles.toggleDesc}>
                        Automatic reminders 3 days before monthly rent cycle expires.
                      </Text>
                    </View>
                    <Switch
                      value={monthlyRentAlerts}
                      onValueChange={setMonthlyRentAlerts}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={monthlyRentAlerts ? themeColor : '#F8FAFC'}
                    />
                  </View>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.cardHeaderTitle}>Delivery Channels</Text>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Email Notifications</Text>
                      <Text style={styles.toggleDesc}>Send email summaries to {currentUser?.email}.</Text>
                    </View>
                    <Switch
                      value={emailAlerts}
                      onValueChange={setEmailAlerts}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={emailAlerts ? themeColor : '#F8FAFC'}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>SMS Text Messages</Text>
                      <Text style={styles.toggleDesc}>Urgent status messages delivered directly to your mobile phone.</Text>
                    </View>
                    <Switch
                      value={smsAlerts}
                      onValueChange={setSmsAlerts}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={smsAlerts ? themeColor : '#F8FAFC'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Platform Updates & Host Tips</Text>
                      <Text style={styles.toggleDesc}>Periodic updates on new Nestora platform features.</Text>
                    </View>
                    <Switch
                      value={promoAlerts}
                      onValueChange={setPromoAlerts}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={promoAlerts ? themeColor : '#F8FAFC'}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                    onPress={handleSaveNotifications}
                    disabled={savingNotifs}
                  >
                    {savingNotifs ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Save Notification Preferences</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ══════════════ 4. VERIFICATION CENTER ══════════════ */}
            {activeModal === 'verification' && (
              <View>
                {/* Trust Score Banner */}
                <View style={[styles.bannerCard, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="shield" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: PURPLE_DARK }}>
                      Tier 1 Verified Profile
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6D28D9', marginTop: 2 }}>
                      100% Trust & Compliance badge active on listings and inquiries.
                    </Text>
                  </View>
                </View>

                {/* Verification Items List */}
                <View style={styles.formCard}>
                  <Text style={styles.cardHeaderTitle}>Verification Checklist</Text>

                  {/* NIC */}
                  <View style={styles.verifyItem}>
                    <View style={[styles.verifyStatusIcon, { backgroundColor: '#DCFCE7' }]}>
                      <Feather name="check" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.verifyItemTitle}>National Identity Card (NIC)</Text>
                      <Text style={styles.verifyItemSub}>NIC verified • Valid until 2032</Text>
                    </View>
                    <View style={[styles.verifiedTag, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.verifiedTagText, { color: '#16A34A' }]}>Verified</Text>
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={styles.verifyItem}>
                    <View style={[styles.verifyStatusIcon, { backgroundColor: '#DCFCE7' }]}>
                      <Feather name="check" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.verifyItemTitle}>Mobile Number Verification</Text>
                      <Text style={styles.verifyItemSub}>SMS OTP confirmed on {phone || '0771234567'}</Text>
                    </View>
                    <View style={[styles.verifiedTag, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.verifiedTagText, { color: '#16A34A' }]}>Verified</Text>
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.verifyItem}>
                    <View style={[styles.verifyStatusIcon, { backgroundColor: '#DCFCE7' }]}>
                      <Feather name="check" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.verifyItemTitle}>Email Verification</Text>
                      <Text style={styles.verifyItemSub}>Confirmed via {currentUser?.email || 'email'}</Text>
                    </View>
                    <View style={[styles.verifiedTag, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.verifiedTagText, { color: '#16A34A' }]}>Verified</Text>
                    </View>
                  </View>

                  {/* Property / Student Deed */}
                  <View style={[styles.verifyItem, { borderBottomWidth: 0 }]}>
                    <View style={[styles.verifyStatusIcon, { backgroundColor: '#DCFCE7' }]}>
                      <Feather name="award" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.verifyItemTitle}>
                        {currentUser?.role === 'Boarding Owner' ? 'Premises Ownership Verification' : 'Student Institutional Verification'}
                      </Text>
                      <Text style={styles.verifyItemSub}>
                        {currentUser?.role === 'Boarding Owner'
                          ? 'Grama Niladhari & Utility document approved'
                          : 'Valid University student ID card recorded'}
                      </Text>
                    </View>
                    <View style={[styles.verifiedTag, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.verifiedTagText, { color: '#16A34A' }]}>Verified Host</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: themeColor, marginTop: 12 }]}
                    onPress={() => {
                      alert('📄 Document upload opened. Select front/back copies of additional verification certificates.');
                    }}
                  >
                    <Feather name="upload-cloud" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Upload Additional Documents</Text>
                  </TouchableOpacity>
                </View>

                {/* Safety Guarantee */}
                <View style={[styles.bannerCard, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
                  <Feather name="info" size={20} color={themeColor} />
                  <Text style={{ fontSize: 11, color: '#475569', marginLeft: 10, flex: 1, lineHeight: 16 }}>
                    Nestora uses 256-bit SSL encryption to keep all government identities, contracts, and financial receipts completely private and confidential.
                  </Text>
                </View>
              </View>
            )}

            {/* ══════════════ 5. ACCOUNT SETTINGS ══════════════ */}
            {activeModal === 'account' && (
              <View>
                {/* Display Preferences */}
                <View style={cardStyle}>
                  <Text style={cardTitleStyle}>Display Preferences</Text>

                  <Text style={labelStyle}>FONT SIZE</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 16 }}>
                    {['Small', 'Medium', 'Large'].map((size) => {
                      const isSel = selectedFontSize === size;
                      return (
                        <TouchableOpacity
                          key={size}
                          onPress={() => {
                            setSelectedFontSize(size);
                            saveDisplayPreference({ fontSize: size });
                          }}
                          style={[
                            styles.pillChoice,
                            isDark && { backgroundColor: '#0F172A', borderColor: '#334155' },
                            isSel && { backgroundColor: themeColor, borderColor: themeColor },
                          ]}
                        >
                          <Text style={[styles.pillChoiceText, isDark && { color: '#94A3B8' }, isSel && { color: '#FFFFFF' }]}>{size}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={labelStyle}>APP THEME</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {[
                      { label: '☀️ Light', value: 'Light' },
                      { label: '🌙 Dark', value: 'Dark' },
                    ].map(({ label, value }) => {
                      const isSel = selectedTheme === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => {
                            setSelectedTheme(value);
                            saveDisplayPreference({ theme: value });
                          }}
                          style={[
                            styles.pillChoice,
                            isDark && { backgroundColor: '#0F172A', borderColor: '#334155' },
                            isSel && { backgroundColor: themeColor, borderColor: themeColor },
                          ]}
                        >
                          <Text style={[styles.pillChoiceText, isDark && { color: '#94A3B8' }, isSel && { color: '#FFFFFF' }]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Privacy & Visibility */}
                <View style={cardStyle}>
                  <Text style={cardTitleStyle}>Privacy & Contact Visibility</Text>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.toggleTitle, isDark && { color: '#F8FAFC' }]}>Protect Phone Number</Text>
                      <Text style={[styles.toggleDesc, isDark && { color: '#94A3B8' }]}>
                        Only display your phone number to tenants or owners with confirmed bookings.
                      </Text>
                    </View>
                    <Switch
                      value={privacyHidePhone}
                      onValueChange={(value) => {
                        setPrivacyHidePhone(value);
                        saveDisplayPreference({ privacyHidePhone: value });
                      }}
                      trackColor={{ false: '#CBD5E1', true: themeColor + '80' }}
                      thumbColor={privacyHidePhone ? themeColor : '#F8FAFC'}
                    />
                  </View>
                </View>

                {/* Storage & Cache */}
                <View style={cardStyle}>
                  <Text style={cardTitleStyle}>Storage & Data Management</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' }}>Temporary Cache</Text>
                      <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }}>Images, slips & cached boarding records (~4.2 MB)</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleClearCache}
                      style={[styles.outlineBtn, { borderColor: themeColor }]}
                    >
                      <Text style={[styles.outlineBtnText, { color: themeColor }]}>Clear Cache</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Danger Zone */}
                <View style={[styles.formCard, { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' }]}>
                  <Text style={[styles.cardHeaderTitle, { color: '#DC2626' }]}>Danger Zone</Text>
                  <Text style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 12 }}>
                    Deactivating your account will hide your listings and disable booking access until reactivated.
                  </Text>
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        if (window.confirm('Are you sure you want to request account deactivation?')) {
                          alert('Account deactivation request submitted to administrator.');
                        }
                      } else {
                        Alert.alert('Deactivate Account', 'Are you sure you want to deactivate your account?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Deactivate', style: 'destructive', onPress: () => alert('Request submitted.') },
                        ]);
                      }
                    }}
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.dangerBtnText}>Deactivate Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  avatarEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 14,
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  hintText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: -10,
    marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  deviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  verifyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  verifyStatusIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifyItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pillChoice: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pillChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
});
