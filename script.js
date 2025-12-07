// FlyingHigh Dashboard - JavaScript
// API Configuration
const API_CONFIG = {
    // AviationStack API - Free tier allows 100 requests/month
    // Get your free API key from: https://aviationstack.com/
    baseURL: 'https://api.aviationstack.com/v1',
    // IMPORTANT: Replace with your own API key
    apiKey: '69b7d564fbcb1083f35974671126c602',
    
    // Fallback: OpenSky Network (no API key required, but limited data)
    openskyURL: 'https://opensky-network.org/api'
};

// Application State
const appState = {
    currentAirport: null,
    currentFlights: [],
    filteredFlights: [],
    favorites: [],
    currentFilter: 'all',
    flightType: 'arrivals' // 'arrivals' or 'departures'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load favorites from localStorage
    loadFavorites();
    
    // Event Listeners
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('airportSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    document.getElementById('airportSelect').addEventListener('change', function(e) {
        if (e.target.value) {
            searchAirport(e.target.value);
        }
    });
    
    // Flight type toggle
    document.querySelectorAll('input[name="flightType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            appState.flightType = this.value;
            displayFlights();
        });
    });
    
    // Filter buttons
    document.getElementById('filterAll').addEventListener('click', () => setFilter('all'));
    document.getElementById('filterOnTime').addEventListener('click', () => setFilter('on-time'));
    document.getElementById('filterDelayed').addEventListener('click', () => setFilter('delayed'));
    document.getElementById('filterCancelled').addEventListener('click', () => setFilter('cancelled'));
    
    // Favorite buttons
    document.getElementById('addFavoriteBtn').addEventListener('click', addToFavorites);
    document.getElementById('removeFavoriteBtn').addEventListener('click', removeFromFavorites);
    
    // Navigation
    document.querySelector('a[href="#favorites"]').addEventListener('click', function(e) {
        e.preventDefault();
        showFavorites();
    });
    
    document.querySelector('a[href="#dashboard"]').addEventListener('click', function(e) {
        e.preventDefault();
        showDashboard();
    });
}

// Search Handler
function handleSearch() {
    const airportCode = document.getElementById('airportSearch').value.trim().toUpperCase();
    
    if (!airportCode) {
        showError('Please enter an airport code');
        return;
    }
    
    if (airportCode.length !== 3) {
        showError('Airport code must be 3 letters (e.g., JFK, LAX)');
        return;
    }
    
    searchAirport(airportCode);
}

// Search Airport
async function searchAirport(airportCode) {
    showLoading(true);
    hideError();
    hideSections();
    
    try {
        // Fetch airport information and flights
        const [airportData, flightsData] = await Promise.all([
            fetchAirportInfo(airportCode),
            fetchFlights(airportCode)
        ]);
        
        if (airportData) {
            displayAirportStatus(airportData);
            appState.currentAirport = airportData;
            updateFavoriteButtons();
        }
        
        if (flightsData && flightsData.length > 0) {
            appState.currentFlights = flightsData;
            displayFlights();
        } else {
            showNoFlights();
        }
        
    } catch (error) {
        console.error('Error fetching data:', error);
        
        // Provide more specific error messages
        let errorMsg = error.message;
        if (error.message.includes('401')) {
            errorMsg = `401 Unauthorized: Your API key appears to be invalid or expired. 
            Please verify:
            1. Your API key is correct in script.js (line 8)
            2. Your AviationStack account is active
            3. You haven't exceeded your monthly request limit
            4. Visit https://aviationstack.com/ to check your account status`;
        }
        
        showError(errorMsg);
    } finally {
        showLoading(false);
    }
}

