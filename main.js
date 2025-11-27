// ============================================
// CONFIGURATION
// ============================================

// IMPORTANT: Replace 'YOUR_MAP_KEY_HERE' with your actual NASA FIRMS MAP_KEY
// Get your key from: https://firms.modaps.eosdis.nasa.gov/api/
const CONFIG = {
    FIRMS_MAP_KEY: 'b75a1d1ae371d131c0c0dd2916a8a6b2',
    FIRMS_BASE_URL: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv',
    TIME_WINDOW_DAYS: 2, // How many days back to query for fire data
    EARTH_RADIUS_MILES: 3958.8, // Earth's radius in miles for haversine calculation
    DEFAULT_RADIUS_MILES: 100,
    DEFAULT_LAT: 37.7749, // San Francisco (fallback)
    DEFAULT_LNG: -122.4194
};

// ============================================
// STATE
// ============================================

let map = null;
let userMarker = null;
let radiusCircle = null;
let fireMarkers = [];
let currentLocation = null;
let currentRadius = CONFIG.DEFAULT_RADIUS_MILES;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    setupEventListeners();
    syncRadiusInputs();
    
    // Try to get user's location on load
    tryGeolocation();
});

// ============================================
// MAP SETUP
// ============================================

function initializeMap() {
    // Initialize Leaflet map
    map = L.map('map').setView([CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LNG], 6);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Geolocation button
    document.getElementById('geolocate-btn').addEventListener('click', tryGeolocation);
    
    // Find fires button
    document.getElementById('find-fires-btn').addEventListener('click', findFires);
    
    // Radius input and slider sync
    const radiusInput = document.getElementById('radius');
    const radiusSlider = document.getElementById('radius-slider');
    
    radiusInput.addEventListener('input', (e) => {
        radiusSlider.value = e.target.value;
        currentRadius = parseFloat(e.target.value);
    });
    
    radiusSlider.addEventListener('input', (e) => {
        radiusInput.value = e.target.value;
        currentRadius = parseFloat(e.target.value);
    });
}

function syncRadiusInputs() {
    const radiusInput = document.getElementById('radius');
    const radiusSlider = document.getElementById('radius-slider');
    radiusInput.value = CONFIG.DEFAULT_RADIUS_MILES;
    radiusSlider.value = CONFIG.DEFAULT_RADIUS_MILES;
}

// ============================================
// GEOLOCATION
// ============================================

function tryGeolocation() {
    const statusDiv = document.getElementById('location-status');
    
    if (!navigator.geolocation) {
        showLocationStatus('Geolocation is not supported by your browser', false);
        return;
    }
    
    statusDiv.textContent = 'Getting your location...';
    statusDiv.className = 'location-status';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            document.getElementById('latitude').value = lat.toFixed(6);
            document.getElementById('longitude').value = lng.toFixed(6);
            
            currentLocation = { lat, lng };
            
            showLocationStatus('✓ Location acquired successfully', true);
            
            // Center map on user location
            map.setView([lat, lng], 8);
            updateUserMarker(lat, lng);
        },
        (error) => {
            let message = 'Unable to get your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Permission denied. Please enter manually.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location unavailable.';
                    break;
                case error.TIMEOUT:
                    message += 'Request timed out.';
                    break;
                default:
                    message += 'Unknown error.';
            }
            showLocationStatus(message, false);
        }
    );
}

function showLocationStatus(message, isSuccess) {
    const statusDiv = document.getElementById('location-status');
    statusDiv.textContent = message;
    statusDiv.className = `location-status ${isSuccess ? 'success' : 'error'}`;
}

// ============================================
// MAIN FIRE SEARCH LOGIC
// ============================================

