import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Alert,
  Image,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { generateRealContractPdf } from '../utils/pdfGenerator';

const { width } = Dimensions.get('window');

// Step labels as shown in the mockup
const STEPS = ['Basic Information', 'Media & Photos', 'Facilities & Review'];
const BOARDING_TYPES = ['Hostel', 'Annex', 'Room'];

const CURATED_HOUSE_RULES = [
  { id: 'quiet', icon: 'volume-x', label: 'Quiet Hours (10PM - 6AM)', text: 'Quiet hours observed between 10:00 PM and 6:00 AM.' },
  { id: 'smoke', icon: 'slash', label: 'No Smoking / Alcohol', text: 'No smoking, alcohol, or illegal substances permitted on premises.' },
  { id: 'visitors', icon: 'users', label: 'Visitor Curfew (8PM)', text: 'Visitors allowed until 8:00 PM with strictly no overnight guests.' },
  { id: 'clean', icon: 'check-circle', label: 'Keep Common Areas Clean', text: 'Keep shared kitchen, bathrooms, and corridors tidy and clean.' },
  { id: 'energy', icon: 'zap', label: 'Turn Off Lights & Appliances', text: 'Switch off lights, fans, and AC when vacating rooms.' },
  { id: 'gate', icon: 'lock', label: 'Main Gate Curfew (10:30PM)', text: 'Main entrance gate is securely locked at 10:30 PM for safety.' },
];

const buildCombinedRules = (selectedIds, customText) => {
  const selectedList = CURATED_HOUSE_RULES.filter(r => selectedIds.includes(r.id)).map(r => `• ${r.text}`);
  const custom = (customText || '').trim();
  if (custom) {
    const customLines = custom.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.startsWith('•') ? l : `• ${l}`);
    return [...selectedList, ...customLines].join('\n');
  }
  return selectedList.join('\n');
};

