import { API_URLS, API_URLS_DEV } from './apiConfig';

const BACKEND_URLS = [API_URLS.bookings, API_URLS_DEV.bookings];

/**
 * Creates a booking request for a student
 */
export async function createBookingApi(bookingData, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`[createBookingApi] POST ${url} boardingId=${bookingData.boardingId}`);
      const payload = { ...bookingData };
      delete payload.studentEmail;
      delete payload.studentName;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`[createBookingApi] Success booking._id=${data.booking?._id}`);
        return { success: true, booking: data.booking, source: 'database' };
      } else {
        console.log(`[createBookingApi] Server error ${response.status}:`, data.message);
        return { success: false, message: data.message || 'Booking failed on server' };
      }
    } catch (error) {
      console.log(`[createBookingApi] Network error at ${url}:`, error.message);
    }
  }
  return { success: false, message: 'Could not reach server. Check your network.' };
}

/**
 * Retrieves bookings for student or owner
 */
export async function getBookingsApi(token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`[getBookingsApi] GET ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`[getBookingsApi] Got ${data.bookings?.length} bookings`);
        return { success: true, bookings: data.bookings || [], source: 'database' };
      } else {
        console.log(`[getBookingsApi] Server error ${response.status}:`, data.message);
        return { success: false, bookings: [], message: data.message };
      }
    } catch (error) {
      console.log(`[getBookingsApi] Network error at ${url}:`, error.message);
    }
  }
  return { success: false, bookings: [], message: 'Could not reach server' };
}

/**
 * Updates booking status (confirm/reject) by owner
 */
export async function updateBookingStatusApi(bookingId, status, token, ownerBankDetails, extraPayload = {}) {
  let lastError = 'Could not connect to the booking service. Please try again.';
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to update booking status on: ${url}/${bookingId}/status`);
      const response = await fetch(`${url}/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status, ownerBankDetails, ...extraPayload }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, booking: data.booking, source: 'database' };
      } else {
        const data = await response.json().catch(() => ({}));
        lastError = data.message || `Booking update failed (${response.status}).`;
        console.log(`Server returned not ok status for update status: ${response.status}`);
      }
    } catch (error) {
      lastError = 'Could not connect to the booking service. Please try again.';
      console.log(`Backend server at ${url} not available for updating status:`, error.message);
    }
  }

  return { success: false, message: lastError };
}

/**
 * Updates booking details (resend request) by student
 */
export async function updateBookingApi(bookingId, updatedData, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`[updateBookingApi] PUT ${url}/${bookingId}`);
      const payload = { ...updatedData };
      delete payload.studentEmail;
      delete payload.studentName;
      const response = await fetch(`${url}/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, booking: data.booking, source: 'database' };
      } else {
        console.log(`[updateBookingApi] Server error ${response.status}:`, data.message);
        return { success: false, message: data.message || 'Update failed' };
      }
    } catch (error) {
      console.log(`[updateBookingApi] Network error at ${url}:`, error.message);
    }
  }
  return { success: false, message: 'Could not reach server' };
}

/**
 * Submits signed agreement and initial payment with slip by student
 */
export async function submitAgreementAndPaymentApi(bookingId, paymentData, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`[submitAgreementAndPaymentApi] PUT ${url}/${bookingId}/submit-payment`);
      const response = await fetch(`${url}/${bookingId}/submit-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, booking: data.booking };
      } else {
        console.log(`[submitAgreementAndPaymentApi] Server error ${response.status}:`, data.message);
        return { success: false, message: data.message || 'Payment submission failed' };
      }
    } catch (error) {
      console.log(`[submitAgreementAndPaymentApi] Error at ${url}:`, error.message);
    }
  }
  return { success: false, message: 'Could not reach server' };
}

/**
 * Confirms client payment by owner
 */
export async function confirmClientPaymentApi(bookingId, monthNumber, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`[confirmClientPaymentApi] PUT ${url}/${bookingId}/confirm-payment month=${monthNumber}`);
      const response = await fetch(`${url}/${bookingId}/confirm-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ monthNumber }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, booking: data.booking };
      } else {
        console.log(`[confirmClientPaymentApi] Server error ${response.status}:`, data.message);
        return { success: false, message: data.message || 'Payment confirmation failed' };
      }
    } catch (error) {
      console.log(`[confirmClientPaymentApi] Error at ${url}:`, error.message);
    }
  }
  return { success: false, message: 'Could not reach server' };
}

/**
 * Submits next month continuous payment by client
 */
export async function submitMonthlyPaymentApi(bookingId, paymentData, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`[submitMonthlyPaymentApi] PUT ${url}/${bookingId}/pay-monthly`);
      const response = await fetch(`${url}/${bookingId}/pay-monthly`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, booking: data.booking };
      } else {
        console.log(`[submitMonthlyPaymentApi] Server error ${response.status}:`, data.message);
        return { success: false, message: data.message || 'Monthly payment failed' };
      }
    } catch (error) {
      console.log(`[submitMonthlyPaymentApi] Error at ${url}:`, error.message);
    }
  }
  return { success: false, message: 'Could not reach server' };
}

