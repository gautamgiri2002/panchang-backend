const express = require("express");
const cors = require("cors");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
  res.send("Panchang backend is running");
});

// Panchang Route
app.get("/panchang", async (req, res) => {
  try {

    const clientId = process.env.PROKERALA_CLIENT_ID;
    const clientSecret = process.env.PROKERALA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Missing Prokerala credentials"
      });
    }

    // STEP 1: Get Access Token
    const tokenResponse = await fetch(
      "https://api.prokerala.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(500).json({
        error: "Failed to get access token",
        details: tokenData
      });
    }

    const accessToken = tokenData.access_token;

    // STEP 2: Panchang API Call
    const today = new Date().toISOString().split("T")[0];

    const apiResponse = await fetch(
      `https://api.prokerala.com/v2/astrology/panchang?datetime=${today}T06:00:00+05:30&coordinates=26.1522,85.8971`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const data = await apiResponse.json();

    res.json(data);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
