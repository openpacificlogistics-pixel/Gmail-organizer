require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Routes
const authRoutes = require("./routes/auth");
const gmailRoutes = require("./routes/gmail");
const settingsRoutes = require("./routes/settings");
const apiRoutes = require("./routes/api");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "gmail-app-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Ensure data directory and settings file exist
const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(
      {
        cannedResponses: {},
        forwardRules: [],
        categoryPreferences: {
          "DSP Operations": { autoReply: false, autoForward: false, forwardTo: "" },
          "Amazon Station": { autoReply: false, autoForward: false, forwardTo: "" },
          "HR & Compliance": { autoReply: false, autoForward: false, forwardTo: "" },
          "EDD & Legal": { autoReply: false, autoForward: false, forwardTo: "" },
          "Vendors & Suppliers": { autoReply: false, autoForward: false, forwardTo: "" },
          "Finance & Billing": { autoReply: false, autoForward: false, forwardTo: "" },
          Personal: { autoReply: false, autoForward: false, forwardTo: "" },
          "Spam & Unsubscribe": { autoReply: false, autoForward: false, forwardTo: "" },
        },
      },
      null,
      2
    )
  );
}

app.use("/auth", authRoutes);
app.use("/gmail", gmailRoutes);
app.use("/settings", settingsRoutes);
app.use("/api", apiRoutes);

// Top-level /callback to match the registered redirect URI
const { google } = require("googleapis");
app.get("/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    req.session.userEmail = userInfo.data.email;
    res.redirect("/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect("/login?error=auth_failed");
  }
});

app.get("/", (req, res) => {
  if (!req.session.tokens) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
