/* =========================================================
   TRADESIM — FRONTEND APPLICATION
   Step 1A: UI + Authentication + Simulator Foundation
   ========================================================= */

const STORAGE_KEY = "tradesim_v2";
const LOGIN_KEY = "tradesim_logged_in";
const USER_KEY = "tradesim_username";

let state = loadState();
let currentUser = null;
let authMode = "login";


/* =========================================================
   STATE
========================================================= */

function createInitialState() {
  return {
    cash: 100000,
    startingCapital: 100000,
    realizedPnl: 0,
    stocks: JSON.parse(JSON.stringify(INITIAL_STOCKS)),
    positions: {},
    orders: []
  };
}


function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      return {
        ...createInitialState(),
        ...parsed
      };
    }
  } catch (error) {
    console.error("State loading error:", error);
  }

  return createInitialState();
}


function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error("State saving error:", error);
  }
}


/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  const number = Number(value) || 0;

  return "₹" + number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


function getStock(symbol) {
  return state.stocks.find(
    stock => stock.symbol === symbol
  );
}


function getPosition(symbol) {
  return state.positions[symbol] || null;
}


function calculatePortfolioValue() {
  let value = state.cash;

  Object.values(state.positions).forEach(position => {
    const stock = getStock(position.symbol);

    if (stock) {
      value +=
        position.quantity *
        stock.price;
    }
  });

  return value;
}


function calculateUnrealizedPnl() {
  let pnl = 0;

  Object.values(state.positions).forEach(position => {
    const stock = getStock(position.symbol);

    if (stock) {
      pnl +=
        (
          stock.price -
          position.averagePrice
        ) *
        position.quantity;
    }
  });

  return pnl;
}


function calculateTotalPnl() {
  return (
    state.realizedPnl +
    calculateUnrealizedPnl()
  );
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "info") {
  const toast =
    document.getElementById("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;

  toast.className =
    "toast show " + type;

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {
      toast.className = "toast";
    }, 3000);
}


/* =========================================================
   AUTH MODE
========================================================= */

function switchAuthMode() {
  if (authMode === "login") {
    showRegister();
  } else {
    showLogin();
  }
}


function showLogin() {
  authMode = "login";

  const loginForm =
    document.getElementById("loginForm");

  const registerForm =
    document.getElementById("registerForm");

  const title =
    document.getElementById("authTitle");

  const subtitle =
    document.getElementById("authSubtitle");

  const switchText =
    document.getElementById("switchText");

  const switchButton =
    document.getElementById("switchAuth");

  if (loginForm) {
    loginForm.classList.remove("hidden");
    loginForm.style.display = "";
  }

  if (registerForm) {
    registerForm.classList.add("hidden");
    registerForm.style.display = "none";
  }

  if (title) {
    title.textContent =
      "Welcome back";
  }

  if (subtitle) {
    subtitle.textContent =
      "Sign in to continue your trading simulation.";
  }

  if (switchText) {
    switchText.textContent =
      "New to TradeSim?";
  }

  if (switchButton) {
    switchButton.textContent =
      "Create account";
  }
}


function showRegister() {
  authMode = "register";

  const loginForm =
    document.getElementById("loginForm");

  const registerForm =
    document.getElementById("registerForm");

  const title =
    document.getElementById("authTitle");

  const subtitle =
    document.getElementById("authSubtitle");

  const switchText =
    document.getElementById("switchText");

  const switchButton =
    document.getElementById("switchAuth");

  if (loginForm) {
    loginForm.classList.add("hidden");
    loginForm.style.display = "none";
  }

  if (registerForm) {
    registerForm.classList.remove("hidden");
    registerForm.style.display = "";
  }

  if (title) {
    title.textContent =
      "Create your trader account";
  }

  if (subtitle) {
    subtitle.textContent =
      "Start with ₹1,00,000 simulated capital.";
  }

  if (switchText) {
    switchText.textContent =
      "Already have an account?";
  }

  if (switchButton) {
    switchButton.textContent =
      "Sign in";
  }
}


/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function togglePassword(inputId, button) {
  const input =
    document.getElementById(inputId);

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";

    if (button) {
      button.textContent = "Hide";
    }
  } else {
    input.type = "password";

    if (button) {
      button.textContent = "Show";
    }
  }
}


/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function updatePasswordStrength() {
  const input =
    document.getElementById(
      "registerPassword"
    );

  const bar =
    document.getElementById(
      "strengthBar"
    );

  const text =
    document.getElementById(
      "strengthText"
    );

  if (!input || !bar || !text)
    return;

  const password = input.value;

  let score = 0;

  if (password.length >= 8)
    score++;

  if (password.length >= 12)
    score++;

  if (/[A-Z]/.test(password))
    score++;

  if (/[0-9]/.test(password))
    score++;

  if (/[^A-Za-z0-9]/.test(password))
    score++;

  const percentage =
    Math.min(
      score * 20,
      100
    );

  bar.style.width =
    percentage + "%";

  if (!password) {
    text.textContent =
      "Use at least 8 characters.";
    return;
  }

  if (score <= 1) {
    text.textContent =
      "Weak password";
  } else if (score <= 3) {
    text.textContent =
      "Moderate password";
  } else {
    text.textContent =
      "Strong password";
  }
}


