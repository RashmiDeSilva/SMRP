import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from 'react-native';

import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { signUpApi } from '../services/authService';

export default function SignUpScreen({ onBack, onSignUpSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedRole, setSelectedRole] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Fix browser autofill mistaking phone field for email/username
  useEffect(() => {
    if (phoneNumber && phoneNumber.includes('@')) {
      if (!email) {
        setEmail(phoneNumber.trim());
      }
      setPhoneNumber('');
    }
  }, [phoneNumber, email]);

  const roles = [
    { id: 'Student', label: 'Student', icon: 'book' },
    { id: 'Employee', label: 'Employee', icon: 'briefcase' },
    { id: 'Boarding Owner', label: 'Boarding Owner', icon: 'home' },
  ];

  const validateForm = () => {
    const errors = {};
    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name (minimum 2 characters)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. name@example.com)';
    }

    const digitsOnly = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    if (!phoneNumber || digitsOnly.length !== 10) {
      errors.phoneNumber = 'Please enter a valid 10-digit phone number (e.g. 0771234567)';
    }

    if (!password || password.length < 6 || !/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      errors.password = 'Password must be at least 6 characters and contain letters & numbers';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!selectedRole) {
      errors.role = 'Please select who you are (Student, Employee, or Boarding Owner)';
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'You must agree to the Terms & Conditions and Privacy Policy';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUpApi({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        password,
        role: selectedRole,
      });

      if (result.success) {
        alert(`Account created successfully as a ${selectedRole}! ${result.source === 'database' ? '(Saved to MongoDB)' : '(Saved to Local DB)'}`);
        if (onSignUpSuccess) {
          onSignUpSuccess({ email: email.trim().toLowerCase(), password, role: selectedRole });
        }
      } else {
        alert(`Sign up failed: ${result.message}`);
      }
    } catch (err) {
      alert(`Sign up error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <ImageBackground
        source={require('../../assets/background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="#0F172A"
                />
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>
                  Create Account
                </Text>
                <Text style={styles.headerSubtitle}>
                  Join Nestora today
                </Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Full Name */}
              <InputField
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                setValue={(val) => {
                  setFullName(val);
                  if (validationErrors.fullName) {
                    setValidationErrors((prev) => ({ ...prev, fullName: null }));
                  }
                }}
                autoComplete="name"
                textContentType="name"
                name="fullName"
                id="nestora_signup_fullname"
                error={validationErrors.fullName}
              />

              {/* Email */}
              <InputField
                label="Email"
                placeholder="Enter your email"
                value={email}
                setValue={(val) => {
                  setEmail(val);
                  if (validationErrors.email) {
                    setValidationErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                name="email"
                id="nestora_signup_email"
                error={validationErrors.email}
              />

              {/* Phone */}
              <InputField
                label="Phone Number"
                placeholder="Enter your 10-digit phone number (e.g. 0771234567)"
                value={phoneNumber}
                setValue={(val) => {
                  // Guard: if browser autofill tries to insert email here, redirect to email
                  if (val && val.includes('@')) {
                    if (!email) setEmail(val.trim());
                    return;
                  }
                  setPhoneNumber(val);
                  if (validationErrors.phoneNumber) {
                    setValidationErrors((prev) => ({ ...prev, phoneNumber: null }));
                  }
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                name="tel"
                id="nestora_signup_phone"
                error={validationErrors.phoneNumber}
              />

              {/* Password */}
              <PasswordField
                label="Password"
                placeholder="Create a password (min 6 chars, letters & numbers)"
                value={password}
                setValue={(val) => {
                  setPassword(val);
                  if (validationErrors.password) {
                    setValidationErrors((prev) => ({ ...prev, password: null }));
                  }
                }}
                visible={showPassword}
                setVisible={setShowPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                error={validationErrors.password}
              />

              {/* Confirm Password */}
              <PasswordField
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                setValue={(val) => {
                  setConfirmPassword(val);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors((prev) => ({ ...prev, confirmPassword: null }));
                  }
                }}
                visible={showConfirmPassword}
                setVisible={setShowConfirmPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                error={validationErrors.confirmPassword}
              />

              {/* Role Selection */}
              <View style={styles.roleGroup}>
                <Text style={styles.label}>
                  I am a
                </Text>

                <View style={styles.rolesRow}>
                  {roles.map((role) => {
                    const selected = selectedRole === role.id;
                    return (
                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.roleCard,
                          selected && styles.selectedRoleCard,
                          validationErrors.role && !selectedRole && styles.roleCardError,
                        ]}
                        onPress={() => {
                          setSelectedRole(role.id);
                          if (validationErrors.role) {
                            setValidationErrors((prev) => ({ ...prev, role: null }));
                          }
                        }}
                      >
                        <Feather
                          name={role.icon}
                          size={22}
                          color={selected ? '#6D28D9' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.roleText,
                            selected && styles.selectedRoleText,
                          ]}
                        >
                          {role.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {validationErrors.role ? (
                  <Text style={styles.inlineErrorText}>{validationErrors.role}</Text>
                ) : null}
              </View>

              {/* Terms and Privacy Checkbox */}
              <View style={styles.termsWrapper}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      agreeTerms && styles.checkedCheckbox,
                      validationErrors.agreeTerms && !agreeTerms && styles.checkboxError,
                    ]}
                    onPress={() => {
                      setAgreeTerms(!agreeTerms);
                      if (validationErrors.agreeTerms) {
                        setValidationErrors((prev) => ({ ...prev, agreeTerms: null }));
                      }
                    }}
                  >
                    {agreeTerms && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color="white"
                      />
                    )}
                  </TouchableOpacity>

                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text
                      style={styles.clickableLink}
                      onPress={() => setTermsModalVisible(true)}
                    >
                      Terms & Conditions
                    </Text>
                    {' '}and{' '}
                    <Text
                      style={styles.clickableLink}
                      onPress={() => setPrivacyModalVisible(true)}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
                {validationErrors.agreeTerms ? (
                  <Text style={styles.inlineErrorText}>{validationErrors.agreeTerms}</Text>
                ) : null}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.signUpButton, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSignUp}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.signUpButtonText}>
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>

      {/* ── Terms & Conditions Modal ── */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="file-document-check" size={24} color="#6D28D9" style={{ marginRight: 8 }} />
              <Text style={styles.modalHeaderTitle}>Terms & Conditions</Text>
            </View>
            <TouchableOpacity onPress={() => setTermsModalVisible(false)} style={{ padding: 6 }}>
              <Feather name="x" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHero}>
              <Text style={styles.modalHeroTitle}>NESTORA PLATFORM AGREEMENT</Text>
              <Text style={styles.modalHeroSubtitle}>Official Terms of Service & Rental Conditions</Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>1. Acceptance of Terms</Text>
              <Text style={styles.legalParagraph}>
                By creating an account on the SMRP Nestora platform, you agree to comply with all platform rules, rental guidelines, and obligations as a Student, Employee, or Boarding Owner.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>2. Mandatory Key Money & Deposit Policy</Text>
              <Text style={styles.legalParagraph}>
                • Move-in 1st Month Payment: Upon booking confirmation, the initial payment consists of 1 month rental fee plus 1 month refundable Key Money security deposit.
              </Text>
              <Text style={styles.legalParagraph}>
                • 1-Year Stay Commitment: To receive full Key Money deposit benefits, a minimum continuous stay of 1 year (12 months) is required.
              </Text>
              <Text style={styles.legalParagraph}>
                • 12th Month Rent Free: Tenants who complete their 12-month tenure receive the 12th month rent covered by their deposit.
              </Text>
              <Text style={styles.legalParagraph}>
                • Departure Notice: Tenants must give at least 2 months (60 days) written notice through the platform before moving out. Departing without notice or before 1 year forfeits the deposit.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>3. Continuous Monthly Rent Payments</Text>
              <Text style={styles.legalParagraph}>
                Monthly rental payments are due on or before the 5th day of every calendar month. Tenants must upload genuine bank transfer or deposit slips via the Continuous Monthly Rent Ledger for owner verification.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>4. Code of Conduct & Facilities Care</Text>
              <Text style={styles.legalParagraph}>
                Quiet hours must be observed between 10:00 PM and 6:00 AM. Common areas, kitchens, and shared bathrooms must be kept clean. Sub-leasing or unauthorized overnight guests are strictly prohibited.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>5. Dispute Resolution & Contact</Text>
              <Text style={styles.legalParagraph}>
                For any disputes between tenant and owner, Nestora Support assists as a mediator. Contact support@nestora.lk or call our 24/7 hotline at +94 11 234 5678.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalAcceptButton}
              onPress={() => {
                setAgreeTerms(true);
                setTermsModalVisible(false);
                if (validationErrors.agreeTerms) {
                  setValidationErrors((prev) => ({ ...prev, agreeTerms: null }));
                }
              }}
            >
              <Text style={styles.modalAcceptButtonText}>I Understand & Agree to Terms</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Privacy Policy Modal ── */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#6D28D9" style={{ marginRight: 8 }} />
              <Text style={styles.modalHeaderTitle}>Privacy Policy</Text>
            </View>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={{ padding: 6 }}>
              <Feather name="x" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHero}>
              <Text style={styles.modalHeroTitle}>DATA PROTECTION & PRIVACY</Text>
              <Text style={styles.modalHeroSubtitle}>How Nestora protects and handles your personal information</Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>1. Information We Collect</Text>
              <Text style={styles.legalParagraph}>
                • Account Data: Full name, verified email address, phone number, and account role (Student, Employee, or Boarding Owner).
              </Text>
              <Text style={styles.legalParagraph}>
                • Booking & Tenancy Records: Selected boarding places, accommodation room/bed configuration, check-in dates, and digital agreement signatures.
              </Text>
              <Text style={styles.legalParagraph}>
                • Payment Verification Data: Bank transfer slips, payment dates, bank branch names, and payment status records.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>2. How Your Data Is Used</Text>
              <Text style={styles.legalParagraph}>
                We use your data solely for account authentication, processing boarding reservations, facilitating communication between students and boarding owners, and maintaining verified rental ledgers.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>3. Storage & Encryption</Text>
              <Text style={styles.legalParagraph}>
                All passwords are encrypted with industry-standard bcrypt hashing. Data is stored securely in MongoDB databases with protected authentication tokens and SSL encryption.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>4. No Third-Party Selling</Text>
              <Text style={styles.legalParagraph}>
                Nestora strictly guarantees that your personal data is never sold, leased, or distributed to third-party marketing or advertising networks.
              </Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalHeading}>5. Your Rights & Account Deletion</Text>
              <Text style={styles.legalParagraph}>
                You have the full right to access your stored data, correct contact information, or request permanent deletion of your account and records by emailing privacy@nestora.lk.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalAcceptButton}
              onPress={() => {
                setAgreeTerms(true);
                setPrivacyModalVisible(false);
                if (validationErrors.agreeTerms) {
                  setValidationErrors((prev) => ({ ...prev, agreeTerms: null }));
                }
              }}
            >
              <Text style={styles.modalAcceptButtonText}>I Accept Privacy Policy</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Reusable Input Component with Validation & Autofill Separation
function InputField({
  label,
  placeholder,
  value,
  setValue,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  name,
  id,
  error,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={setValue}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          name={name}
          id={id}
        />
      </View>
      {error ? (
        <Text style={styles.inlineErrorText}>{error}</Text>
      ) : null}
    </View>
  );
}

// Password Component with Visibility Toggle & Validation
function PasswordField({
  label,
  placeholder,
  value,
  setValue,
  visible,
  setVisible,
  autoComplete,
  textContentType,
  error,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={!visible}
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          autoComplete={autoComplete}
          textContentType={textContentType}
        />

        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setVisible(!visible)}
        >
          <Feather
            name={visible ? 'eye' : 'eye-off'}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={styles.inlineErrorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 10,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  roleGroup: {
    marginBottom: 20,
  },
  rolesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  roleCardError: {
    borderColor: '#FCA5A5',
  },
  selectedRoleCard: {
    backgroundColor: '#F3E8FF',
    borderColor: '#6D28D9',
    borderWidth: 1.5,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
  },
  selectedRoleText: {
    color: '#6D28D9',
    fontWeight: '800',
  },
  termsWrapper: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxError: {
    borderColor: '#EF4444',
  },
  checkedCheckbox: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  checkboxText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  clickableLink: {
    color: '#6D28D9',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  signUpButton: {
    backgroundColor: '#6D28D9',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHero: {
    backgroundColor: '#6D28D9',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  modalHeroSubtitle: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  legalSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  legalHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  legalParagraph: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 6,
  },
  modalAcceptButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  modalAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
