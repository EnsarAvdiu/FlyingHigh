// Begin Ensar Avdiu

const appState = {
    currentAirport: null,
    currentFlights: [],
    filteredFlights: [],
    favorites: [],
    currentFilter: 'all',
    flightType: 'arrivals'
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadFavorites();

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

    document.querySelectorAll('input[name="flightType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            appState.flightType = this.value;
            displayFlights();
        });
    });

    document.getElementById('filterAll').addEventListener('click', () => setFilter('all'));
    document.getElementById('filterOnTime').addEventListener('click', () => setFilter('on-time'));
    document.getElementById('filterDelayed').addEventListener('click', () => setFilter('delayed'));
    document.getElementById('filterCancelled').addEventListener('click', () => setFilter('cancelled'));

    document.getElementById('addFavoriteBtn').addEventListener('click', addToFavorites);
    document.getElementById('removeFavoriteBtn').addEventListener('click', removeFromFavorites);

    document.querySelector('a[href="#favorites"]').addEventListener('click', function(e) {
        e.preventDefault();
        showFavorites();
    });

    document.querySelector('a[href="#dashboard"]').addEventListener('click', function(e) {
        e.preventDefault();
        showDashboard();
    });
}

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

async function searchAirport(airportCode) {
    hideError();
    hideSections();

    try {
        const [airportData, flightsData] = await Promise.all([
            fetchAirportInfo(airportCode),
            fetchFlights(airportCode)
        ]);

        if (!airportData) {
    showError("Airport not found. Please enter a valid IATA code.");
    hideSections();
    return;
}

displayAirportStatus(airportData);
appState.currentAirport = airportData;
updateFavoriteButtons();


        if (flightsData && flightsData.length > 0) {
            appState.currentFlights = flightsData;
            displayFlights();
        } else {
            showNoFlights();
        }

    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
    }
}

// End Ensar Avdiu