// Fetch Airport Information
async function fetchAirportInfo(airportCode) {
    try {
        const url = `${API_CONFIG.baseURL}/airports?access_key=${API_CONFIG.apiKey}&iata_code=${airportCode}`;
        const response = await fetch(url);
        
        // Check HTTP status first
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // If JSON parsing fails, use status code
                errorData = null;
            }
            
            if (response.status === 401) {
                const apiErrorMsg = errorData?.error?.info || '';
                throw new Error(`401 Unauthorized: ${apiErrorMsg || 'Invalid API key. Please check your API key in script.js'}`);
            } else if (response.status === 403) {
                const apiErrorMsg = errorData?.error?.info || '';
                throw new Error(`403 Forbidden: ${apiErrorMsg || 'API key may be invalid or subscription expired'}`);
            } else if (response.status === 429) {
                throw new Error('429 Too Many Requests: API rate limit exceeded. Please try again later');
            } else {
                const apiErrorMsg = errorData?.error?.info || '';
                throw new Error(apiErrorMsg || `HTTP error! status: ${response.status}`);
            }
        }
        
        const data = await response.json();
        
        // Check for API errors in response
        if (data.error) {
            const errorMessage = data.error.info || data.error.message || 'Unknown API error';
            throw new Error(errorMessage);
        }
        
        if (data.data && data.data.length > 0) {
            return data.data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching airport info:', error);
        throw error;
    }
}

// Fetch Flights (Arrivals and Departures)
async function fetchFlights(airportCode) {
    try {
        const url = `${API_CONFIG.baseURL}/flights?access_key=${API_CONFIG.apiKey}&dep_iata=${airportCode}&limit=50`;
        const response = await fetch(url);
        
        // Check HTTP status first
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = null;
            }
            
            if (response.status === 401) {
                const apiErrorMsg = errorData?.error?.info || '';
                throw new Error(`401 Unauthorized: ${apiErrorMsg || 'Invalid API key. Please check your API key in script.js'}`);
            } else if (response.status === 403) {
                const apiErrorMsg = errorData?.error?.info || '';
                throw new Error(`403 Forbidden: ${apiErrorMsg || 'API key may be invalid or subscription expired'}`);
            } else if (response.status === 429) {
                throw new Error('429 Too Many Requests: API rate limit exceeded. Please try again later');
            } else {
                const apiErrorMsg = errorData?.error?.info || '';
                throw new Error(apiErrorMsg || `HTTP error! status: ${response.status}`);
            }
        }
        
        const data = await response.json();
        
        // Check for API errors in response
        if (data.error) {
            const errorMessage = data.error.info || data.error.message || 'Unknown API error';
            throw new Error(errorMessage);
        }
        
        const flights = data.data || [];
        
        // Also fetch arrivals
        const arrivalsUrl = `${API_CONFIG.baseURL}/flights?access_key=${API_CONFIG.apiKey}&arr_iata=${airportCode}&limit=50`;
        const arrivalsResponse = await fetch(arrivalsUrl);
        
        if (arrivalsResponse.ok) {
            const arrivalsData = await arrivalsResponse.json();
            // Check for errors in arrivals response too
            if (arrivalsData.error) {
                console.warn('Error fetching arrivals:', arrivalsData.error.info);
            } else if (arrivalsData.data) {
                flights.push(...arrivalsData.data);
            }
        } else {
            // Log but don't fail if arrivals fail
            try {
                const arrivalsErrorData = await arrivalsResponse.json();
                if (arrivalsErrorData.error) {
                    console.warn('Error fetching arrivals:', arrivalsErrorData.error.info);
                }
            } catch (e) {
                console.warn('Error parsing arrivals error response');
            }
        }
        
        return flights;
    } catch (error) {
        console.error('Error fetching flights:', error);
        throw error;
    }
}

// Display Airport Status
function displayAirportStatus(airport) {
    document.getElementById('airportName').textContent = airport.airport_name || 'Unknown';
    document.getElementById('airportCode').textContent = airport.iata_code || 'N/A';
    document.getElementById('airportLocation').textContent = 
        `${airport.city_name || 'Unknown'}, ${airport.country_name || 'Unknown'}`;
    document.getElementById('airportTimezone').textContent = airport.timezone || 'N/A';
    
    // Set status badge
    const statusBadge = document.getElementById('airportStatusBadge');
    statusBadge.textContent = 'Operational';
    statusBadge.className = 'badge bg-success';
    
    document.getElementById('airportStatusSection').style.display = 'block';
    document.getElementById('flightFilters').style.display = 'block';
}

