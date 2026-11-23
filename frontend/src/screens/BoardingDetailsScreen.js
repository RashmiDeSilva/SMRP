import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Platform,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { generateRealContractPdf } from '../utils/pdfGenerator';

const { width, height } = Dimensions.get('window');

export default function BoardingDetailsScreen({ boarding, onBack, isSaved, onToggleSave, onBook }) {
  const [isContractModalVisible, setIsContractModalVisible] = useState(false);

  if (!boarding) return null;

  // Resolve active facilities from database
  const activeFacilities = [];
  if (boarding.facilities) {
    if (boarding.facilities.wifi) activeFacilities.push({ label: 'Wi-Fi', icon: 'wifi' });
    if (boarding.facilities.ac) activeFacilities.push({ label: 'AC', icon: 'wind' });
    if (boarding.facilities.hotWater) activeFacilities.push({ label: 'Hot Water', icon: 'droplet' });
    if (boarding.facilities.parking) activeFacilities.push({ label: 'Parking', icon: 'car' });
    if (boarding.facilities.laundry) activeFacilities.push({ label: 'Laundry', icon: 'layers' });
    if (boarding.facilities.kitchen) activeFacilities.push({ label: 'Kitchen', icon: 'coffee' });
  }

  // Ensure default/fallback list matches the mockup visual layout perfectly
  if (activeFacilities.length === 0) {
    activeFacilities.push({ label: 'Wi-Fi', icon: 'wifi' });
    activeFacilities.push({ label: 'AC', icon: 'wind' });
    activeFacilities.push({ label: 'Hot Water', icon: 'droplet' });
    activeFacilities.push({ label: 'CCTV', icon: 'video' });
    activeFacilities.push({ label: 'Kitchen', icon: 'coffee' });
  }

  const handleBook = () => {
    if (onBook) {
      onBook(boarding);
    }
  };

  const toggleSave = () => {
    if (onToggleSave) onToggleSave(boarding._id);
    Alert.alert('Save', isSaved ? 'Removed from saved boarding places.' : 'Saved to your profile!');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Cover Image Card */}
        <View style={styles.imageCard}>
          {boarding.coverImage ? (
            <Image source={{ uri: boarding.coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Ionicons name="home-outline" size={80} color="#CBD5E1" />
            </View>
          )}

          {/* Top Actions Overlay */}
          <SafeAreaView style={styles.headerOverlay}>
            <View style={styles.headerBar}>
              <TouchableOpacity style={styles.circleBtn} onPress={onBack} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color="#1E293B" />
              </TouchableOpacity>

              <View style={styles.headerRight}>
                <TouchableOpacity style={[styles.circleBtn, { marginRight: 10 }]} activeOpacity={0.8}>
                  <Ionicons name="share-social-outline" size={20} color="#1E293B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleBtn} onPress={toggleSave} activeOpacity={0.8}>
                  <Ionicons 
                    name={isSaved ? "heart" : "heart-outline"} 
                    size={20} 
                    color={isSaved ? "#EF4444" : "#1E293B"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* V10 status badge bottom right */}
          <View style={styles.badgeOverlay}>
            <Text style={styles.badgeText}>V10</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Title & Info Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleLeft}>
              <Text style={styles.boardingName}>{boarding.boardingName}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#6D28D9" style={styles.pinIcon} />
                <Text style={styles.locationText}>{boarding.location || 'Colombo, Sri Lanka'}</Text>
              </View>
            </View>

            <View style={styles.titleRight}>
              <Text style={styles.priceText}>
                <Text style={styles.priceBold}>Rs. {parseInt(boarding.pricePerMonth || 0).toLocaleString()}</Text>
                <Text style={styles.priceSuffix}> / month</Text>
              </Text>
              <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '700', marginTop: 2, textAlign: 'right' }}>
                (Price for 1 bed / month)
              </Text>
            </View>
          </View>

          {/* ── Room & Bed Availability Info Card ── */}
          {(() => {
            const totalR = boarding.totalRooms || 1;
            const totalB = boarding.totalBeds || (totalR * 2);
            const availB = boarding.availableBeds !== undefined ? boarding.availableBeds : totalB;
            const bedsPerRoomNum = parseInt((boarding.bedsPerRoom || '').match(/\d+/)?.[0], 10)
              || (totalR && totalB ? Math.max(1, Math.round(totalB / totalR)) : 2)
              || 2;
            // Room only decreases when all beds in that room are booked!
            // When 1 bed is booked in a 2-bed room, the room remains available.
            const displayAvailRooms = Math.min(totalR, Math.max(0, Math.ceil(availB / bedsPerRoomNum)));

            return (
              <View style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
                  🏠 Room & Bed Availability
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  {/* Available Rooms */}
                  <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' }}>
                    <Ionicons name="home-outline" size={20} color="#6D28D9" style={{ marginBottom: 4 }} />
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Available Rooms</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                      {displayAvailRooms} / {totalR}
                    </Text>
                  </View>

                  {/* Available Beds */}
                  <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' }}>
                    <Ionicons name="bed-outline" size={20} color="#6D28D9" style={{ marginBottom: 4 }} />
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Available Beds</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                      {availB} / {totalB}
                    </Text>
                  </View>
                </View>

                {/* One Room per Bed / Beds per Room details */}
                <View style={{ marginTop: 10, backgroundColor: '#F3E8FF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="information-circle" size={16} color="#6D28D9" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D28D9', flex: 1 }}>
                    Configuration: {boarding.bedsPerRoom || `${bedsPerRoomNum} Beds per Room`}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* ── Middle Section: See Contract & Rules Button ── */}
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#6D28D9',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#6D28D9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => setIsContractModalVisible(true)}
              activeOpacity={0.88}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    See the Contract & Rules
                  </Text>
                  <Text style={{ fontSize: 11, color: '#E9D5FF', fontWeight: '600', marginTop: 2 }}>
                    View PDF tenancy agreement & house rules
                  </Text>
                </View>
              </View>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Facilities Row */}
          <View style={styles.facilitiesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.facilitiesScroll}>
              {activeFacilities.map((fac, idx) => (
                <View key={idx} style={styles.facilityCard}>
                  <View style={styles.facilityIconBox}>
                    {fac.icon === 'car' ? (
                      <MaterialCommunityIcons name="car" size={20} color="#6D28D9" />
                    ) : (
                      <Feather name={fac.icon} size={20} color="#6D28D9" />
                    )}
                  </View>
                  <Text style={styles.facilityLabel}>{fac.label}</Text>
                </View>
              ))}
              <View style={styles.facilityCard}>
                <View style={[styles.facilityIconBox, styles.facilityIconBoxExtra]}>
                  <Text style={styles.extraText}>+5</Text>
                </View>
                <Text style={styles.facilityLabel}>+5</Text>
              </View>
            </ScrollView>
          </View>

          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {boarding.description || 
                "A comfortable and safe annex located in a quiet environment. Perfect for students and working professionals. Includes easy access to supermarkets, public transportation, and nearby universities."}
            </Text>
          </View>

          {/* House Rules Section (if available) */}
          {boarding.rules ? (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <Text style={styles.sectionTitle}>House Rules</Text>
              <Text style={styles.descriptionText}>{boarding.rules}</Text>
            </View>
          ) : null}

          {/* More Info / Contact Me Section */}
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            <Text style={styles.sectionTitle}>More Info / Contact Owner</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12, fontWeight: '500', lineHeight: 18 }}>
              Need more details about this boarding place? Contact the boarding owner directly:
            </Text>

            <View style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: '#F3E8FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Feather name="phone-call" size={18} color="#6D28D9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Contact Me:
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 1 }}>
                    {boarding.contactNumber || '077 123 4567'}
                  </Text>
                </View>
                {boarding.contactNumber && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#6D28D9',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = `tel:${boarding.contactNumber}`;
                      } else {
                        Alert.alert('Contact Owner', `Call ${boarding.contactNumber}`);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Call Now</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                <Feather name="user" size={14} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                  Owner: {typeof boarding.owner === 'object' && boarding.owner?.email ? boarding.owner.email : (boarding.owner || 'Boarding Owner')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={toggleSave} activeOpacity={0.8}>
          <Ionicons 
            name={isSaved ? "heart" : "heart-outline"} 
            size={20} 
            color="#6D28D9" 
            style={{ marginRight: 6 }} 
          />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.85}>
          <Text style={styles.bookBtnText}>Inquire / Book</Text>
        </TouchableOpacity>
      </View>

      {/* ── Contract & House Rules Modal Viewer ── */}
      <Modal
        visible={isContractModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsContractModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {/* Modal Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="file-certificate" size={24} color="#6D28D9" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                Contract & Boarding Rules
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsContractModalVisible(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#F1F5F9',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="x" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* 📜 PDF Contract Section */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                  <MaterialCommunityIcons name="file-pdf-box" size={36} color="#DC2626" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      Boarding Tenancy Contract (PDF)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                      {boarding.contractPdfName || `${boarding.boardingName || 'Boarding'}_Agreement.pdf`}
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>PDF Official</Text>
                </View>
              </View>

              {/* Digital Contract Document Summary / Preview */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#6D28D9', textAlign: 'center', marginBottom: 12, letterSpacing: 0.5 }}>
                  MEMORANDUM OF BOARDING RENTAL AGREEMENT
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20, marginBottom: 6 }}>
                  • <Text style={{ fontWeight: '800' }}>Property Name:</Text> {boarding.boardingName}
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20, marginBottom: 6 }}>
                  • <Text style={{ fontWeight: '800' }}>Property Address:</Text> {boarding.location || 'Colombo, Sri Lanka'}
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20, marginBottom: 6 }}>
                  • <Text style={{ fontWeight: '800' }}>Monthly Fee:</Text> Rs. {parseInt(boarding.pricePerMonth || 15000).toLocaleString()} / month (per bed)
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20, marginBottom: 6 }}>
                  • <Text style={{ fontWeight: '800' }}>Key Money (Deposit):</Text> Rs. {parseInt(boarding.pricePerMonth || 15000).toLocaleString()} (1 Month Rent)
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20, marginBottom: 6 }}>
                  • <Text style={{ fontWeight: '800' }}>1st Month Move-In (Double Payment):</Text> <Text style={{ color: '#6D28D9', fontWeight: '800' }}>Rs. {(parseInt(boarding.pricePerMonth || 15000) * 2).toLocaleString()}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20, marginBottom: 6 }}>
                  • <Text style={{ fontWeight: '800' }}>Room & Bed Configuration:</Text> {boarding.bedsPerRoom || 'One Room per Bed (1 Bed/Room)'}
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 20 }}>
                  • <Text style={{ fontWeight: '800' }}>Move-Out Notice:</Text> 2 Months (60 days) written notice required.
                </Text>
              </View>

              {/* 🔑 Boarding Agreement & Key Money Rules Card */}
              <View style={{
                backgroundColor: '#FFFBEB',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#FCD34D',
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name="shield-check" size={18} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#92400E', textTransform: 'uppercase' }}>
                    Boarding Agreement & Key Money Rules
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>🔑 1st Month Double Payment (Key Money)</Text>
                    <Text style={{ fontSize: 11, color: '#78350F', marginTop: 1, lineHeight: 15 }}>
                      Upon move-in, the 1st month payment includes 1 month rent + 1 month Key Money security deposit (Double Payment: Rs. {(parseInt(boarding.pricePerMonth || 15000) * 2).toLocaleString()}).
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>📢 2-Month Move-Out Notice</Text>
                    <Text style={{ fontSize: 11, color: '#78350F', marginTop: 1, lineHeight: 15 }}>
                      You must inform the boarding owner at least 2 months in advance before vacating or leaving the boarding place.
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>🗓️ 1-Year Minimum Stay Requirement</Text>
                    <Text style={{ fontSize: 11, color: '#78350F', marginTop: 1, lineHeight: 15 }}>
                      Key money benefits and last-month rent coverage are valid only if you complete a minimum stay of 1 year (12 months).
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>💸 Last Month Rent Free (After 1 Year)</Text>
                    <Text style={{ fontSize: 11, color: '#78350F', marginTop: 1, lineHeight: 15 }}>
                      When completing a 1-year stay, no rental fee is required for the final month as it is covered by your initial key money deposit.
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>⚠️ Early Departure Policy (Under 1 Year)</Text>
                    <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 1, lineHeight: 15 }}>
                      If you leave the boarding place before completing 1 full year, the key money deposit cannot be refunded or credited.
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#6D28D9',
                  borderRadius: 12,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  try {
                    let contractUri = boarding.contractPdf;
                    const fileName = boarding.contractPdfName || `${boarding.boardingName || 'Boarding'}_Agreement.pdf`;

                    if (contractUri && contractUri.startsWith('data:application/pdf')) {
                      // Standard base64 PDF URI download
                      if (Platform.OS === 'web') {
                        const link = document.createElement('a');
                        link.href = contractUri;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        Alert.alert('Contract PDF Download', `Downloading ${fileName}...`);
                      }
                    } else {
                      // Generate a 100% valid PDF 1.4 binary stream using jsPDF generator
                      const pdfResult = generateRealContractPdf({
                        boardingName: boarding.boardingName,
                        location: boarding.location,
                        pricePerMonth: boarding.pricePerMonth,
                        bedsPerRoom: boarding.bedsPerRoom,
                        contactNumber: boarding.contactNumber,
                        rules: boarding.rules,
                        totalRooms: boarding.totalRooms,
                        totalBeds: boarding.totalBeds,
                      });

                      pdfResult.downloadPdf();
                    }
                  } catch (err) {
                    console.log('Download contract error:', err);
                    Alert.alert('Download Error', 'Could not download contract file.');
                  }
                }}
                activeOpacity={0.85}
              >
                <Feather name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>View / Download Contract PDF</Text>
              </TouchableOpacity>
            </View>

            {/* 📋 House Rules & Optional Rules Section */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={26} color="#6D28D9" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  House Rules & Regulations
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 14, fontWeight: '500' }}>
                Please review and follow all house rules set by the boarding owner:
              </Text>

              {boarding.rules ? (
                <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, color: '#1E293B', lineHeight: 22, fontWeight: '600' }}>
                    {boarding.rules}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {[
                    '• Quiet hours between 10:00 PM and 6:00 AM.',
                    '• Keep common areas, kitchen, and bathroom clean after use.',
                    '• No smoking or illegal substances on premises.',
                    '• Visitors allowed until 9:00 PM with prior owner notification.',
                    '• Switch off lights, fans, and AC when leaving rooms.',
                  ].map((ruleItem, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 }}>
                      <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>{ruleItem}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  
  // ── Cover Image Card ──────────────────────────────────────
  imageCard: {
    width: width,
    height: height * 0.36,
    position: 'relative',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Overlay header buttons
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // V10 Badge bottom right overlay
  badgeOverlay: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Content Body ──────────────────────────────────────────
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleLeft: {
    flex: 1.1,
    paddingRight: 6,
  },
  boardingName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 3,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  titleRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  priceBold: {
    fontSize: 17,
    fontWeight: '900',
    color: '#6D28D9',
  },
  priceSuffix: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Facilities Row ────────────────────────────────────────
  facilitiesSection: {
    marginBottom: 20,
    marginLeft: -20,
    marginRight: -20,
  },
  facilitiesScroll: {
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  facilityCard: {
    alignItems: 'center',
    marginRight: 14,
  },
  facilityIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  facilityIconBoxExtra: {
    backgroundColor: '#EEF2F6',
  },
  extraText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
  facilityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // ── Description Block ─────────────────────────────────────
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── Bottom Fixed Bar ──────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  saveBtn: {
    flex: 0.35,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#6D28D9',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  saveBtnText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '800',
  },
  bookBtn: {
    flex: 0.65,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