/* =========================================================
   AUTH MESSAGES
========================================================= */

function setAuthMessage(
  elementId,
  message,
  type = "error"
) {
  const element =
    document.getElementById(elementId);

  if (!element) {
    showToast(message, type);
    return;
  }

  element.textContent = message;

  element.className =
    "auth-message " + type;
}


/* =========================================================
   REGISTER
========================================================= */

async function registerTrader() {
  const username =
    document.getElementById(
      "registerUsername"
    ).value.trim();

  const password =
    document.getElementById(
      "registerPassword"
    ).value;

  const confirmPassword =
    document.getElementById(
      "registerConfirmPassword"
    ).value;

  const button =
    document.getElementById(
      "registerButton"
    );

  if (
    !/^[a-zA-Z0-9_]{3,30}$/.test(
      username
    )
  ) {
    setAuthMessage(
      "registerMessage",
      "Username must be 3–30 characters and use only letters, numbers or underscore."
    );
    return;
  }

  if (password.length < 8) {
    setAuthMessage(
      "registerMessage",
      "Password must be at least 8 characters."
    );
    return;
  }

  if (password !== confirmPassword) {
    setAuthMessage(
      "registerMessage",
      "Passwords do not match."
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.innerHTML =
      "<span>Creating account...</span><span>•••</span>";
  }

  try {
    const response =
      await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            username,
            password
          })
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      setAuthMessage(
        "registerMessage",
        data.error ||
        "Unable to create account."
      );
      return;
    }

    setAuthMessage(
      "registerMessage",
      "Account created successfully. Redirecting to login...",
      "success"
    );

    document.getElementById(
      "registerPassword"
    ).value = "";

    document.getElementById(
      "registerConfirmPassword"
    ).value = "";

    setTimeout(
      showLogin,
      1200
    );

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    setAuthMessage(
      "registerMessage",
      "Network error. Please try again."
    );

  } finally {
    if (button) {
      button.disabled = false;

      button.innerHTML =
        "<span>Create Trader Account</span><span>→</span>";
    }
  }
}


/* =========================================================
   LOGIN
========================================================= */

async function loginTrader() {
  const username =
    document.getElementById(
      "loginUsername"
    ).value.trim();

  const password =
    document.getElementById(
      "loginPassword"
    ).value;

  const button =
    document.getElementById(
      "loginButton"
    );

  if (!username || !password) {
    setAuthMessage(
      "loginMessage",
      "Enter username and password."
    );
    return;
  }

  if (button) {
    button.disabled = true;

    button.innerHTML =
      "<span>Signing in...</span><span>•••</span>";
  }

  try {
    const response =
      await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body: JSON.stringify({
            username,
            password
          })
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      setAuthMessage(
        "loginMessage",
        data.error ||
        "Invalid username or password."
      );
      return;
    }

    currentUser =
      data.user;

    localStorage.setItem(
      LOGIN_KEY,
      "true"
    );

    localStorage.setItem(
      USER_KEY,
      currentUser.username
    );

    showTradingApp();

    showToast(
      "Welcome back, " +
      currentUser.username + "!",
      "success"
    );

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    setAuthMessage(
      "loginMessage",
      "Network error. Please try again."
    );

  } finally {
    if (button) {
      button.disabled = false;

      button.innerHTML =
        "<span>Login to TradeSim</span><span>→</span>";
    }
  }
}


/* =========================================================
   SHOW TRADING APP
========================================================= */

function showTradingApp() {
  const authScreen =
    document.getElementById(
      "authScreen"
    );

  const appScreen =
    document.getElementById(
      "appScreen"
    );

  if (authScreen) {
    authScreen.style.display =
      "none";
  }

  if (appScreen) {
    appScreen.classList.remove(
      "hidden"
    );

    appScreen.style.display =
      "block";
  }

  const welcomeUser =
    document.getElementById(
      "welcomeUser"
    );

  if (
    welcomeUser &&
    currentUser
  ) {
    welcomeUser.textContent =
      currentUser.username ||
      "Trader";
  }

  renderDashboard();
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  /*
    Server-side logout will be added
    in the next backend step.

    For now we clear the local
    login indicator.
  */

  localStorage.removeItem(
    LOGIN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );

  currentUser = null;

  const appScreen =
    document.getElementById(
      "appScreen"
    );

  const authScreen =
    document.getElementById(
      "authScreen"
    );

  if (appScreen) {
    appScreen.style.display =
      "none";
  }

  if (authScreen) {
    authScreen.style.display =
      "flex";
  }

  showLogin();

  showToast(
    "You have been logged out.",
    "success"
  );
}


async function logoutTrader() {
  return logout();
}


/* =========================================================
   SESSION CHECK
========================================================= */

