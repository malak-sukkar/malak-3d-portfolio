import "./admin.css";
import { getCvConfig } from "./cv-storage.js";

const config = getCvConfig();
const loginForm = document.querySelector("#loginForm");
const passwordSetupPanel = document.querySelector("#passwordSetupPanel");
const passwordSetupForm = document.querySelector("#passwordSetupForm");
const passwordSetupCopy = document.querySelector("#passwordSetupCopy");
const uploadForm = document.querySelector("#uploadForm");
const uploadPanel = document.querySelector("#uploadPanel");
const notice = document.querySelector("#notice");
const configurationNotice = document.querySelector("#configurationNotice");
const forgotPasswordLink = document.querySelector("#forgotPasswordLink");
const logoutButton = document.querySelector("#logoutButton");
const signedInEmail = document.querySelector("#signedInEmail");
const cvFileInput = document.querySelector("#cvFile");
const sessionKey = "portfolio-cv-admin-session";

function showNotice(message, type = "info") {
  notice.textContent = message;
  notice.className = `notice notice-${type}`;
  notice.hidden = false;
}

async function readError(response) {
  try {
    const body = await response.json();
    return (
      body.msg ||
      body.message ||
      body.error_description ||
      body.error ||
      "Please try again."
    );
  } catch {
    return "Please try again.";
  }
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

function setSignedIn(session) {
  loginForm.hidden = true;
  uploadPanel.hidden = false;
  signedInEmail.textContent = session.user?.email || "your account";
}

if (!config) {
  configurationNotice.hidden = false;
  loginForm.querySelectorAll("input, button").forEach((field) => {
    field.disabled = true;
  });
}

const existingSession = readSession();
const inviteParams = new URLSearchParams(window.location.hash.slice(1));
const inviteAccessToken = inviteParams.get("access_token");
const authLinkType = inviteParams.get("type");
const isPasswordSetup = ["invite", "recovery"].includes(authLinkType);

if (isPasswordSetup && inviteAccessToken) {
  loginForm.hidden = true;
  uploadPanel.hidden = true;
  passwordSetupPanel.hidden = false;
  passwordSetupCopy.textContent =
    authLinkType === "recovery"
      ? "Choose a new password for your CV manager account."
      : "Your invitation is confirmed. Choose a password to finish setting up the CV manager.";
} else if (config && existingSession?.access_token) {
  setSignedIn(existingSession);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!config) return;

  const button = loginForm.querySelector("button[type='submit']");
  button.disabled = true;
  showNotice("Signing in…");

  try {
    const response = await fetch(
      `${config.url}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.anonKey,
        },
        body: JSON.stringify({
          email: loginForm.elements.email.value.trim(),
          password: loginForm.elements.password.value,
        }),
      },
    );

    if (!response.ok) throw new Error(await readError(response));
    const session = await response.json();
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    loginForm.reset();
    setSignedIn(session);
    showNotice("Signed in. Your CV is ready to update.", "success");
  } catch (error) {
    showNotice(
      error.message || "Could not sign in. Please try again.",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});

forgotPasswordLink.addEventListener("click", async () => {
  if (!config) return;
  const email = loginForm.elements.email.value.trim();
  if (!email) {
    showNotice(
      "Enter your email address first, then choose Forgot your password.",
      "error",
    );
    loginForm.elements.email.focus();
    return;
  }

  forgotPasswordLink.disabled = true;
  showNotice("Requesting a password reset…");
  try {
    const redirectTo = new URL(
      `${import.meta.env.BASE_URL}admin.html`,
      window.location.origin,
    ).toString();
    const response = await fetch(
      `${config.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.anonKey,
        },
        body: JSON.stringify({ email }),
      },
    );
    if (!response.ok) throw new Error(await readError(response));
    showNotice(
      "If an account exists for that email, a password reset link has been sent.",
      "success",
    );
  } catch (error) {
    showNotice(
      error.message || "Could not request a reset link. Please try again.",
      "error",
    );
  } finally {
    forgotPasswordLink.disabled = false;
  }
});

passwordSetupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!config || !inviteAccessToken || !isPasswordSetup) return;

  const password = passwordSetupForm.elements.newPassword.value;
  const confirmation = passwordSetupForm.elements.confirmPassword.value;
  if (password !== confirmation) {
    showNotice(
      "The passwords do not match. Check them and try again.",
      "error",
    );
    return;
  }

  const button = passwordSetupForm.querySelector("button[type='submit']");
  button.disabled = true;
  showNotice("Setting your password…");

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${inviteAccessToken}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) throw new Error(await readError(response));
    const user = await response.json();
    const session = {
      access_token: inviteAccessToken,
      refresh_token: inviteParams.get("refresh_token"),
      user,
    };

    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${window.location.search}`,
    );
    passwordSetupForm.reset();
    passwordSetupPanel.hidden = true;
    setSignedIn(session);
    showNotice(
      "Password saved. You can now upload your CV PDF.",
      "success",
    );
  } catch (error) {
    showNotice(
      error.message ||
        "Could not set the password. Request a fresh invitation and try again.",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = readSession();
  const file = cvFileInput.files[0];

  if (!session?.access_token) {
    showNotice("Your sign-in has expired. Please sign in again.", "error");
    uploadPanel.hidden = true;
    loginForm.hidden = false;
    return;
  }
  if (!file) {
    showNotice("Choose your CV PDF before uploading.", "error");
    return;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showNotice("Choose a PDF file for your CV.", "error");
    return;
  }
  if ((await file.slice(0, 5).text()) !== "%PDF-") {
    showNotice("This file does not look like a valid PDF.", "error");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showNotice("Your CV PDF must be smaller than 15 MB.", "error");
    return;
  }

  const button = uploadForm.querySelector("button[type='submit']");
  button.disabled = true;
  showNotice("Uploading your CV…");

  try {
    const response = await fetch(`${config.url}/storage/v1/object/cv/cv.pdf`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body: file,
    });

    if (response.status === 401)
      throw new Error("Your sign-in has expired. Sign out and sign in again.");
    if (!response.ok) throw new Error(await readError(response));

    showNotice(
      "Your CV PDF is uploaded. Open your portfolio and select the CV to see the new version.",
      "success",
    );
    uploadForm.reset();
  } catch (error) {
    showNotice(
      error.message || "The upload failed. Please try again.",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(sessionKey);
  uploadForm.reset();
  uploadPanel.hidden = true;
  loginForm.hidden = false;
  notice.hidden = true;
});