// Display Flights
function displayFlights() {
    const tableBody = document.getElementById('flightsTableBody');
    tableBody.innerHTML = '';
    
    // Filter flights by type (arrivals/departures)
    let flights = appState.currentFlights.filter(flight => {
        if (appState.flightType === 'arrivals') {
            return flight.arrival && flight.arrival.iata === appState.currentAirport?.iata_code;
        } else {
            return flight.departure && flight.departure.iata === appState.currentAirport?.iata_code;
        }
    });
    
    // Apply status filter
    if (appState.currentFilter !== 'all') {
        flights = flights.filter(flight => {
            const status = getFlightStatus(flight);
            return status.toLowerCase() === appState.currentFilter.replace('-', '');
        });
    }
    
    appState.filteredFlights = flights;
    
    // Update title
    const title = appState.flightType === 'arrivals' ? 'Arrivals' : 'Departures';
    document.getElementById('flightsTitle').textContent = title;
    
    if (flights.length === 0) {
        showNoFlights();
        return;
    }
    
    document.getElementById('noFlightsMessage').style.display = 'none';
    document.getElementById('flightsSection').style.display = 'block';
    
    // Sort flights by scheduled time
    flights.sort((a, b) => {
        const timeA = appState.flightType === 'arrivals' 
            ? (a.arrival?.scheduled || '')
            : (a.departure?.scheduled || '');
        const timeB = appState.flightType === 'arrivals'
            ? (b.arrival?.scheduled || '')
            : (b.departure?.scheduled || '');
        return timeA.localeCompare(timeB);
    });
    
    // Display flights
    flights.forEach(flight => {
        const row = createFlightRow(flight);
        tableBody.appendChild(row);
    });
}

// Create Flight Table Row
function createFlightRow(flight) {
    const row = document.createElement('tr');
    row.className = 'fade-in';
    
    const isArrival = appState.flightType === 'arrivals';
    const flightInfo = isArrival ? flight.arrival : flight.departure;
    const otherAirport = isArrival ? flight.departure : flight.arrival;
    
    const flightNumber = flight.flight?.iata || flight.flight?.number || 'N/A';
    const airline = flight.airline?.name || 'Unknown Airline';
    const airport = otherAirport?.iata || 'N/A';
    const scheduled = flightInfo?.scheduled ? formatDateTime(flightInfo.scheduled) : 'N/A';
    const estimated = flightInfo?.estimated ? formatDateTime(flightInfo.estimated) : (flightInfo?.scheduled ? formatDateTime(flightInfo.scheduled) : 'N/A');
    const status = getFlightStatus(flight);
    const statusClass = getStatusClass(status);
    
    row.innerHTML = `
        <td>
            <span class="flight-number">${flightNumber}</span>
        </td>
        <td>
            <span class="airline-name">${airline}</span>
        </td>
        <td>
            <span class="airport-code">${airport}</span>
        </td>
        <td>
            <span class="time-scheduled">${scheduled}</span>
        </td>
        <td>
            <span class="time-estimated ${isDelayed(flight) ? 'time-delayed' : ''}">${estimated}</span>
        </td>
        <td>
            <span class="badge ${statusClass}">${status}</span>
        </td>
    `;
    
    return row;
}

// Get Flight Status
function getFlightStatus(flight) {
    const isArrival = appState.flightType === 'arrivals';
    const flightInfo = isArrival ? flight.arrival : flight.departure;
    
    if (!flightInfo) return 'Unknown';
    
    if (flightInfo.delay) {
        return 'Delayed';
    }
    
    if (flight.flight_status === 'cancelled') {
        return 'Cancelled';
    }
    
    if (flight.flight_status === 'landed' || flight.flight_status === 'arrived') {
        return 'Landed';
    }
    
    if (flight.flight_status === 'active') {
        return 'In Flight';
    }
    
    return 'On-Time';
}

