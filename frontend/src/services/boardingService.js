import { API_URLS, API_URLS_DEV } from './apiConfig';

const BACKEND_URLS = [API_URLS.boardings, API_URLS_DEV.boardings];

/**
 * Sends boarding data to the Node/Express/MongoDB backend database.
 * If the server is offline or network fails (or returns an error), it falls back to the local in-memory store.
 */
export async function addBoardingApi(boardingData, token) {
  // Sanitize numeric and option fields to prevent CastErrors on backend
  const totalRooms = boardingData.totalRooms && String(boardingData.totalRooms).trim() !== '' ? Number(boardingData.totalRooms) : undefined;
  const totalBeds = boardingData.totalBeds && String(boardingData.totalBeds).trim() !== '' ? Number(boardingData.totalBeds) : 0;
  const availableRooms = boardingData.availableRooms && String(boardingData.availableRooms).trim() !== '' ? Number(boardingData.availableRooms) : (totalRooms || 0);
  const availableBeds = boardingData.availableBeds && String(boardingData.availableBeds).trim() !== '' ? Number(boardingData.availableBeds) : (totalBeds || 0);

  const sanitizedData = {
    ...boardingData,
    totalRooms,
    totalBeds,
    availableRooms,
    availableBeds,
    bedsPerRoom: boardingData.bedsPerRoom || 'One Room per Bed (1 Bed/Room)',
    pricePerMonth: boardingData.pricePerMonth && String(boardingData.pricePerMonth).trim() !== '' ? Number(boardingData.pricePerMonth) : undefined,
    contractPdf: boardingData.contractPdf || '',
    contractPdfName: boardingData.contractPdfName || '',
    rules: boardingData.rules || '',
  };

  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to add boarding on: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sanitizedData),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, boarding: data.boarding, source: 'database' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.message || 'Could not save this boarding place.' };
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for adding boarding:`, error.message);
    }
  }

  return { success: false, message: 'Could not reach the boarding service. Please try again.' };
}

/**
 * Fetches all boardings for a specific owner from the Node/Express/MongoDB backend database.
 * If the server is offline or network fails, it falls back to the local in-memory store.
 */
export async function getBoardingsApi(ownerIdentifier, token) {
  const normalizedOwner = (ownerIdentifier || '').toLowerCase();
  
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to fetch boardings from: ${url}?owner=${encodeURIComponent(normalizedOwner)}`);
      const response = await fetch(`${url}?owner=${encodeURIComponent(normalizedOwner)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, boardings: data.boardings, source: 'database' };
      } else {
        console.log(`Server returned not ok status for get boardings: ${response.status}`);
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for fetching boardings:`, error.message);
    }
  }

  return { success: false, boardings: [], message: 'Could not reach the boarding service.' };
}

/**
 * Deletes a boarding listing from the Node/Express/MongoDB backend database.
 * If the server is offline or network fails, it falls back to removing it from the local in-memory store.
 */
export async function deleteBoardingApi(id, token, ownerEmail) {
  for (const url of BACKEND_URLS) {
    try {
      const deleteUrl = `${url}/${id}`;
      console.log(`Attempting to delete boarding on: ${deleteUrl}`);
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        return { success: true, source: 'database' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log(`Server returned not ok status for delete boarding: ${response.status}`, errorData);
        return { success: false, message: errorData.message || 'Failed to delete boarding' };
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for deleting boarding:`, error.message);
    }
  }

  return { success: false, message: 'Could not reach the boarding service.' };
}

/**
 * Updates a boarding listing in the Node/Express/MongoDB backend database.
 * If the server is offline or network fails, it falls back to updating the local in-memory store.
 */
export async function updateBoardingApi(id, boardingData, token) {
  // Sanitize numeric and option fields to prevent CastErrors on backend
  const totalRooms = boardingData.totalRooms && String(boardingData.totalRooms).trim() !== '' ? Number(boardingData.totalRooms) : undefined;
  const totalBeds = boardingData.totalBeds && String(boardingData.totalBeds).trim() !== '' ? Number(boardingData.totalBeds) : 0;
  const availableRooms = boardingData.availableRooms && String(boardingData.availableRooms).trim() !== '' ? Number(boardingData.availableRooms) : (totalRooms || 0);
  const availableBeds = boardingData.availableBeds && String(boardingData.availableBeds).trim() !== '' ? Number(boardingData.availableBeds) : (totalBeds || 0);

  const sanitizedData = {
    ...boardingData,
    totalRooms,
    totalBeds,
    availableRooms,
    availableBeds,
    bedsPerRoom: boardingData.bedsPerRoom || 'One Room per Bed (1 Bed/Room)',
    pricePerMonth: boardingData.pricePerMonth && String(boardingData.pricePerMonth).trim() !== '' ? Number(boardingData.pricePerMonth) : undefined,
    contractPdf: boardingData.contractPdf || '',
    contractPdfName: boardingData.contractPdfName || '',
    rules: boardingData.rules || '',
  };

  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to update boarding on: ${url}/${id}`);
      const response = await fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sanitizedData),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, boarding: data.boarding, source: 'database' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log(`Server error on PUT:`, errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for updating boarding:`, error.message);
    }
  }

  return { success: false, message: 'Could not reach the boarding service.' };
}

/**
 * Fetches boarding places by their exact name.
 */
export async function getBoardingByNameApi(name, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to fetch boarding by name on: ${url}/name/${encodeURIComponent(name)}`);
      const response = await fetch(`${url}/name/${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, boardings: data.boardings, source: 'database' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log(`Server error fetching by name on ${url}:`, errorData.message || 'Unknown server error');
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for fetching by name:`, error.message);
    }
  }

  return { success: false, boardings: [], message: 'Could not reach the boarding service.' };
}
