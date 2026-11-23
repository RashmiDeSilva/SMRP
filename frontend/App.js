import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import OwnerDashboardScreen from './src/screens/OwnerDashboardScreen';
import AddBoardingScreen from './src/screens/AddBoardingScreen';
import StudentDashboardScreen from './src/screens/StudentDashboardScreen';
import InternDashboardScreen from './src/screens/InternDashboardScreen';
import EmployeeDashboardScreen from './src/screens/EmployeeDashboardScreen';
import BoardingDetailsScreen from './src/screens/BoardingDetailsScreen';
import BookingFormScreen from './src/screens/BookingFormScreen';
import { loginApi, toggleSavedBoardingApi, getSavedBoardingsApi } from './src/services/authService';
import { addBoardingApi, getBoardingsApi, deleteBoardingApi, updateBoardingApi } from './src/services/boardingService';
import { getAllBoardingsApi } from './src/services/studentService';
import {
  createBookingApi,
  getBookingsApi,
  updateBookingStatusApi,
  confirmClientPaymentApi,
  submitAgreementAndPaymentApi,
  submitMonthlyPaymentApi,
} from './src/services/bookingService';
import { saveUserSession, getUserSession, clearUserSession, getAppSettings } from './src/utils/sessionStorage';


export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}


function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [currentUser, setCurrentUser] = useState(null);
  const [boardings, setBoardings] = useState([]);
  const [allBoardings, setAllBoardings] = useState([]);
  const [editingBoarding, setEditingBoarding] = useState(null);
  const [selectedBoarding, setSelectedBoarding] = useState(null);
  const [savedBoardingIds, setSavedBoardingIds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [studentActiveFilter, setStudentActiveFilter] = useState('all');

  useEffect(() => {
    getAppSettings();
  }, []);

  const toggleSaveBoarding = async (id) => {
    const token = currentUser ? currentUser.token : null;
    if (!token) return;
    
    // Optimistic UI toggle updates
    setSavedBoardingIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });

    const result = await toggleSavedBoardingApi(id, token);
    if (result.success) {
      const normalized = (result.savedBoardingIds || []).map((oid) =>
        typeof oid === 'object' ? oid.toString() : oid
      );
      setSavedBoardingIds(normalized);
    } else {
      setSavedBoardingIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    }
  };

  // Fetch boardings, bookings, and saved items when current user changes
  useEffect(() => {
    if (currentUser && currentUser.email) {
      if (currentUser.role === 'Boarding Owner') {
        loadOwnerBoardings();
        loadBookings();
      } else {
        loadAllBoardings();
        loadBookings();
        loadSavedBoardings();
      }
    }
  }, [currentUser]);

  const loadSavedBoardings = async () => {
    const token = currentUser ? currentUser.token : null;
    if (!token) return;
    const result = await getSavedBoardingsApi(token);
    if (result.success) {
      // Normalize ObjectId objects to plain strings so .includes() works
      const normalized = (result.savedBoardingIds || []).map((id) =>
        typeof id === 'object' ? id.toString() : id
      );
      setSavedBoardingIds(normalized);
    } else {
      console.log('Failed to fetch saved boardings');
    }
  };

  const loadBookings = async () => {
    const email = currentUser ? currentUser.email : '';
    if (!email) return;
    console.log('Loading bookings for the signed-in user.');
    const token = currentUser ? currentUser.token : null;
    const result = await getBookingsApi(token);
    if (result.success) {
      setBookings(result.bookings);
    } else {
      console.log('Failed to fetch bookings:', result.message);
    }
  };

  const loadOwnerBoardings = async () => {
    const ownerId = currentUser ? currentUser._id : '';
    if (!ownerId) return;
    console.log('Loading boardings for the signed-in owner.');
    const token = currentUser ? currentUser.token : null;
    const result = await getBoardingsApi(ownerId, token);
    if (result.success) {
      setBoardings(result.boardings);
    } else {
      console.log('Failed to fetch owner boardings:', result.message);
    }
  };

  const loadAllBoardings = async () => {
    console.log('Loading all boardings for student...');
    const token = currentUser ? currentUser.token : null;
    const result = await getAllBoardingsApi(token);
    if (result.success) {
      setAllBoardings(result.boardings);
    } else {
      console.log('Failed to fetch all boardings:', result.message);
    }
  };

  const navigateToRoleDashboard = (user) => {
    if (user?.role === 'Boarding Owner') {
      setCurrentScreen('owner_dashboard');
    } else if (user?.role === 'Intern') {
      setCurrentScreen('intern_dashboard');
    } else if (user?.role === 'Employee') {
      setCurrentScreen('employee_dashboard');
    } else {
      setCurrentScreen('student_dashboard');
    }
  };

  if (currentScreen === 'splash') {
    return (
      <SplashScreen
        onFinishLoading={() => {
          const savedUser = getUserSession();
          if (savedUser && savedUser.email) {
            setCurrentUser(savedUser);
            if (savedUser.savedBoardingIds) {
              setSavedBoardingIds(
                savedUser.savedBoardingIds.map((id) =>
                  typeof id === 'object' ? id.toString() : id
                )
              );
            }
            navigateToRoleDashboard(savedUser);
          } else {
            setCurrentScreen('login');
          }
        }}
      />
    );
  }


  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onSignIn={async (email, password) => {
          const result = await loginApi(email, password);

          if (result.success) {
            alert('Logged in successfully!');
            const user = { ...result.user, token: result.token };
            setCurrentUser(user);
            saveUserSession(user);

            // Seed saved boardings from login response immediately
            if (result.user?.savedBoardingIds) {
              setSavedBoardingIds(
                result.user.savedBoardingIds.map((id) =>
                  typeof id === 'object' ? id.toString() : id
                )
              );
            }

            // Role-based navigation
            navigateToRoleDashboard(user);

          } else {
            alert(`Login failed: ${result.message}`);
          }
        }}

        onGoToSignUp={() => setCurrentScreen('signup')}
      />
    );
  }


  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        onBack={() => setCurrentScreen('login')}

        onSignUpSuccess={(userData) => {
          setCurrentScreen('login');
        }}
      />
    );
  }


  if (currentScreen === 'student_dashboard') {
    return (
      <StudentDashboardScreen
        currentUser={currentUser}
        boardings={allBoardings}
        onLogout={() => {
          clearUserSession();
          setCurrentUser(null);
          setAllBoardings([]);
          setBookings([]);
          setCurrentScreen('login');
        }}
        onViewBoarding={(boarding) => {
          setSelectedBoarding(boarding);
          setCurrentScreen('boarding_details');
        }}
        savedBoardingIds={savedBoardingIds}
        onToggleSave={toggleSaveBoarding}
        bookings={bookings}
        activeFilter={studentActiveFilter}
        setActiveFilter={setStudentActiveFilter}
        onReloadBookings={loadBookings}
        onSubmitAgreementAndPayment={async (bookingId, paymentData) => {
          const token = currentUser ? currentUser.token : null;
          const result = await submitAgreementAndPaymentApi(bookingId, paymentData, token);
          if (result.success) {
            alert('🎉 Agreement Signed & Payment Receipt Sent to Owner!\n\nThe owner has been notified to verify your payment and finalize your check-in.');
            await loadBookings();
            return { success: true };
          } else {
            alert(result.message || 'Payment submission failed.');
            return { success: false, message: result.message };
          }
        }}
        onSubmitMonthlyPayment={async (bookingId, paymentData) => {
          const token = currentUser ? currentUser.token : null;
          const result = await submitMonthlyPaymentApi(bookingId, paymentData, token);
          if (result.success) {
            alert(`✅ Payment for Month ${paymentData.monthNumber} Submitted!\n\nThe owner will verify your receipt.`);
            await loadBookings();
            return { success: true };
          } else {
            alert(result.message || 'Monthly payment submission failed.');
            return { success: false, message: result.message };
          }
        }}
        onCancelBooking={async (bookingId, reason = 'Cancelled by client') => {
          const token = currentUser ? currentUser.token : null;
          const result = await updateBookingStatusApi(bookingId, 'cancelled', token, null, {
            cancellationReason: reason,
          });
          if (result.success) {
            alert('🚫 Reservation cancelled. The owner can see it in Rejected bookings.');
            await loadBookings();
            await loadAllBoardings();
            return { success: true };
          } else {
            alert(result.message || 'Could not cancel booking.');
            return { success: false };
          }
        }}
      />
    );
  }

  if (currentScreen === 'intern_dashboard') {
    return (
      <InternDashboardScreen
        currentUser={currentUser}
        boardings={allBoardings}
        onLogout={() => {
          clearUserSession();
          setCurrentUser(null);
          setAllBoardings([]);
          setBookings([]);
          setCurrentScreen('login');
        }}
        onViewBoarding={(boarding) => {
          setSelectedBoarding(boarding);
          setCurrentScreen('boarding_details');
        }}
        savedBoardingIds={savedBoardingIds}
        onToggleSave={toggleSaveBoarding}
        bookings={bookings}
        activeFilter={studentActiveFilter}
        setActiveFilter={setStudentActiveFilter}
        onReloadBookings={loadBookings}
        onSubmitAgreementAndPayment={async (bookingId, paymentData) => {
          const token = currentUser ? currentUser.token : null;
          const result = await submitAgreementAndPaymentApi(bookingId, paymentData, token);
          if (result.success) {
            alert('🎉 Agreement Signed & Payment Receipt Sent to Owner!\n\nThe owner will verify and confirm your stay.');
            await loadBookings();
            return { success: true };
          } else {
            alert(result.message || 'Payment submission failed.');
            return { success: false, message: result.message };
          }
        }}
        onSubmitMonthlyPayment={async (bookingId, paymentData) => {
          const token = currentUser ? currentUser.token : null;
          const result = await submitMonthlyPaymentApi(bookingId, paymentData, token);
          if (result.success) {
            alert(`✅ Payment for Month ${paymentData.monthNumber} Submitted!`);
            await loadBookings();
            return { success: true };
          } else {
            alert(result.message || 'Monthly payment submission failed.');
            return { success: false, message: result.message };
          }
        }}
        onCancelBooking={async (bookingId, reason = 'Cancelled by client') => {
          const token = currentUser ? currentUser.token : null;
          const result = await updateBookingStatusApi(bookingId, 'cancelled', token, null, {
            cancellationReason: reason,
          });
          if (result.success) {
            alert('🚫 Reservation cancelled. The owner can see it in Rejected bookings.');
            await loadBookings();
            await loadAllBoardings();
            return { success: true };
          } else {
            alert(result.message || 'Could not cancel booking.');
            return { success: false };
          }
        }}
      />
    );
  }

  if (currentScreen === 'employee_dashboard') {
    return (
      <EmployeeDashboardScreen
        currentUser={currentUser}
        boardings={allBoardings}
        onLogout={() => {
          clearUserSession();
          setCurrentUser(null);
          setAllBoardings([]);
          setBookings([]);
          setCurrentScreen('login');
        }}
        onViewBoarding={(boarding) => {
          setSelectedBoarding(boarding);
          setCurrentScreen('boarding_details');
        }}
        savedBoardingIds={savedBoardingIds}
        onToggleSave={toggleSaveBoarding}
        bookings={bookings}
        activeFilter={studentActiveFilter}
        setActiveFilter={setStudentActiveFilter}
        onReloadBookings={loadBookings}
        onSubmitAgreementAndPayment={async (bookingId, paymentData) => {
          const token = currentUser ? currentUser.token : null;
          const result = await submitAgreementAndPaymentApi(bookingId, paymentData, token);
          if (result.success) {
            alert('🎉 Agreement Signed & Payment Receipt Sent to Owner!\n\nThe owner will verify and confirm your stay.');
            await loadBookings();
            return { success: true };
          } else {
            alert(result.message || 'Payment submission failed.');
            return { success: false, message: result.message };
          }
        }}
        onSubmitMonthlyPayment={async (bookingId, paymentData) => {
          const token = currentUser ? currentUser.token : null;
          const result = await submitMonthlyPaymentApi(bookingId, paymentData, token);
          if (result.success) {
            alert(`✅ Payment for Month ${paymentData.monthNumber} Submitted!`);
            await loadBookings();
            return { success: true };
          } else {
            alert(result.message || 'Monthly payment submission failed.');
            return { success: false, message: result.message };
          }
        }}
        onCancelBooking={async (bookingId, reason = 'Cancelled by client') => {
          const token = currentUser ? currentUser.token : null;
          const result = await updateBookingStatusApi(bookingId, 'cancelled', token, null, {
            cancellationReason: reason,
          });
          if (result.success) {
            alert('🚫 Reservation cancelled. The owner can see it in Rejected bookings.');
            await loadBookings();
            await loadAllBoardings();
            return { success: true };
          } else {
            alert(result.message || 'Could not cancel booking.');
            return { success: false };
          }
        }}
      />
    );
  }

  if (currentScreen === 'boarding_details') {
    return (
      <BoardingDetailsScreen
        boarding={selectedBoarding}
        onBack={() => {
          setSelectedBoarding(null);
          if (currentUser?.role === 'Employee') {
            setCurrentScreen('employee_dashboard');
          } else if (currentUser?.role === 'Intern') {
            setCurrentScreen('intern_dashboard');
          } else if (currentUser?.role === 'Boarding Owner') {
            setCurrentScreen('owner_dashboard');
          } else {
            setCurrentScreen('student_dashboard');
          }
        }}
        isSaved={selectedBoarding ? savedBoardingIds.includes(selectedBoarding._id) : false}
        onToggleSave={toggleSaveBoarding}
        onBook={() => {
          setCurrentScreen('booking_form');
        }}
      />
    );
  }

  if (currentScreen === 'booking_form') {
    return (
      <BookingFormScreen
        boarding={selectedBoarding}
        currentUser={currentUser}
        onBack={() => {
          setCurrentScreen('boarding_details');
        }}
        onSubmitBooking={async (bookingData) => {
          const token = currentUser ? currentUser.token : null;
          const email = currentUser ? currentUser.email : null;
          console.log(`[App.js onSubmitBooking] boardingId=${bookingData.boardingId} email=${email}`);
          
          const result = await createBookingApi(bookingData, token);
          console.log('[App.js onSubmitBooking] result:', JSON.stringify(result));
          
          if (result.success) {
            alert('🎉 Booking Request Submitted! The boarding owner has been notified.');
            await loadBookings();
            setStudentActiveFilter('bookings');
            setSelectedBoarding(null);
            
            if (currentUser?.role === 'Employee') {
              setCurrentScreen('employee_dashboard');
            } else if (currentUser?.role === 'Intern') {
              setCurrentScreen('intern_dashboard');
            } else if (currentUser?.role === 'Boarding Owner') {
              setCurrentScreen('owner_dashboard');
            } else {
              setCurrentScreen('student_dashboard');
            }
          } else {
            alert(`Booking submission failed: ${result.message || 'Unknown error'}`);
          }
        }}
      />
    );
  }

  if (currentScreen === 'owner_dashboard') {
    return (
      <OwnerDashboardScreen
        currentUser={currentUser}
        boardings={boardings}
        onLogout={() => {
          clearUserSession();
          setCurrentUser(null);
          setBoardings([]);
          setBookings([]);
          setCurrentScreen('login');
        }}
        onAddBoarding={() => {
          setEditingBoarding(null);
          setCurrentScreen('add_boarding');
        }}
        onDeleteBoarding={async (id) => {
          const token = currentUser ? currentUser.token : null;
          const ownerEmail = currentUser ? currentUser.email : '';
          const result = await deleteBoardingApi(id, token, ownerEmail);
          if (result.success) {
            alert('Boarding place deleted successfully!');
            await loadOwnerBoardings();
            await loadAllBoardings();
          } else {
            alert(result.message || 'Failed to delete boarding place.');
          }
        }}
        onEditBoarding={(boarding) => {
          setEditingBoarding(boarding);
          setCurrentScreen('add_boarding');
        }}
        bookings={bookings}
        onConfirmBooking={async (bookingId, ownerBankDetails) => {
          const token = currentUser ? currentUser.token : null;
          const result = await updateBookingStatusApi(bookingId, 'confirmed', token, ownerBankDetails);
          if (result.success) {
            alert('✅ Booking request confirmed!\n\nYour bank account details have been securely sent to the tenant for the move-in payment transfer.');
            await loadBookings();
            await loadOwnerBoardings();
            await loadAllBoardings();
          } else {
            alert('Failed to confirm booking.');
          }
        }}
        onRejectBooking={async (bookingId) => {
          const token = currentUser ? currentUser.token : null;
          const result = await updateBookingStatusApi(bookingId, 'rejected', token);
          if (result.success) {
            alert('Booking request declined.');
            await loadBookings();
            await loadOwnerBoardings();
            await loadAllBoardings();
          } else {
            alert('Failed to decline booking.');
          }
        }}
        onConfirmClientPayment={async (bookingId, monthNumber) => {
          const token = currentUser ? currentUser.token : null;
          const result = await confirmClientPaymentApi(bookingId, monthNumber, token);
          if (result.success) {
            alert(`✅ Payment for Month ${monthNumber} Confirmed!\n\nThe client's payment record has been marked as confirmed and next month cycle is now active.`);
            await loadBookings();
            await loadOwnerBoardings();
          } else {
            alert(result.message || 'Failed to confirm client payment.');
          }
        }}
      />
    );
  }


  if (currentScreen === 'add_boarding') {
    return (
      <AddBoardingScreen
        initialData={editingBoarding}
        onBack={() => {
          setEditingBoarding(null);
          setCurrentScreen('owner_dashboard');
        }}
        onSubmit={async (data) => {
          console.log('Boarding submission:', data);
          const ownerEmail = currentUser ? currentUser.email : 'unknown_owner';
          const boardingDataWithOwner = {
            ...data,
            owner: ownerEmail,
          };

          let result;
          const token = currentUser ? currentUser.token : null;
          if (editingBoarding) {
            console.log('Updating boarding with ID:', editingBoarding._id);
            result = await updateBoardingApi(editingBoarding._id, boardingDataWithOwner, token);
          } else {
            console.log('Adding new boarding');
            result = await addBoardingApi(boardingDataWithOwner, token);
          }

          if (result.success) {
            const isEdit = !!editingBoarding;
            const updatedItem = result.boarding;

            if (updatedItem) {
              setBoardings((prev) => {
                const exists = prev.some((b) => b._id === updatedItem._id);
                if (exists) {
                  return prev.map((b) => (b._id === updatedItem._id ? updatedItem : b));
                } else {
                  return [updatedItem, ...prev];
                }
              });
              setAllBoardings((prev) => {
                const exists = prev.some((b) => b._id === updatedItem._id);
                if (exists) {
                  return prev.map((b) => (b._id === updatedItem._id ? updatedItem : b));
                } else {
                  return [updatedItem, ...prev];
                }
              });
            }

            // Instantly transition back to dashboard & clear edit state
            setCurrentScreen('owner_dashboard');
            setEditingBoarding(null);

            // Reload from backend to keep database sync 100% accurate
            await loadOwnerBoardings();
            await loadAllBoardings();

            // Notify user
            const msg = isEdit 
              ? 'Boarding place updated successfully!' 
              : 'New boarding place added successfully!';
            setTimeout(() => alert(msg), 50);
          } else {
            alert(`Failed to save boarding: ${result.message}`);
          }
        }}
      />
    );
  }


  return (
    <HomeScreen
      onReset={() => setCurrentScreen('splash')}
    />
  );
}