// Get Status CSS Class
function getStatusClass(status) {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('on-time') || statusLower.includes('scheduled')) {
        return 'status-on-time';
    } else if (statusLower.includes('delayed')) {
        return 'status-delayed';
    } else if (statusLower.includes('cancelled')) {
        return 'status-cancelled';
    } else if (statusLower.includes('landed') || statusLower.includes('arrived')) {
        return 'status-landed';
    }
    
    return 'status-scheduled';
}

// Check if Flight is Delayed
function isDelayed(flight) {
    const isArrival = appState.flightType === 'arrivals';
    const flightInfo = isArrival ? flight.arrival : flight.departure;
    return flightInfo && flightInfo.delay && parseInt(flightInfo.delay) > 0;
}

// Format DateTime
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    
    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return dateTimeString;
    }
}

// Set Filter
function setFilter(filter) {
    appState.currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('#flightFilters .btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    displayFlights();
}

// Favorites Management
function loadFavorites() {
    const saved = localStorage.getItem('flyingHighFavorites');
    if (saved) {
        appState.favorites = JSON.parse(saved);
        displayFavoritesList();
    }
}

function saveFavorites() {
    localStorage.setItem('flyingHighFavorites', JSON.stringify(appState.favorites));
    displayFavoritesList();
}

function addToFavorites() {
    if (!appState.currentAirport) return;
    
    const airportCode = appState.currentAirport.iata_code;
    if (!appState.favorites.includes(airportCode)) {
        appState.favorites.push(airportCode);
        saveFavorites();
        updateFavoriteButtons();
    }
}

function removeFromFavorites() {
    if (!appState.currentAirport) return;
    
    const airportCode = appState.currentAirport.iata_code;
    appState.favorites = appState.favorites.filter(code => code !== airportCode);
    saveFavorites();
    updateFavoriteButtons();
}

function updateFavoriteButtons() {
    if (!appState.currentAirport) {
        document.getElementById('addFavoriteBtn').style.display = 'none';
        document.getElementById('removeFavoriteBtn').style.display = 'none';
        return;
    }
    
    const airportCode = appState.currentAirport.iata_code;
    const isFavorite = appState.favorites.includes(airportCode);
    
    document.getElementById('addFavoriteBtn').style.display = isFavorite ? 'none' : 'inline-block';
    document.getElementById('removeFavoriteBtn').style.display = isFavorite ? 'inline-block' : 'none';
}

function displayFavoritesList() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    
    if (appState.favorites.length === 0) {
        document.getElementById('noFavoritesMessage').style.display = 'block';
        return;
    }
    
    document.getElementById('noFavoritesMessage').style.display = 'none';
    
    appState.favorites.forEach(code => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-warning text-dark favorite-badge p-2';
        badge.textContent = code;
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', () => searchAirport(code));
        favoritesList.appendChild(badge);
    });
}

function showFavorites() {
    hideSections();
    document.getElementById('favoritesSection').style.display = 'block';
    displayFavoritesList();
}

function showDashboard() {
    hideSections();
    if (appState.currentAirport) {
        document.getElementById('airportStatusSection').style.display = 'block';
        document.getElementById('flightFilters').style.display = 'block';
        if (appState.currentFlights.length > 0) {
            document.getElementById('flightsSection').style.display = 'block';
        }
    }
}

// UI Helper Functions
function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorAlert.classList.add('show');
    errorAlert.style.display = 'block';
}

function hideError() {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.classList.remove('show');
    errorAlert.style.display = 'none';
}

function hideSections() {
    document.getElementById('airportStatusSection').style.display = 'none';
    document.getElementById('flightsSection').style.display = 'none';
    document.getElementById('flightFilters').style.display = 'none';
    document.getElementById('favoritesSection').style.display = 'none';
}

function showNoFlights() {
    document.getElementById('flightsSection').style.display = 'block';
    document.getElementById('noFlightsMessage').style.display = 'block';
    document.getElementById('flightsTableBody').innerHTML = '';
}


