// Begin Veron Osmani

const API_CONFIG = {
    baseURL: 'https://api.aviationstack.com/v1',
    apiKey: '69b7d564fbcb1083f35974671126c602',
    openskyURL: 'https://opensky-network.org/api'
};

async function fetchAirportInfo(airportCode) {
    const url = `${API_CONFIG.baseURL}/airports?access_key=${API_CONFIG.apiKey}&iata_code=${airportCode}`;
    const response = await fetch(url);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = null;
        }

        if (response.status === 401) {
            const apiErrorMsg = errorData?.error?.info || '';
            throw new Error(`401 Unauthorized: ${apiErrorMsg || 'Invalid API key. Please check your API key.'}`);
        }
        if (response.status === 403) {
            const apiErrorMsg = errorData?.error?.info || '';
            throw new Error(`403 Forbidden: ${apiErrorMsg || 'API key may be invalid or subscription expired'}`);
        }
        if (response.status === 429) {
            throw new Error('429 Too Many Requests: API rate limit exceeded. Please try again later');
        }

        const apiErrorMsg = errorData?.error?.info || '';
        throw new Error(apiErrorMsg || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        const errorMessage = data.error.info || data.error.message || 'Unknown API error';
        throw new Error(errorMessage);
    }

    if (data.data && data.data.length > 0) {
        return data.data[0];
    }

    return null;
}

async function fetchFlights(airportCode) {
    const url = `${API_CONFIG.baseURL}/flights?access_key=${API_CONFIG.apiKey}&dep_iata=${airportCode}&limit=50`;
    const response = await fetch(url);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = null;
        }

        if (response.status === 401) {
            const apiErrorMsg = errorData?.error?.info || '';
            throw new Error(`401 Unauthorized: ${apiErrorMsg || 'Invalid API key. Please check your API key.'}`);
        }
        if (response.status === 403) {
            const apiErrorMsg = errorData?.error?.info || '';
            throw new Error(`403 Forbidden: ${apiErrorMsg || 'API key may be invalid or subscription expired'}`);
        }
        if (response.status === 429) {
            throw new Error('429 Too Many Requests: API rate limit exceeded. Please try again later');
        }

        const apiErrorMsg = errorData?.error?.info || '';
        throw new Error(apiErrorMsg || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        const errorMessage = data.error.info || data.error.message || 'Unknown API error';
        throw new Error(errorMessage);
    }

    const flights = data.data || [];

    const arrivalsUrl = `${API_CONFIG.baseURL}/flights?access_key=${API_CONFIG.apiKey}&arr_iata=${airportCode}&limit=50`;
    const arrivalsResponse = await fetch(arrivalsUrl);
    if (arrivalsResponse.ok) {
        const arrivalsData = await arrivalsResponse.json();
        if (arrivalsData.error) {
            console.warn('Error fetching arrivals:', arrivalsData.error.info);
        } else if (arrivalsData.data) {
            flights.push(...arrivalsData.data);
        }
    } else {
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
}

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

function isDelayed(flight) {
    const isArrival = appState.flightType === 'arrivals';
    const flightInfo = isArrival ? flight.arrival : flight.departure;
    return flightInfo && flightInfo.delay && parseInt(flightInfo.delay, 10) > 0;
}

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

// End Veron Osmani

