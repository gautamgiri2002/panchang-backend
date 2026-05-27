
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Panchang backend is running");
});

app.get("/panchang", async (req, res) => {
  try {

    const apiKey = process.env.PANCHANG_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "API key missing"
      });
    }

    res.json({
      success: true,
      message: "Backend working"
    });

  } catch (error) {
    res.status(500).json({
      error: "Something went wrong"
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
