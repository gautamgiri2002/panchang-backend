require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PROKERALA_CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
const PROKERALA_CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

const districtCoordinates = {
  "Madhubani": { lat: 26.3469, lon: 86.0715 },
  "Darbhanga": { lat: 26.1522, lon: 85.8971 },
  "Patna": { lat: 25.5941, lon: 85.1376 },
  "Muzaffarpur": { lat: 26.1209, lon: 85.3647 },
  "Samastipur": { lat: 25.8620, lon: 85.7810 },
  "Sitamarhi": { lat: 26.5952, lon: 85.4808 },
  "Saharsa": { lat: 25.8835, lon: 86.6006 },
  "Purnia": { lat: 25.7771, lon: 87.4753 },
  "Bhagalpur": { lat: 25.2425, lon: 86.9842 },
  "Gaya": { lat: 24.7914, lon: 85.0002 },
  "New Delhi": { lat: 28.6139, lon: 77.2090 },
  "Delhi": { lat: 28.6139, lon: 77.2090 },
  "Varanasi": { lat: 25.3176, lon: 82.9739 },
  "Ayodhya": { lat: 26.7922, lon: 82.1998 },
  "Lucknow": { lat: 26.8467, lon: 80.9462 },
  "Mumbai": { lat: 19.0760, lon: 72.8777 },
  "Pune": { lat: 18.5204, lon: 73.8567 },
  "Kolkata": { lat: 22.5726, lon: 88.3639 },
  "Jaipur": { lat: 26.9124, lon: 75.7873 },
  "Ahmedabad": { lat: 23.0225, lon: 72.5714 },
  "Bhopal": { lat: 23.2599, lon: 77.4126 },
  "Ranchi": { lat: 23.3441, lon: 85.3096 },
  "Bengaluru": { lat: 12.9716, lon: 77.5946 },
  "Chennai": { lat: 13.0827, lon: 80.2707 },
  "Hyderabad": { lat: 17.3850, lon: 78.4867 }
};

let tokenCache = { accessToken: null, expiresAt: 0 };

function coordsFor(district, lat, lon) {
  if (lat && lon) return { lat: Number(lat), lon: Number(lon) };
  return districtCoordinates[district] || districtCoordinates["Madhubani"];
}

async function getToken() {
  if (!PROKERALA_CLIENT_ID || !PROKERALA_CLIENT_SECRET) {
    throw new Error("Missing PROKERALA_CLIENT_ID or PROKERALA_CLIENT_SECRET");
  }

  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60000) return tokenCache.accessToken;

  const basicAuth = Buffer.from(`${PROKERALA_CLIENT_ID}:${PROKERALA_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://api.prokerala.com/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Token request failed");

  tokenCache.accessToken = data.access_token;
  tokenCache.expiresAt = now + ((data.expires_in || 3600) * 1000);
  return tokenCache.accessToken;
}

function normalize(raw, meta) {
  const data = raw.data || raw;
  return {
    success: true,
    source: "Prokerala",
    location: meta,
    raw,
    panchang: {
      date: meta.date,
      tithi: data.tithi || data.tithi_name || data?.panchang?.tithi || null,
      nakshatra: data.nakshatra || data.nakshatra_name || data?.panchang?.nakshatra || null,
      yoga: data.yoga || data.yoga_name || data?.panchang?.yoga || null,
      karana: data.karana || data.karana_name || data?.panchang?.karana || null,
      vaara: data.vaara || data.weekday || data.day || null,
      sunrise: data.sunrise || data?.sun?.sunrise || null,
      sunset: data.sunset || data?.sun?.sunset || null,
      rahu_kalam: data.rahu_kalam || data.rahukalam || data?.inauspicious_period?.rahu_kalam || null
    }
  };
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Uchchaith Panchang API is running",
    test: "/api/panchang?date=2026-05-27&state=Bihar&district=Madhubani"
  });
});

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.get("/api/panchang", async (req, res) => {
  try {
    const { date, state, district, lat, lon, ayanamsa = 1 } = req.query;
    const safeDate = date || new Date().toISOString().slice(0, 10);
    const coords = coordsFor(district, lat, lon);
    const token = await getToken();

    const params = new URLSearchParams({
      datetime: `${safeDate}T06:00:00+05:30`,
      coordinates: `${coords.lat},${coords.lon}`,
      ayanamsa: String(ayanamsa)
    });

    const apiUrl = `https://api.prokerala.com/v2/astrology/panchang/advanced?${params.toString()}`;
    const response = await fetch(apiUrl, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
    });

    const raw = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Prokerala API error", status: response.status, details: raw });
    }

    return res.json(normalize(raw, {
      date: safeDate,
      state: state || null,
      district: district || "Madhubani",
      lat: coords.lat,
      lon: coords.lon
    }));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/panchang", async (req, res) => {
  req.query = req.body || {};
  app._router.handle(req, res);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening port: ${PORT}`);
});