export default function AddBoardingScreen({ onBack, onSubmit, initialData }) {
  const [currentStep, setCurrentStep] = useState(1);

  // Helper to initialize photos
  const getInitialPhotos = () => {
    const photos = initialData?.morePhotos || [];
    const slots = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      if (photos[i]) {
        slots[i] = photos[i];
      }
    }
    return slots;
  };

  // ── Step 1 state ─────────────────────────────────────
  const [boardingName, setBoardingName] = useState(initialData?.boardingName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [boardingType, setBoardingType] = useState(initialData?.boardingType || 'Annex');
  const [location, setLocation] = useState(initialData?.location || '');

  // ── Step 2 state ─────────────────────────────────────
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || null);   // URI string once picked
  const [morePhotos, setMorePhotos] = useState(getInitialPhotos()); // up to 4 extra photos

  // ── Step 3 state ─────────────────────────────────────
  const [totalRooms, setTotalRooms] = useState(initialData?.totalRooms ? String(initialData.totalRooms) : '');
  const [totalBeds, setTotalBeds] = useState(initialData?.totalBeds ? String(initialData.totalBeds) : '');
  const [availableRooms, setAvailableRooms] = useState(initialData?.availableRooms !== undefined ? String(initialData.availableRooms) : (initialData?.totalRooms ? String(initialData.totalRooms) : ''));
  const [availableBeds, setAvailableBeds] = useState(initialData?.availableBeds !== undefined ? String(initialData.availableBeds) : (initialData?.totalBeds ? String(initialData.totalBeds) : ''));
  const [bedsPerRoom, setBedsPerRoom] = useState(initialData?.bedsPerRoom || 'One Room per Bed (1 Bed/Room)');
  const [pricePerMonth, setPricePerMonth] = useState(initialData?.pricePerMonth ? String(initialData.pricePerMonth) : '');
  const [facilities, setFacilities] = useState(initialData?.facilities || {
    wifi: false,
    parking: false,
    laundry: false,
    kitchen: false,
    ac: false,
    hotWater: false,
  });
  const [contactNumber, setContactNumber] = useState(initialData?.contactNumber || '');
  
  // House Rules state
  const [selectedRuleIds, setSelectedRuleIds] = useState(() => {
    if (!initialData?.rules) return ['quiet', 'clean', 'energy'];
    return CURATED_HOUSE_RULES.filter(r => 
      initialData.rules.toLowerCase().includes(r.id) || 
      initialData.rules.toLowerCase().includes(r.label.toLowerCase().substring(0, 7))
    ).map(r => r.id);
  });
  const [customRuleText, setCustomRuleText] = useState('');
  const [rules, setRules] = useState(() => {
    if (initialData?.rules) return initialData.rules;
    return buildCombinedRules(['quiet', 'clean', 'energy'], '');
  });

  const [contractPdf, setContractPdf] = useState(initialData?.contractPdf || '');
  const [contractPdfName, setContractPdfName] = useState(initialData?.contractPdfName || '');
  const [showContractPreviewModal, setShowContractPreviewModal] = useState(false);

  const toggleRule = (ruleId) => {
    setSelectedRuleIds((prev) => {
      const next = prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId];
      const combined = buildCombinedRules(next, customRuleText);
      setRules(combined);
      return next;
    });
  };

  const handleCustomRuleChange = (text) => {
    setCustomRuleText(text);
    const combined = buildCombinedRules(selectedRuleIds, text);
    setRules(combined);
  };

  const toggleFacility = (key) =>
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));

  // Helper for picking PDF contract
  const pickContractPdf = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setContractPdf(event.target.result);
              setContractPdfName(file.name);
              alert(`Contract PDF Attached: ${file.name}`);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setContractPdf(asset.uri);
          setContractPdfName(asset.name || 'boarding_contract.pdf');
          Alert.alert('Contract Attached!', `Attached: ${asset.name || 'contract.pdf'}`);
        }
      }
    } catch (err) {
      console.log('Contract picker error:', err);
      Alert.alert('File Selection', 'Could not select PDF contract file.');
    }
  };

  // Helper for generating standard rental agreement PDF
  const generateStandardContract = () => {
    try {
      const currentRules = rules || buildCombinedRules(selectedRuleIds, customRuleText);
      const pdfResult = generateRealContractPdf({
        boardingName,
        location,
        pricePerMonth,
        bedsPerRoom,
        contactNumber,
        rules: currentRules,
        totalRooms,
        totalBeds,
      });

      setContractPdf(pdfResult.pdfDataUri);
      setContractPdfName(pdfResult.fileName);

      // Automatically download to owner's laptop so they can inspect it immediately!
      pdfResult.downloadPdf();

      if (Platform.OS === 'web') {
        alert(`✅ Official Tenancy Agreement PDF Generated!\n\nDownloaded to your laptop as:\n${pdfResult.fileName}\n\nYou can also click 'View / Preview PDF' to view it directly.`);
      } else {
        Alert.alert('Contract Generated!', `Generated: ${pdfResult.fileName}\nDownloaded and ready for review.`);
      }
    } catch (err) {
      console.log('Contract generation error:', err);
      Alert.alert('Error', 'Failed to generate PDF contract.');
    }
  };

  const viewPdfContract = () => {
    if (!contractPdf) {
      generateStandardContract();
      return;
    }
    if (Platform.OS === 'web') {
      try {
        const win = window.open();
        if (win) {
          win.document.write(`
            <html>
              <head><title>${contractPdfName || 'Rental Agreement PDF'}</title></head>
              <body style="margin:0;padding:0;">
                <iframe src="${contractPdf}" style="border:0;width:100vw;height:100vh;"></iframe>
              </body>
            </html>
          `);
          return;
        }
      } catch (e) {
        console.log('Window open error:', e);
      }
    }
    setShowContractPreviewModal(true);
  };

  const downloadPdfContract = () => {
    if (!contractPdf) {
      generateStandardContract();
      return;
    }
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = contractPdf;
      link.download = contractPdfName || `${boardingName || 'Boarding'}_Rental_Agreement.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Contract Download', `Downloading ${contractPdfName}...`);
    }
  };

  // ── Navigation ────────────────────────────────────────
  const handleNext = () => {
    if (currentStep === 1) {
      if (!boardingName.trim()) {
        Alert.alert('Validation', 'Please enter a boarding name.');
        return;
      }
      if (!location.trim()) {
        Alert.alert('Validation', 'Please enter a location.');
        return;
      }
    }
    if (currentStep === 3) {
      if (!totalRooms.trim() || !pricePerMonth.trim()) {
        Alert.alert('Validation', 'Please fill in required room details.');
        return;
      }
      handleSubmit();
      return;
    }
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      if (onBack) onBack();
    }
  };

  const handleSubmit = () => {
    const boardingData = {
      boardingName,
      description,
      boardingType,
      location,
      coverImage,
      morePhotos: morePhotos.filter(Boolean),
      totalRooms,
      totalBeds,
      availableRooms: availableRooms.trim() !== '' ? availableRooms : totalRooms,
      availableBeds: availableBeds.trim() !== '' ? availableBeds : totalBeds,
      bedsPerRoom,
      pricePerMonth,
      facilities,
      contactNumber,
      rules,
      contractPdf: contractPdf || 'GENERATE_STANDARD_PDF',
      contractPdfName: contractPdfName || `${boardingName || 'Boarding'}_Standard_Agreement.pdf`,
    };
    if (onSubmit) {
      onSubmit(boardingData);
    } else {
      Alert.alert('Success! 🎉', 'Your boarding has been submitted for review.');
    }
  };

  // ── Image Picker Helpers ──────────────────────────────
  /**
   * Ask for media-library permission, then open the given source.
   * Returns the picked URI or null.
   */
  const openPicker = useCallback(async (useCamera = false) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return null;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to pick images.');
        return null;
      }
    }

    const result = await (useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync)({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        return `data:image/jpeg;base64,${asset.base64}`;
      }
      return asset.uri;
    }
    return null;
  }, []);

  /**
   * Show action sheet (iOS) or Alert (Android) to choose Camera vs Gallery,
   * then call openPicker.
   */
  const showPickerOptions = useCallback((onPicked) => {
    if (Platform.OS === 'web') {
      // Alert.alert with custom buttons doesn't work on React Native Web,
      // so just open the gallery picker directly — no camera choice needed on web.
      openPicker(false).then((uri) => {
        if (uri) onPicked(uri);
      });
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const uri = await openPicker(true);
            if (uri) onPicked(uri);
          } else if (buttonIndex === 2) {
            const uri = await openPicker(false);
            if (uri) onPicked(uri);
          }
        },
      );
    } else {
      // Android – use Alert as a simple action sheet
      Alert.alert(
        'Add Photo',
        'Choose how you want to add a photo',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📷  Take Photo',
            onPress: async () => {
              const uri = await openPicker(true);
              if (uri) onPicked(uri);
            },
          },
          {
            text: '🖼️  Choose from Library',
            onPress: async () => {
              const uri = await openPicker(false);
              if (uri) onPicked(uri);
            },
          },
        ],
      );
    }
  }, [openPicker]);

  /** Pick / replace the cover image */
  const pickCoverImage = () => {
    showPickerOptions((uri) => setCoverImage(uri));
  };

  /** Remove cover image */
  const removeCoverImage = () => {
    if (Platform.OS === 'web') {
      setCoverImage(null);
      return;
    }
    Alert.alert('Remove Cover Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setCoverImage(null) },
    ]);
  };

  /** Pick a photo for a specific slot in the morePhotos grid */
  const pickMorePhoto = (index) => {
    if (morePhotos[index]) {
      if (Platform.OS === 'web') {
        // No native Alert action sheet on web — just remove directly on click.
        setMorePhotos((prev) => {
          const next = [...prev];
          next[index] = null;
          return next;
        });
        return;
      }
      Alert.alert('Photo Options', 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          onPress: () =>
            showPickerOptions((uri) => {
              setMorePhotos((prev) => {
                const next = [...prev];
                next[index] = uri;
                return next;
              });
            }),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            setMorePhotos((prev) => {
              const next = [...prev];
              next[index] = null;
              return next;
            }),
        },
      ]);
    } else {
      showPickerOptions((uri) => {
        setMorePhotos((prev) => {
          const next = [...prev];
          next[index] = uri;
          return next;
        });
      });
    }
  };

  const facilityList = [
    { key: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
    { key: 'parking', label: 'Parking', icon: 'car' },
    { key: 'laundry', label: 'Laundry', icon: 'layers' },
    { key: 'kitchen', label: 'Kitchen', icon: 'coffee' },
    { key: 'ac', label: 'AC', icon: 'wind' },
    { key: 'hotWater', label: 'Hot Water', icon: 'droplet' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{initialData ? 'Update Boarding' : 'Add New Boarding'}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* ── Step Indicator ── */}
        <View style={styles.stepIndicatorContainer}>
          <Text style={styles.stepLabel}>
            <Text style={styles.stepLabelBold}>
              {currentStep}/{STEPS.length} {STEPS[currentStep - 1]}
            </Text>
          </Text>
          {/* Purple underline under step label */}
          <View style={styles.stepUnderline} />
          {/* Bar track */}
          <View style={styles.stepBarTrack}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepBarSegment,
                  i < currentStep ? styles.stepBarActive : styles.stepBarInactive,
                  i < STEPS.length - 1 && { marginRight: 4 },
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ══════════════════════════════════════════
              STEP 1 – Basic Information
          ══════════════════════════════════════════ */}
          {currentStep === 1 && (
            <View>
              {/* Boarding Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Boarding Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter boarding name"
                    placeholderTextColor="#94A3B8"
                    value={boardingName}
                    onChangeText={setBoardingName}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your property"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>

              {/* Boarding Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Boarding Type</Text>
                <View style={styles.typeSelector}>
                  {BOARDING_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setBoardingType(type)}
                      style={[
                        styles.typeButton,
                        boardingType === type && styles.typeButtonActive,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          boardingType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter location"
                    placeholderTextColor="#94A3B8"
                    value={location}
                    onChangeText={setLocation}
                  />
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => Alert.alert('Map', 'Map picker coming soon!')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location-outline" size={16} color="#6D28D9" />
                    <Text style={styles.mapButtonText}>Select on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════
              STEP 2 – Media & Photos
          ══════════════════════════════════════════ */}
          {currentStep === 2 && (
            <View>
              {/* Add Cover Image */}
              <Text style={styles.sectionHeading}>Add Cover Image</Text>

              {/* Cover upload / preview */}
              <View style={styles.coverContainer}>
                <TouchableOpacity
                  style={styles.coverUploadBox}
                  onPress={pickCoverImage}
                  activeOpacity={0.8}
                >
                  {coverImage ? (
                    <Image
                      source={{ uri: coverImage }}
                      style={[styles.coverPreview, { resizeMode: 'contain', backgroundColor: '#F1F5F9' }]}
                    />
                  ) : (
                    <View style={styles.coverUploadInner}>
                      <View style={styles.cameraIconWrapper}>
                        <Feather name="camera" size={40} color="#6D28D9" />
                      </View>
                      <Text style={styles.coverUploadText}>Tap to Upload a Cover Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Remove cover button – only when image is set */}
                {coverImage && (
                  <TouchableOpacity
                    style={styles.removeCornerBtn}
                    onPress={removeCoverImage}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* More Photos */}
              <Text style={styles.morePhotosLabel}>More Photos</Text>

              <View style={styles.photoGrid}>
                {/* First cell: camera + add button */}
                <View style={styles.photoCell}>
                  <TouchableOpacity
                    style={[styles.photoAddCell, morePhotos[0] && styles.photoCellFilled]}
                    onPress={() => pickMorePhoto(0)}
                    activeOpacity={0.8}
                  >
                    {morePhotos[0] ? (
                      <Image
                        source={{ uri: morePhotos[0] }}
                        style={[styles.photoThumb, { resizeMode: 'contain', backgroundColor: '#F1F5F9' }]}
                      />
                    ) : (
                      <View style={styles.photoAddIcon}>
                        <Feather name="camera" size={22} color="#6D28D9" />
                        <View style={styles.plusBadge}>
                          <Feather name="plus" size={9} color="#FFFFFF" />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                  {morePhotos[0] && (
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => pickMorePhoto(0)}
                      hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                    >
                      <Feather name="x" size={10} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Remaining 3 cells */}
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.photoCell}>
                    <TouchableOpacity
                      style={[styles.photoEmptyCell, morePhotos[i] && styles.photoCellFilled]}
                      onPress={() => pickMorePhoto(i)}
                      activeOpacity={0.8}
                    >
                      {morePhotos[i] ? (
                        <Image
                          source={{ uri: morePhotos[i] }}
                          style={[styles.photoThumb, { resizeMode: 'contain', backgroundColor: '#F1F5F9' }]}
                        />
                      ) : (
                        <View style={styles.photoEmptyIcon}>
                          <Feather name="plus" size={18} color="#94A3B8" />
                        </View>
                      )}
                    </TouchableOpacity>
                    {morePhotos[i] && (
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => pickMorePhoto(i)}
                        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                      >
                        <Feather name="x" size={10} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <Text style={styles.addPhotosHint}>Add Photos</Text>
            </View>
          )}

          {/* ══════════════════════════════════════════
              STEP 3 – Facilities & Review
          ══════════════════════════════════════════ */}
          {currentStep === 3 && (
            <View>
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <MaterialCommunityIcons name="home-city-outline" size={20} color="#6D28D9" />
                  <Text style={styles.summaryTitle}>{boardingName || 'My Boarding'}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryDetail}>
                  <Text style={styles.summaryKey}>Type</Text>
                  <Text style={styles.summaryValue}>{boardingType}</Text>
                </View>
                <View style={styles.summaryDetail}>
                  <Text style={styles.summaryKey}>Location</Text>
                  <Text style={styles.summaryValue}>{location || '—'}</Text>
                </View>
                <View style={styles.summaryDetail}>
                  <Text style={styles.summaryKey}>Cover Photo</Text>
                  <Text style={styles.summaryValue}>{coverImage ? '✓ Added' : 'Not added'}</Text>
                </View>
              </View>

              {/* Room Details */}
              <View style={styles.rowInputGroup}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Total Rooms *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 10"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={totalRooms}
                      onChangeText={setTotalRooms}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Available Rooms</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 5"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={availableRooms}
                      onChangeText={setAvailableRooms}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.rowInputGroup}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Total Beds</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 20"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={totalBeds}
                      onChangeText={setTotalBeds}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Available Beds</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 8"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={availableBeds}
                      onChangeText={setAvailableBeds}
                    />
                  </View>
                </View>
              </View>

              {/* Room Configuration / Beds per Room */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Room Configuration (Beds per Room)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {[
                    'One Room per Bed (1 Bed/Room)',
                    '2 Beds per Room',
                    '3 Beds per Room',
                    '4 Beds per Room',
                  ].map((configOption) => (
                    <TouchableOpacity
                      key={configOption}
                      onPress={() => setBedsPerRoom(configOption)}
                      style={[
                        {
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 20,
                          backgroundColor: bedsPerRoom === configOption ? '#F3E8FF' : '#F1F5F9',
                          borderWidth: 1.5,
                          borderColor: bedsPerRoom === configOption ? '#6D28D9' : '#E2E8F0',
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: bedsPerRoom === configOption ? '#6D28D9' : '#475569',
                        }}
                      >
                        {configOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Or type custom configuration (e.g. 2 Beds per Room)"
                    placeholderTextColor="#94A3B8"
                    value={bedsPerRoom}
                    onChangeText={setBedsPerRoom}
                  />
                </View>
              </View>

              {/* Price Per Month */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Price Per Month (Rs.) * <Text style={{ color: '#6D28D9', fontWeight: '600', fontSize: 11 }}>(Price for 1 Bed per Month)</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyPrefix}>Rs.</Text>
                  <TextInput
                    style={[styles.input, { paddingLeft: 4 }]}
                    placeholder="e.g. 15000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={pricePerMonth}
                    onChangeText={setPricePerMonth}
                  />
                </View>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>
                  ℹ️ Note: This amount represents the monthly rental price for 1 bed.
                </Text>
              </View>

              {/* Facilities */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Facilities</Text>
                <View style={styles.facilitiesGrid}>
                  {facilityList.map((fac) => (
                    <TouchableOpacity
                      key={fac.key}
                      onPress={() => toggleFacility(fac.key)}
                      style={[
                        styles.facilityChip,
                        facilities[fac.key] && styles.facilityChipActive,
                      ]}
                      activeOpacity={0.8}
                    >
                      {fac.key === 'parking' || fac.icon === 'car' ? (
                        <MaterialCommunityIcons
                          name="car"
                          size={16}
                          color={facilities[fac.key] ? '#6D28D9' : '#64748B'}
                          style={{ marginRight: 5 }}
                        />
                      ) : (
                        <Feather
                          name={fac.icon}
                          size={14}
                          color={facilities[fac.key] ? '#6D28D9' : '#64748B'}
                          style={{ marginRight: 5 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.facilityChipText,
                          facilities[fac.key] && styles.facilityChipTextActive,
                        ]}
                      >
                        {fac.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="phone" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 0771234567"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={setContactNumber}
                  />
                </View>
              </View>

              {/* House Rules Section with Curated Rules & Custom Addition */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>House Rules (Select & Add Rules)</Text>
                  <Text style={{ fontSize: 11, color: '#6D28D9', fontWeight: '700' }}>
                    {selectedRuleIds.length} Selected
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                  Tap any common rule to select or deselect it, or type extra rules below:
                </Text>

                {/* 6 Curated Rules Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {CURATED_HOUSE_RULES.map((rule) => {
                    const isSelected = selectedRuleIds.includes(rule.id);
                    return (
                      <TouchableOpacity
                        key={rule.id}
                        onPress={() => toggleRule(rule.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 9,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: isSelected ? '#F3E8FF' : '#F8FAFC',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#6D28D9' : '#E2E8F0',
                        }}
                        activeOpacity={0.8}
                      >
                        <Feather
                          name={rule.icon}
                          size={14}
                          color={isSelected ? '#6D28D9' : '#64748B'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? '#6D28D9' : '#334155',
                            marginRight: 4,
                          }}
                        >
                          {rule.label}
                        </Text>
                        <Feather
                          name={isSelected ? 'check-circle' : 'plus-circle'}
                          size={13}
                          color={isSelected ? '#6D28D9' : '#94A3B8'}
                          style={{ marginLeft: 4 }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Additional Custom Rules Input */}
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  Add Other Custom Rules (Optional):
                </Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper, { minHeight: 70 }]}>
                  <TextInput
                    style={[styles.input, styles.textArea, { minHeight: 60 }]}
                    placeholder="Type any specific guidelines (e.g. No loud music after 9 PM, garbage collection on Tuesday)..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={customRuleText}
                    onChangeText={handleCustomRuleChange}
                  />
                </View>

                {/* Live Rules Summary Box */}
                <View style={{ marginTop: 10, backgroundColor: '#FAF5FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDE9FE' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D28D9', textTransform: 'uppercase', marginBottom: 4 }}>
                    📋 Active House Rules for Students:
                  </Text>
                  <Text style={{ fontSize: 12, color: '#4C1D95', lineHeight: 18 }}>
                    {rules || 'No rules selected yet. Tap the buttons above or write custom rules.'}
                  </Text>
                </View>
              </View>

              {/* Boarding Rental Contract (PDF) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Boarding Rental Contract (PDF Agreement)</Text>

                {/* Explanation Card for Owner */}
                <View style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="information-circle" size={16} color="#6D28D9" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                      What does this section do?
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
                    This section attaches an official Tenancy Agreement to your boarding place. Students can view and download this contract when booking.
                    {'\n'}• <Text style={{ fontWeight: '700', color: '#0F172A' }}>Generate Standard PDF:</Text> Automatically generates an official contract with your rent, <Text style={{ fontWeight: '700', color: '#6D28D9' }}>Key Money rules (1st month double payment)</Text>, and house rules.
                    {'\n'}• <Text style={{ fontWeight: '700', color: '#0F172A' }}>Upload PDF:</Text> Attach an existing scanned agreement from your laptop.
                  </Text>
                </View>

                {/* Attached / Generated Contract Card */}
                {contractPdfName ? (
                  <View style={{
                    backgroundColor: '#F3E8FF',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1.5,
                    borderColor: '#C084FC',
                    marginBottom: 12,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <MaterialCommunityIcons name="file-pdf-box" size={32} color="#6D28D9" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9' }} numberOfLines={1}>
                          {contractPdfName}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          ✓ Official tenancy contract attached & ready for students
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setContractPdf('');
                          setContractPdfName('');
                        }}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      >
                        <Feather name="trash-2" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Owner Action Buttons to View and Download PDF */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#6D28D9',
                          borderRadius: 10,
                          paddingVertical: 10,
                          shadowColor: '#6D28D9',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        onPress={viewPdfContract}
                        activeOpacity={0.85}
                      >
                        <Feather name="eye" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>View / Preview PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#6D28D9',
                          borderRadius: 10,
                          paddingVertical: 10,
                        }}
                        onPress={downloadPdfContract}
                        activeOpacity={0.85}
                      >
                        <Feather name="download" size={15} color="#6D28D9" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>Download to Laptop</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#6D28D9',
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                    }}
                    onPress={pickContractPdf}
                    activeOpacity={0.8}
                  >
                    <Feather name="upload" size={16} color="#6D28D9" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>Upload PDF Contract</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#6D28D9',
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      shadowColor: '#6D28D9',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 5,
                      elevation: 3,
                    }}
                    onPress={generateStandardContract}
                    activeOpacity={0.8}
                  >
                    <Feather name="file-text" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Generate Standard PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoNotice}>
                <Ionicons name="information-circle-outline" size={16} color="#6D28D9" />
                <Text style={styles.infoNoticeText}>
                  Your boarding listing will be reviewed before going live.
                </Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Fixed Bottom Bar ── */}
      <View style={styles.bottomBar}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', width: '100%' }}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={{
                flex: 1,
                height: 52,
                borderRadius: 14,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={18} color="#475569" style={{ marginRight: 6 }} />
              <Text style={{ color: '#475569', fontSize: 15, fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              { flex: currentStep > 1 ? 2 : 1 }
            ]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 3 ? (initialData ? 'Update Boarding' : 'Publish Listing') : 'Next'}
            </Text>
            <Feather
              name={currentStep === 3 ? 'check' : 'arrow-right'}
              size={18}
              color="#FFFFFF"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Contract Preview Modal ── */}
      <Modal
        visible={showContractPreviewModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowContractPreviewModal(false)}
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
            backgroundColor: '#FFFFFF',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="file-pdf-box" size={26} color="#6D28D9" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                Tenancy Contract Preview
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowContractPreviewModal(false)}
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
            <View style={{ backgroundColor: '#6D28D9', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' }}>
                OFFICIAL BOARDING RENTAL AGREEMENT
              </Text>
              <Text style={{ color: '#E9D5FF', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                SMRP NESTORA PLATFORM • OFFICIAL LEGAL RECORD
              </Text>
            </View>

            {/* Property Overview Card */}
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 8 }}>
                1. Property & Owner Specifications
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                {boardingName || 'Boarding Place'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                📍 {location || 'Not specified'} • 📞 {contactNumber || 'Not provided'}
              </Text>
              <Text style={{ fontSize: 12, color: '#475569', marginTop: 4, fontWeight: '600' }}>
                Capacity: {totalRooms || 1} Room(s) • {totalBeds || 1} Bed(s) ({bedsPerRoom || 'Standard'})
              </Text>
            </View>

            {/* Financial Terms Card */}
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 10 }}>
                2. Financial & Tenancy Terms
              </Text>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Monthly Fee (Per Bed):</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9' }}>Rs. {parseInt(pricePerMonth || 15000).toLocaleString()} / mo</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Key Money (Deposit):</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Rs. {parseInt(pricePerMonth || 15000).toLocaleString()}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>1st Month Move-In (Double Payment):</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#6D28D9' }}>Rs. {(parseInt(pricePerMonth || 15000) * 2).toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Move-Out Notice Required:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#D95300' }}>2 Months (60 Days)</Text>
                </View>
              </View>
            </View>

            {/* Boarding Agreement & Key Money Rules */}
            <View style={{ backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#92400E', textTransform: 'uppercase' }}>
                  3. Boarding Agreement & Key Money Rules
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>🔑 1st Month Double Payment (Key Money)</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    Upon move-in, the 1st month payment includes 1 month rent + 1 month Key Money security deposit (Double Payment: Rs. {(parseInt(pricePerMonth || 15000) * 2).toLocaleString()}).
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>📢 2-Month Move-Out Notice</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    You must inform the boarding owner at least 2 months in advance before vacating or leaving the boarding place.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>🗓️ 1-Year Minimum Stay Requirement</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    Key money benefits and last-month rent coverage are valid only if you complete a minimum stay of 1 year (12 months).
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>💸 Last Month Rent Free (After 1 Year)</Text>
                  <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2, lineHeight: 16 }}>
                    When completing a 1-year stay, no rental fee is required for the final month as it is covered by your initial key money deposit.
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>⚠️ Early Departure Policy (Under 1 Year)</Text>
                  <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 2, lineHeight: 16 }}>
                    If you leave the boarding place before completing 1 full year, the key money deposit cannot be refunded or credited.
                  </Text>
                </View>
              </View>
            </View>

            {/* House Rules */}
            <View style={{ backgroundColor: '#FAF5FF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#DDD6FE', marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9', textTransform: 'uppercase', marginBottom: 8 }}>
                4. House Rules & Regulations
              </Text>
              <Text style={{ fontSize: 12, color: '#4C1D95', lineHeight: 20 }}>
                {rules || 'Standard rules apply.'}
              </Text>
            </View>

            {/* Action Download Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#6D28D9',
                borderRadius: 14,
                paddingVertical: 14,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 30,
              }}
              onPress={downloadPdfContract}
              activeOpacity={0.85}
            >
              <Feather name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                Download Contract PDF to Laptop
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerPlaceholder: { width: 34 },

  // ── Step Indicator ──────────────────────────────────────
  stepIndicatorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 6,
  },
  stepLabel: {
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 4,
  },
  stepLabelBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  stepUnderline: {
    height: 3,
    width: 120,
    backgroundColor: '#6D28D9',
    borderRadius: 4,
    marginBottom: 10,
  },
  stepBarTrack: {
    flexDirection: 'row',
  },
  stepBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
  },
  stepBarActive: { backgroundColor: '#6D28D9' },
  stepBarInactive: { backgroundColor: '#E2E8F0' },

  // ── Scroll / Form ────────────────────────────────────────
  keyboardView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 110,
  },

  // ── Generic Input ────────────────────────────────────────
  inputGroup: { marginBottom: 20 },
  rowInputGroup: { flexDirection: 'row', marginBottom: 0 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 12 },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  textArea: { height: 90 },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },

  // ── Boarding Type Selector ───────────────────────────────
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  typeButtonActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  typeButtonText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  typeButtonTextActive: { color: '#FFFFFF' },

  // ── Map Button ───────────────────────────────────────────
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    marginLeft: 4,
  },

  // ── STEP 2 – Cover Image ─────────────────────────────────
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 12,
  },
  coverContainer: {
    position: 'relative',
    marginBottom: 28,
  },
  coverUploadBox: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 1.8,
    borderColor: '#6D28D9',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeCornerBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverUploadInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconWrapper: {
    marginBottom: 14,
    opacity: 0.75,
  },
  coverUploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // ── STEP 2 – More Photos ─────────────────────────────────
  morePhotosLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  photoCell: {
    position: 'relative',
  },
  photoAddCell: {
    width: (width - 40 - 30) / 4,
    height: (width - 40 - 30) / 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  photoEmptyCell: {
    width: (width - 40 - 30) / 4,
    height: (width - 40 - 30) / 4,
    borderRadius: 12,
    backgroundColor: '#E8E8EE',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCellFilled: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  photoAddIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoEmptyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotosHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },

  // ── STEP 3 – Facilities ──────────────────────────────────
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  facilityChipActive: {
    borderColor: '#6D28D9',
    backgroundColor: '#EDE9FE',
  },
  facilityChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  facilityChipTextActive: { color: '#6D28D9' },

  // ── STEP 3 – Summary Card ────────────────────────────────
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  summaryDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryKey: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    maxWidth: width * 0.5,
    textAlign: 'right',
  },

  // ── Info Notice ───────────────────────────────────────────
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  infoNoticeText: {
    fontSize: 12,
    color: '#5B21B6',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },

  // ── Bottom Bar ────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#6D28D9',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
