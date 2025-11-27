# 🔥 EmberMap

**EmberMap** is a lightweight, static web application that visualizes active fire detections near your location using NASA FIRMS (Fire Information for Resource Management System) data.

## Features

- 📍 **Geolocation Support**: Automatically detects your location or allows manual input
- 🗺️ **Interactive Map**: Powered by Leaflet and OpenStreetMap
- 🔥 **Real-time Fire Data**: Retrieves active fire detections from NASA FIRMS API
- 📊 **Data Table**: Displays detailed fire information sorted by distance
- 🎯 **Customizable Radius**: Search for fires within a specified radius (miles)
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **Static Deployment**: No backend required - perfect for GitHub Pages

## Data Source

Fire detection data is provided by [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/), which aggregates active fire data from MODIS and VIIRS satellite sensors. The app queries fires detected within the last 48 hours by default.

## Setup Instructions

### 1. Get Your FIRMS API Key

1. Visit the [FIRMS API page](https://firms.modaps.eosdis.nasa.gov/api/)
2. Register for a free MAP_KEY
3. Check your email for the API key

### 2. Configure the Application

Open `main.js` and locate the `CONFIG` section at the top of the file:

```javascript
const CONFIG = {
    FIRMS_MAP_KEY: 'YOUR_MAP_KEY_HERE',  // Replace with your actual key
    // ... other settings
};
```

Replace `'YOUR_MAP_KEY_HERE'` with your actual FIRMS MAP_KEY.

### 3. Deploy to GitHub Pages

#### Option A: Deploy from Root (Recommended)

1. Commit all files to your repository:
   ```bash
   git add .
   git commit -m "Initial EmberMap commit"
   git push origin main
   ```

2. Go to your GitHub repository settings
3. Navigate to **Pages** (under "Code and automation")
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

Your site will be available at: `https://PhilipHoddinott.github.io/EmberMap/`

#### Option B: Deploy from `/docs` folder

If you prefer to use the `/docs` folder:

1. Create a `docs` folder and move `index.html`, `style.css`, and `main.js` into it
2. Follow the same steps as Option A, but select `docs` as the folder

### 4. Test Locally (Optional)

You can test the app locally using Python's built-in HTTP server:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

Or use any other local web server (Live Server extension in VS Code, etc.).

## Usage

1. **Get Your Location**:
   - Click "Use My Current Location" to auto-detect
   - Or manually enter latitude and longitude

2. **Set Search Radius**:
   - Use the slider or input field to set your search radius in miles
   - Default is 100 miles

3. **Find Fires**:
   - Click "Find Fires" to query NASA FIRMS
   - View results on the interactive map
   - Scroll down to see a detailed table of fires sorted by distance

4. **Explore**:
   - Click on fire markers for detailed information
   - The blue marker shows your location
   - The circle shows your search radius

## Technical Details

- **No Build Process**: Pure HTML, CSS, and JavaScript - no bundlers or frameworks
- **Dependencies**: Leaflet.js (loaded via CDN)
- **Data Format**: Fetches CSV data from FIRMS and parses it client-side
- **Distance Calculation**: Uses the haversine formula for accurate great-circle distances
- **Time Window**: Queries fires from the last 48 hours (configurable in `main.js`)

## Limitations & Considerations

- **CORS**: The FIRMS API supports CORS, so direct browser requests work fine. If you encounter issues, ensure your MAP_KEY is valid.
- **Rate Limits**: FIRMS has usage limits. For personal use, these are generally sufficient.
- **Data Freshness**: Fire data typically updates every few hours depending on satellite passes
- **Accuracy**: Fire detections are approximate and represent satellite-detected thermal anomalies

## Customization

You can customize various aspects in `main.js`:

```javascript
const CONFIG = {
    FIRMS_MAP_KEY: 'YOUR_KEY',
    TIME_WINDOW_DAYS: 2,        // Change time window
    DEFAULT_RADIUS_MILES: 100,   // Change default radius
    DEFAULT_LAT: 37.7749,        // Change default center
    DEFAULT_LNG: -122.4194
};
```

## Browser Support

EmberMap works in all modern browsers that support:
- ES6+ JavaScript
- Geolocation API (optional)
- Fetch API

## License

This project is open source. NASA FIRMS data is provided free of charge for non-commercial use. Please review [NASA's data usage policy](https://earthdata.nasa.gov/earth-observation-data/near-real-time/citation#ed-lance-disclaimer) for details.

## Credits

- **Fire Data**: [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)
- **Mapping**: [Leaflet](https://leafletjs.com/)
- **Tiles**: [OpenStreetMap](https://www.openstreetmap.org/)

---

**EmberMap** - Making wildfire awareness accessible to everyone 🌍🔥
