import { NextRequest, NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

// Step 1: Redirect user to Google OAuth consent
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not set" }, { status: 500 });
  }

  const action = req.nextUrl.searchParams.get("action");

  // Step 2: Handle callback — exchange code for tokens
  if (action === "callback") {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "No authorization code received" }, { status: 400 });
    }

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${req.nextUrl.origin}/api/google/auth?action=callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.refresh_token) {
      return new Response(
        `<html><body style="background:#0a0a1a;color:#fff;font-family:system-ui;padding:40px">
          <h2>⚠️ No refresh token received</h2>
          <p>This can happen if you've already authorized this app before.
          Go to <a href="https://myaccount.google.com/permissions" style="color:#818cf8">Google Account Permissions</a>,
          revoke access for this app, then try again.</p>
          <pre style="background:#1a1a2e;padding:16px;border-radius:8px;overflow:auto">${JSON.stringify(tokenData, null, 2)}</pre>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Get user info to identify who this is
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const firstName = userInfo.given_name || userInfo.name?.split(" ")[0] || "unknown";

    const envVarName = firstName.toLowerCase() === "johann"
      ? "GOOGLE_REFRESH_TOKEN"
      : `GOOGLE_REFRESH_TOKEN_${firstName.toUpperCase()}`;

    return new Response(
      `<html><body style="background:#0a0a1a;color:#fff;font-family:system-ui;padding:40px">
        <h2 style="color:#22c55e">✅ Google Connected for ${userInfo.name}</h2>
        <p>Add this environment variable to Vercel:</p>
        <div style="background:#1a1a2e;padding:16px;border-radius:8px;margin:16px 0">
          <p style="color:#818cf8;font-weight:bold;margin:0 0 8px">${envVarName}</p>
          <input type="text" value="${tokenData.refresh_token}" readonly
            style="width:100%;background:#0a0a1a;color:#fff;border:1px solid #333;padding:8px;border-radius:4px;font-family:monospace"
            onclick="this.select()" />
        </div>
        <p style="color:#94a3b8;font-size:14px">
          1. Go to <a href="https://vercel.com" style="color:#818cf8">Vercel Dashboard</a> → your project → Settings → Environment Variables<br/>
          2. Add <code style="background:#1a1a2e;padding:2px 6px;border-radius:4px">${envVarName}</code> with the value above<br/>
          3. Redeploy the app
        </p>
        <p style="color:#94a3b8;font-size:14px">Email: ${userInfo.email}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Step 1: Redirect to Google consent
  const redirectUri = `${req.nextUrl.origin}/api/google/auth?action=callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