function checkLocalLogin() {
  const loggedIn =
    localStorage.getItem(
      LOGIN_KEY
    );

  const username =
    localStorage.getItem(
      USER_KEY
    );

  if (
    loggedIn === "true" &&
    username
  ) {
    currentUser = {
      username
    };

    showTradingApp();

  } else {
    const authScreen =
      document.getElementById(
        "authScreen"
      );

    const appScreen =
      document.getElementById(
        "appScreen"
      );

    if (authScreen) {
      authScreen.style.display =
        "flex";
    }

    if (appScreen) {
      appScreen.style.display =
        "none";
    }

    showLogin();
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const balanceElement =
    document.getElementById(
      "balance"
    );

  const portfolioElement =
    document.getElementById(
      "portfolio"
    );

  const unrealizedElement =
    document.getElementById(
      "unrealized"
    );

  const realizedElement =
    document.getElementById(
      "realized"
    );

  const totalPnlElement =
    document.getElementById(
      "totalPnl"
    );

  if (balanceElement) {
    balanceElement.textContent =
      money(state.cash);
  }

  if (portfolioElement) {
    portfolioElement.textContent =
      money(
        calculatePortfolioValue()
      );
  }

  if (unrealizedElement) {
    const value =
      calculateUnrealizedPnl();

    unrealizedElement.textContent =
      money(value);

    unrealizedElement.className =
      "stat-value " +
      (
        value >= 0
          ? "green"
          : "red"
      );
  }

  if (realizedElement) {
    const value =
      state.realizedPnl;

    realizedElement.textContent =
      money(value);

    realizedElement.className =
      "stat-value " +
      (
        value >= 0
          ? "green"
          : "red"
      );
  }

  if (totalPnlElement) {
    const value =
      calculateTotalPnl();

    totalPnlElement.textContent =
      money(value);

    totalPnlElement.className =
      "stat-value " +
      (
        value >= 0
          ? "green"
          : "red"
      );
  }

  renderMarket();
  renderPositions();
  renderOrders();
}


/* =========================================================
   MARKET
========================================================= */

function renderMarket() {
  const container =
    document.getElementById(
      "market"
    );

  if (!container)
    return;

  container.innerHTML = "";

  state.stocks.forEach(
    stock => {

      const change =
        stock.price -
        stock.previousClose;

      const percent =
        stock.previousClose
          ? (
              change /
              stock.previousClose
            ) * 100
          : 0;

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "stock-card";

      card.innerHTML = `
        <div class="stock-top">

          <div>
            <div class="stock-name">
              ${escapeHtml(stock.name)}
            </div>

            <div class="symbol">
              ${escapeHtml(stock.symbol)}
            </div>
          </div>

          <div>
            <div class="stock-price">
              ${money(stock.price)}
            </div>

            <div class="stock-change ${
              change >= 0
                ? "green"
                : "red"
            }">
              ${change >= 0 ? "+" : ""}
              ${money(change)}
              (${percent.toFixed(2)}%)
            </div>
          </div>

        </div>

        <div class="stock-actions">

          <button
            class="btn buy-btn"
            onclick="openOrder('${escapeAttribute(stock.symbol)}', 'BUY')"
          >
            BUY
          </button>

          <button
            class="btn sell-btn"
            onclick="openOrder('${escapeAttribute(stock.symbol)}', 'SELL')"
          >
            SELL
          </button>

        </div>
      `;

      container.appendChild(card);
    }
  );
}


/* =========================================================
   SAFE HTML HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}


/* =========================================================
   ORDER MODAL
========================================================= */

function openOrder(symbol, side) {
  const stock =
    getStock(symbol);

  if (!stock)
    return;

  const modal =
    document.getElementById(
      "orderModal"
    );

  const symbolElement =
    document.getElementById(
      "orderSymbol"
    );

  const sideElement =
    document.getElementById(
      "orderSide"
    );

  const quantityElement =
    document.getElementById(
      "orderQuantity"
    );

  const priceElement =
    document.getElementById(
      "orderPrice"
    );

  if (symbolElement) {
    symbolElement.textContent =
      `${stock.name} (${stock.symbol})`;
  }

  if (sideElement) {
    sideElement.value =
      side;
  }

  if (quantityElement) {
    quantityElement.value =
      1;
  }

  if (priceElement) {
    priceElement.value =
      Number(stock.price)
        .toFixed(2);
  }

  if (modal) {
    modal.classList.add("show");
  }

  updateEstimate();
}


function closeOrder() {
  const modal =
    document.getElementById(
      "orderModal"
    );

  if (modal) {
    modal.classList.remove(
      "show"
    );
  }
}


function updateEstimate() {
  const symbolText =
    document.getElementById(
      "orderSymbol"
    )?.textContent || "";

  const match =
    symbolText.match(
      /\((.*?)\)/
    );

  const symbol =
    match?.[1];

  if (!symbol)
    return;

  const stock =
    getStock(symbol);

  if (!stock)
    return;

  const quantity =
    Number(
      document.getElementById(
        "orderQuantity"
      )?.value
    ) || 0;

  const price =
    Number(
      document.getElementById(
        "orderPrice"
      )?.value
    ) || stock.price;

  const value =
    quantity * price;

  const estimate =
    document.getElementById(
      "estimatedValue"
    );

  if (estimate) {
    estimate.textContent =
      money(value);
  }
}


/* =========================================================
   EXECUTE SIMULATED ORDER
=====================================