async function findFires() {
    // Get and validate inputs
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value);
    
    if (isNaN(lat) || isNaN(lng)) {
        showError('Please enter valid latitude and longitude values');
        return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showError('Latitude must be between -90 and 90, longitude between -180 and 180');
        return;
    }
    
    if (isNaN(radius) || radius <= 0) {
        showError('Please enter a valid radius');
        return;
    }
    
    // Hide any previous errors
    hideError();
    
    // Update state
    currentLocation = { lat, lng };
    currentRadius = radius;
    
    // Update map
    map.setView([lat, lng], 8);
    updateUserMarker(lat, lng);
    updateRadiusCircle(lat, lng, radius);
    
    // Clear old fire markers
    clearFireMarkers();
    
    // Show loading
    showLoading(true);
    
    try {
        // Calculate bounding box
        const bbox = calculateBoundingBox(lat, lng, radius);
        
        // Fetch fire data from FIRMS
        const fires = await fetchFIRMSData(bbox);
        
        // Filter fires by distance
        const nearbyFires = filterFiresByDistance(fires, lat, lng, radius);
        
        // Update UI
        updateQuerySummary(lat, lng, radius, nearbyFires.length);
        displayFiresOnMap(nearbyFires);
        displayFiresTable(nearbyFires);
        
        if (nearbyFires.length === 0) {
            showError('No fires detected in this radius and time window');
        }
        
    } catch (error) {
        console.error('Error fetching fire data:', error);
        showError(`Error fetching fire data: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ============================================
// BOUNDING BOX CALCULATION
// ============================================

function calculateBoundingBox(lat, lng, radiusMiles) {
    // Convert radius from miles to degrees (approximate)
    // 1 degree latitude ≈ 69 miles
    // 1 degree longitude varies by latitude
    
    const latDelta = radiusMiles / 69.0;
    const lngDelta = radiusMiles / (69.0 * Math.cos(lat * Math.PI / 180));
    
    return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLng: lng - lngDelta,
        maxLng: lng + lngDelta
    };
}

// ============================================
// FIRMS API INTERACTION
// ============================================

async function fetchFIRMSData(bbox) {
    // FIRMS API expects: /area/csv/{MAP_KEY}/{source}/{bbox}/{dayRange}/{date}
    // source options: VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, MODIS_NRT, etc.
    // We'll use VIIRS_SNPP_NRT for higher resolution
    // bbox format: west,south,east,north (minLng,minLat,maxLng,maxLat)
    
    const source = 'VIIRS_SNPP_NRT';
    const bboxString = `${bbox.minLng.toFixed(4)},${bbox.minLat.toFixed(4)},${bbox.maxLng.toFixed(4)},${bbox.maxLat.toFixed(4)}`;
    const dayRange = CONFIG.TIME_WINDOW_DAYS;
    
    const url = `${CONFIG.FIRMS_BASE_URL}/${CONFIG.FIRMS_MAP_KEY}/${source}/${bboxString}/${dayRange}`;
    
    console.log('Fetching from FIRMS:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`FIRMS API error: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Check if response indicates an error
    if (csvText.includes('Invalid MAP_KEY')) {
        throw new Error('Invalid FIRMS MAP_KEY. Please configure your API key in main.js');
    }
    
    // Parse CSV
    const fires = parseCSV(csvText);
    
    return fires;
}

// ============================================
// CSV PARSING
// ============================================

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
        return [];
    }
    
    // First line is header
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Parse each data line
    const fires = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        if (values.length !== headers.length) {
            continue; // Skip malformed lines
        }
        
        const fire = {};
        headers.forEach((header, index) => {
            fire[header] = values[index].trim();
        });
        
        // Convert numeric fields
        fire.latitude = parseFloat(fire.latitude);
        fire.longitude = parseFloat(fire.longitude);
        fire.bright_ti4 = parseFloat(fire.bright_ti4 || fire.brightness);
        fire.confidence = fire.confidence || 'n';
        
        fires.push(fire);
    }
    
    return fires;
}

// ============================================
// HAVERSINE DISTANCE CALCULATION
// ============================================

function haversineDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula to calculate great-circle distance
    const toRad = (deg) => deg * (Math.PI / 180);
    
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distance = CONFIG.EARTH_RADIUS_MILES * c;
    
    return distance;
}

// ============================================
// FIRE FILTERING
// ============================================

function filterFiresByDistance(fires, centerLat, centerLng, radiusMiles) {
    const filtered = fires.map(fire => {
        const distance = haversineDistance(
            centerLat, 
            centerLng, 
            fire.latitude, 
            fire.longitude
        );
        
        return {
            ...fire,
            distance: distance
        };
    }).filter(fire => fire.distance <= radiusMiles);
    
    // Sort by distance
    filtered.sort((a, b) => a.distance - b.distance);
    
    return filtered;
}

