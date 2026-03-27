#!/usr/bin/env node
/**
 * get-refresh-token.js
 * Run this once locally to get a Google OAuth refresh token.
 * Usage: node get-refresh-token.js
 */

const http     = require("http");
const https    = require("https");
const readline = require("readline");

const CLIENT_ID     = "902225466721-d6i2odj6f9s3a8b88us7idh46057aqc8.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI  = "http://localhost:4444";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
  });

console.log("\n==========================================================");
console.log("  STEP 1: Open this URL in your browser:");
console.log("==========================================================\n");
console.log(authUrl);
console.log("\n==========================================================");
console.log("  STEP 2: Sign in as johann@supplied.eu and allow access.");
console.log("  The page will show an error — that's fine, just wait.");
console.log("==========================================================\n");

// Start local server to catch the redirect
const server = http.createServer(async (req, res) => {
  const url   = new URL(req.url, REDIRECT_URI);
  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end("Error: " + error);
    console.error("\n❌ Auth error:", error);
    server.close();
    return;
  }
  if (!code) { res.end("Waiting..."); return; }

  res.end("<h2>✅ Got the code! You can close this tab and check your terminal.</h2>");
  server.close();

  // Exchange code for tokens
  const body = new URLSearchParams({
    code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
    grant_type:    "authorization_code",
  }).toString();

  const tokenReq = https.request({
    hostname: "oauth2.googleapis.com",
    path:     "/token",
    method:   "POST",
    headers:  {
      "Content-Type":   "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, tokenRes => {
    let data = "";
    tokenRes.on("data", d => data += d);
    tokenRes.on("end", () => {
      const tokens = JSON.parse(data);
      if (!tokens.refresh_token) {
        console.error("\n❌ No refresh_token in response:", data);
        return;
      }
      console.log("\n==========================================================");
      console.log("  ✅ SUCCESS! Your refresh token is:");
      console.log("==========================================================\n");
      console.log(tokens.refresh_token);
      console.log("\n==========================================================");
      console.log("  Copy the value above and save it as GOOGLE_REFRESH_TOKEN");
      console.log("  in your GitHub org secrets.");
      console.log("==========================================================\n");
    });
  });
  tokenReq.on("error", e => console.error("Request error:", e));
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(4444, () => {
  console.log("Waiting for Google to redirect back... (listening on port 3456)\n");
});
