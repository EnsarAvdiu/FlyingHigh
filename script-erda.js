// erda 

function displayAirportStatus(airport) {
    document.getElementById('airportName').textContent = airport.airport_name || 'Unknown';
    document.getElementById('airportCode').textContent = airport.iata_code || 'N/A';
    document.getElementById('airportLocation').textContent =
        `${airport.city_name || 'Unknown'}, ${airport.country_name || 'Unknown'}`;
    document.getElementById('airportTimezone').textContent = airport.timezone || 'N/A';

    const statusBadge = document.getElementById('airportStatusBadge');
    statusBadge.textContent = 'Operational';
    statusBadge.className = 'badge bg-success';

    document.getElementById('airportStatusSection').style.display = 'block';
    document.getElementById('flightFilters').style.display = 'block';
}

function displayFlights() {
    const tableBody = document.getElementById('flightsTableBody');
    tableBody.innerHTML = '';

    let flights = appState.currentFlights.filter(flight => {
        if (appState.flightType === 'arrivals') {
            return flight.arrival && flight.arrival.iata === appState.currentAirport?.iata_code;
        } else {
            return flight.departure && flight.departure.iata === appState.currentAirport?.iata_code;
        }
    });

    if (appState.currentFilter !== 'all') {
        flights = flights.filter(flight => {
            const status = getFlightStatus(flight);
            const normalizedStatus = status.toLowerCase().replace(/-/g, '');
            const normalizedFilter = appState.currentFilter.toLowerCase().replace(/-/g, '');
            return normalizedStatus === normalizedFilter;
        });
    }

    appState.filteredFlights = flights;

    const title = appState.flightType === 'arrivals' ? 'Arrivals' : 'Departures';
    document.getElementById('flightsTitle').textContent = title;

    if (flights.length === 0) {
        showNoFlights();
        return;
    }

    document.getElementById('noFlightsMessage').style.display = 'none';
    document.getElementById('flightsSection').style.display = 'block';

    flights.sort((a, b) => {
        const timeA = appState.flightType === 'arrivals'
            ? (a.arrival?.scheduled || '')
            : (a.departure?.scheduled || '');
        const timeB = appState.flightType === 'arrivals'
            ? (b.arrival?.scheduled || '')
            : (b.departure?.scheduled || '');
        return timeA.localeCompare(timeB);
    });

    flights.forEach(flight => {
        const row = createFlightRow(flight);
        tableBody.appendChild(row);
    });
}

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
    const estimated = flightInfo?.estimated ? formatDateTime(flightInfo.estimated)
        : (flightInfo?.scheduled ? formatDateTime(flightInfo.scheduled) : 'N/A');
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

function setFilter(filter) {
    appState.currentFilter = filter;

    document.querySelectorAll('#flightFilters .btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    displayFlights();
}

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

function showLoading() {
}

function showError(message) {
    console.error(message);
}

function hideError() {
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

// erda end