// ============================================
// MAP VISUALIZATION
// ============================================

function updateUserMarker(lat, lng) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    userMarker = L.marker([lat, lng], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map);
    
    userMarker.bindPopup('<strong>Your Location</strong>').openPopup();
}

function updateRadiusCircle(lat, lng, radiusMiles) {
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    
    // Convert miles to meters for Leaflet circle
    const radiusMeters = radiusMiles * 1609.34;
    
    radiusCircle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.1,
        weight: 2
    }).addTo(map);
}

function clearFireMarkers() {
    fireMarkers.forEach(marker => map.removeLayer(marker));
    fireMarkers = [];
}

function displayFiresOnMap(fires) {
    fires.forEach(fire => {
        // Determine marker color based on confidence
        let color = '#ff6b35'; // default orange
        
        if (fire.confidence === 'h' || fire.confidence === 'high') {
            color = '#e74c3c'; // red for high confidence
        } else if (fire.confidence === 'l' || fire.confidence === 'low') {
            color = '#f39c12'; // yellow for low confidence
        }
        
        // Determine marker size based on recency (if we have time data)
        const radius = 8; // Base radius
        
        const marker = L.circleMarker([fire.latitude, fire.longitude], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        // Create popup content
        const popupContent = `
            <strong>Fire Detection</strong><br>
            <strong>Time:</strong> ${fire.acq_date} ${fire.acq_time}<br>
            <strong>Coordinates:</strong> ${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}<br>
            <strong>Distance:</strong> ${fire.distance.toFixed(1)} mi<br>
            <strong>Satellite:</strong> ${fire.satellite || 'N/A'}<br>
            <strong>Confidence:</strong> ${fire.confidence}<br>
            <strong>Brightness:</strong> ${fire.bright_ti4 ? fire.bright_ti4.toFixed(1) + ' K' : 'N/A'}
        `;
        
        marker.bindPopup(popupContent);
        
        fireMarkers.push(marker);
    });
    
    // Fit map to show all fires and center
    if (fires.length > 0) {
        const bounds = L.latLngBounds(
            fires.map(f => [f.latitude, f.longitude])
        );
        bounds.extend([currentLocation.lat, currentLocation.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ============================================
// RESULTS TABLE
// ============================================

function displayFiresTable(fires) {
    const resultsSection = document.getElementById('results-section');
    const statsDiv = document.getElementById('results-stats');
    const tableBody = document.getElementById('fires-table-body');
    
    if (fires.length === 0) {
        resultsSection.style.display = 'none';
        return;
    }
    
    resultsSection.style.display = 'block';
    
    // Update stats
    statsDiv.textContent = `Found ${fires.length} fire detection${fires.length !== 1 ? 's' : ''} within ${currentRadius} miles`;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add rows for each fire
    fires.forEach(fire => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${fire.acq_date} ${fire.acq_time}</td>
            <td>${fire.distance.toFixed(1)}</td>
            <td>${fire.latitude.toFixed(4)}</td>
            <td>${fire.longitude.toFixed(4)}</td>
            <td>${fire.satellite || 'N/A'}</td>
            <td>${fire.confidence}</td>
            <td>${fire.bright_ti4 ? fire.bright_ti4.toFixed(1) : 'N/A'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ============================================
// UI UPDATES
// ============================================

function updateQuerySummary(lat, lng, radius, fireCount) {
    const summaryDiv = document.getElementById('summary-text');
    
    summaryDiv.innerHTML = `
        <p><strong>Center:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
        <p><strong>Radius:</strong> ${radius} miles</p>
        <p><strong>Time window:</strong> Last ${CONFIG.TIME_WINDOW_DAYS} days</p>
        <p><strong>Fires found:</strong> ${fireCount}</p>
    `;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    const errorDisplay = document.getElementById('error-display');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    errorDisplay.style.display = 'block';
}

function hideError() {
    const errorDisplay = document.getElementById('error-display');
    errorDisplay.style.display = 'none';
}
