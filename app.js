/* =========================================================
   TRADESIM — MODULAR CORE
   ---------------------------------------------------------
   PURPOSE:
   • Stable application bootstrap
   • Central state management
   • Authentication
   • Portfolio
   • Orders
   • Market rendering
   • Module/extension support
   • Future real-time market-data compatibility

   IMPORTANT:
   This file is intentionally designed as the CORE.
   Future features should preferably be added as modules,
   services or providers instead of repeatedly rewriting
   this file.
========================================================= */

"use strict";


/* =========================================================
   1. APPLICATION CONFIG
========================================================= */

const TradeSimConfig = Object.freeze({

  api: {
    portfolio: "/api/portfolio",
    register: "/api/auth/register",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    session: "/api/auth/me",
    order: "/api/order"
  },

  defaults: {
    startingCapital: 100000
  },

  market: {
    refreshInterval: 1000
  },

  debug: true

});


/* =========================================================
   2. CENTRAL APPLICATION STATE
========================================================= */

const TradeSimState = {

  cash: TradeSimConfig.defaults.startingCapital,

  startingCapital:
    TradeSimConfig.defaults.startingCapital,

  realizedPnl: 0,

  stocks: [],

  positions: {},

  orders: [],

  currentUser: null,

  market: {

    connected: false,

    source: "simulation",

    lastUpdate: null,

    updating: false

  },

  ui: {

    currentScreen: "auth",

    currentOrder: null

  },

  modules: {}

};


/* =========================================================
   3. STATE ACCESS
========================================================= */

function getState() {

  return TradeSimState;

}


function resetState() {

  TradeSimState.cash =
    TradeSimConfig.defaults.startingCapital;

  TradeSimState.startingCapital =
    TradeSimConfig.defaults.startingCapital;

  TradeSimState.realizedPnl = 0;

  TradeSimState.stocks = [];

  TradeSimState.positions = {};

  TradeSimState.orders = [];

  TradeSimState.currentUser = null;

  TradeSimState.market = {

    connected: false,

    source: "simulation",

    lastUpdate: null,

    updating: false

  };

  TradeSimState.ui = {

    currentScreen: "auth",

    currentOrder: null

  };

}


/* =========================================================
   4. EVENT BUS
   ---------------------------------------------------------
   Modules can communicate without directly modifying
   each other's code.
========================================================= */

const TradeSimEvents = {

  listeners: {},


  on(eventName, callback) {

    if (
      typeof callback !== "function"
    ) {
      return () => {};
    }


    if (
      !Array.isArray(
        this.listeners[eventName]
      )
    ) {

      this.listeners[eventName] = [];

    }


    this.listeners[eventName].push(
      callback
    );


    return () => {

      this.listeners[eventName] =
        this.listeners[eventName]
          .filter(
            listener =>
              listener !== callback
          );

    };

  },


  emit(eventName, payload) {

    const listeners =
      this.listeners[eventName] || [];


    listeners.forEach(
      listener => {

        try {

          listener(payload);

        } catch (error) {

          console.error(
            `TradeSim event error [${eventName}]`,
            error
          );

        }

      }
    );

  }

};


/* =========================================================
   5. MODULE REGISTRY
   ---------------------------------------------------------
   Future modules can register themselves here.

   Example future:
   TradeSim.registerModule("watchlist", {...});
========================================================= */

const TradeSim = {

  registerModule(name, module) {

    if (
      !name ||
      !module
    ) {

      console.warn(
        "Invalid TradeSim module."
      );

      return;

    }


    if (
      TradeSimState.modules[name]
    ) {

      console.warn(
        `Module already registered: ${name}`
      );

      return;

    }


    TradeSimState.modules[name] =
      module;


    if (
      typeof module.init === "function"
    ) {

      try {

        module.init({
          state: TradeSimState,
          events: TradeSimEvents,
          config: TradeSimConfig
        });

      } catch (error) {

        console.error(
          `Module initialization failed: ${name}`,
          error
        );

      }

    }


    TradeSimEvents.emit(
      "module:registered",
      {
        name,
        module
      }
    );

  },


  getModule(name) {

    return TradeSimState.modules[name] || null;

  }

};


/* =========================================================
   6. GENERAL HELPERS
========================================================= */

function money(value) {

  const number =
    Number(value);


  if (!Number.isFinite(number)) {

    return "₹0.00";

  }


  return "₹" +
    number.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

}


function number(value) {

  const result =
    Number(value);


  return Number.isFinite(result)
    ? result
    : 0;

}


function getStock(symbol) {

  return TradeSimState.stocks.find(
    stock =>
      stock.symbol === symbol
  ) || null;

}


function getPosition(symbol) {

  return (
    TradeSimState.positions[symbol]
    || null
  );

}


/* =========================================================
   7. PORTFOLIO CALCULATIONS
========================================================= */

function calculatePortfolioValue() {

  let value =
    number(TradeSimState.cash);


  Object.values(
    TradeSimState.positions
  ).forEach(position => {

    const stock =
      getStock(position.symbol);


    if (!stock) return;


    value +=
      number(position.quantity) *
      number(stock.price);

  });


  return value;

}


function calculateUnrealizedPnl() {

  let pnl = 0;


  Object.values(
    TradeSimState.positions
  ).forEach(position => {

    const stock =
      getStock(position.symbol);


    if (!stock) return;


    pnl +=
      (
        number(stock.price) -
        number(position.averagePrice)
      ) *
      number(position.quantity);

  });


  return pnl;

}


function calculateTotalPnl() {

  return (
    number(TradeSimState.realizedPnl) +
    calculateUnrealizedPnl()
  );

}


/* =========================================================
   8. API CLIENT
========================================================= */

const TradeSimAPI = {

  async request(
    url,
    options = {}
  ) {

    const response =
      await fetch(
        url,
        {
          credentials:
            "same-origin",

          cache:
            "no-store",

          ...options,

          headers: {
            "Content-Type":
              "application/json",

            ...(options.headers || {})
          }

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

      const error =
        new Error(
          data.error ||
          "Request failed."
        );


      error.status =
        response.status;


      error.data =
        data;


      throw error;

    }


    return data;

  },


  get(url) {

    return this.request(
      url,
      {
        method: "GET"
      }
    );

  },


  post(
    url,
    body
  ) {

    return this.request(
      url,
      {
        method: "POST",

        body:
          JSON.stringify(body)
      }
    );

  }

};


/* =========================================================
   9. PORTFOLIO LOADING
========================================================= */

async function loadPortfolio() {

  try {

    const data =
      await TradeSimAPI.get(
        TradeSimConfig.api.portfolio
      );


    if (!data.account) {

      throw new Error(
        "Invalid portfolio response."
      );

    }


    TradeSimState.cash =
      number(
        data.account.cash
      );


    TradeSimState.startingCapital =
      number(
        data.account.startingCapital
      );


    TradeSimState.realizedPnl =
      number(
        data.account.realizedPnl
      );


    TradeSimState.stocks =
      Array.isArray(data.stocks)
        ? data.stocks
        : [];


    TradeSimState.positions = {};


    if (
      Array.isArray(data.positions)
    ) {

      data.positions.forEach(
        position => {

          TradeSimState.positions[
            position.symbol
          ] = {

            symbol:
              position.symbol,

            quantity:
              number(
                position.quantity
              ),

            averagePrice:
              number(
                position.averagePrice
              )

          };

        }
      );

    }


    TradeSimState.orders =
      Array.isArray(data.orders)
        ? data.orders
        : [];


    TradeSimState.market.connected =
      true;

    TradeSimState.market.lastUpdate =
      Date.now();


    TradeSimEvents.emit(
      "portfolio:updated",
      TradeSimState
    );


    return true;

  } catch (error) {

    console.error(
      "LOAD PORTFOLIO ERROR:",
      error
    );


    TradeSimState.market.connected =
      false;


    alert(
      error.message ||
      "Unable to load your trading account."
    );


    return false;

  }

}


/* =========================================================
   10. AUTH — PASSWORD
========================================================= */

function togglePassword(
  inputId,
  button
) {

  const input =
    document.getElementById(
      inputId
    );


  if (!input) return;


  if (
    input.type === "password"
  ) {

    input.type = "text";

    button.textContent =
      "Hide";

  } else {

    input.type = "password";

    button.textContent =
      "Show";

  }

}


/* =========================================================
   11. AUTH — MESSAGES
========================================================= */

function showMessage(
  id,
  message,
  success = false
) {

  const element =
    document.getElementById(id);


  if (!element) {

    alert(message);

    return;

  }


  element.textContent =
    message;


  element.className =
    "auth-message" +
    (
      success
        ? " success"
        : ""
    );

}


function clearMessage(id) {

  const element =
    document.getElementById(id);


  if (!element) return;


  element.textContent =
    "";


  element.className =
    "auth-message";

}


/* =========================================================
   12. AUTH MODE
========================================================= */

function showLogin() {

  const loginForm =
    document.getElementById(
      "loginForm"
    );


  const registerForm =
    document.getElementById(
      "registerForm"
    );


  if (loginForm) {

    loginForm.classList.remove(
      "hidden"
    );

    loginForm.style.display =
      "block";

  }


  if (registerForm) {

    registerForm.classList.add(
      "hidden"
    );

    registerForm.style.display =
      "none";

  }


  const title =
    document.getElementById(
      "authTitle"
    );


  const subtitle =
    document.getElementById(
      "authSubtitle"
    );


  const switchText =
    document.getElementById(
      "switchText"
    );


  const switchAuth =
    document.getElementById(
      "switchAuth"
    );


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


  if (switchAuth) {

    switchAuth.textContent =
      "Create account";

  }

}


function switchAuthMode() {

  const registerForm =
    document.getElementById(
      "registerForm"
    );


  if (!registerForm) return;


  const registerVisible =
    !registerForm.classList.contains(
      "hidden"
    );


  if (registerVisible) {

    showLogin();

    return;

  }


  const loginForm =
    document.getElementById(
      "loginForm"
    );


  if (loginForm) {

    loginForm.classList.add(
      "hidden"
    );

    loginForm.style.display =
      "none";

  }


  registerForm.classList.remove(
    "hidden"
  );

  registerForm.style.display =
    "block";


  const title =
    document.getElementById(
      "authTitle"
    );


  const subtitle =
    document.getElementById(
      "authSubtitle"
    );


  const switchText =
    document.getElementById(
      "switchText"
    );


  const switchAuth =
    document.getElementById(
      "switchAuth"
    );


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


  if (switchAuth) {

    switchAuth.textContent =
      "Login";

  }

}


/* =========================================================
   13. REGISTER
========================================================= */

async function registerTrader(event) {

  if (event) {

    event.preventDefault();

  }


  const username =
    document.getElementById(
      "registerUsername"
    )?.value.trim();


  const password =
    document.getElementById(
      "registerPassword"
    )?.value;


  const confirmPassword =
    document.getElementById(
      "registerConfirmPassword"
    )?.value;


  clearMessage(
    "registerMessage"
  );


  if (!username || !password) {

    showMessage(
      "registerMessage",
      "Username and password are required."
    );

    return;

  }


  if (
    !/^[A-Za-z0-9_]{3,30}$/.test(
      username
    )
  ) {

    showMessage(
      "registerMessage",
      "Username must be 3–30 characters and contain only letters, numbers and _."
    );

    return;

  }


  if (password.length < 8) {

    showMessage(
      "registerMessage",
      "Password must be at least 8 characters."
    );

    return;

  }


  if (
    password !== confirmPassword
  ) {

    showMessage(
      "registerMessage",
      "Passwords do not match."
    );

    return;

  }


  const button =
    document.getElementById(
      "registerButton"
    );


  if (button) {

    button.disabled = true;

    button.innerHTML =
      "<span>Creating account...</span>";

  }


  try {

    await TradeSimAPI.post(
      TradeSimConfig.api.register,
      {
        username,
        password
      }
    );


    showMessage(
      "registerMessage",
      "Account created successfully. You can now login.",
      true
    );


    const passwordInput =
      document.getElementById(
        "registerPassword"
      );


    const confirmInput =
      document.getElementById(
        "registerConfirmPassword"
      );


    if (passwordInput) {

      passwordInput.value =
        "";

    }


    if (confirmInput) {

      confirmInput.value =
        "";

    }


    setTimeout(
      () => {

        showLogin();


        const loginUsername =
          document.getElementById(
            "loginUsername"
          );


        if (loginUsername) {

          loginUsername.value =
            username;

        }

      },
      1000
    );


  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );


    const message =
      error.data?.details
        ? `${error.data.error || "Registration failed."} ${error.data.details}`
        : (
            error.message ||
            "Registration failed."
          );


    showMessage(
      "registerMessage",
      message
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
   14. LOGIN
========================================================= */

async function loginTrader(event) {

  if (event) {

    event.preventDefault();

  }


  const username =
    document.getElementById(
      "loginUsername"
    )?.value.trim();


  const password =
    document.getElementById(
      "loginPassword"
    )?.value;


  clearMessage(
    "loginMessage"
  );


  if (!username || !password) {

    showMessage(
      "loginMessage",
      "Enter username and password."
    );

    return;

  }


  const button =
    document.getElementById(
      "loginButton"
    );


  if (button) {

    button.disabled = true;

    button.innerHTML =
      "<span>Logging in...</span>";

  }


  try {

    const data =
      await TradeSimAPI.post(
        TradeSimConfig.api.login,
        {
          username,
          password
        }
      );


    TradeSimState.currentUser =
      data.user;


    TradeSimEvents.emit(
      "auth:login",
      data.user
    );


    await showTradingApp();


  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );


    showMessage(
      "loginMessage",
      error.message ||
      "Login failed."
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
   15. SESSION
========================================================= */

async function checkSession() {

  try {

    const data =
      await TradeSimAPI.get(
        TradeSimConfig.api.session
      );


    if (
      !data.authenticated ||
      !data.user
    ) {

      showLoginScreen();

      return;

    }


    TradeSimState.currentUser =
      data.user;


    await showTradingApp();


  } catch (error) {

    console.error(
      "SESSION ERROR:",
      error
    );


    showLoginScreen();

  }

}


/* =========================================================
   16. SCREEN MANAGEMENT
========================================================= */

function showLoginScreen() {

  TradeSimState.currentUser =
    null;


  TradeSimState.ui.currentScreen =
    "auth";


  const authScreen =
    document.getElementById(
      "authScreen"
    );


  const appScreen =
    document.getElementById(
      "appScreen"
    );


  if (authScreen) {

    authScreen.classList.remove(
      "hidden"
    );

    authScreen.style.display =
      "flex";

  }


  if (appScreen) {

    appScreen.classList.add(
      "hidden"
    );

    appScreen.style.display =
      "none";

  }


  showLogin();

}


async function showTradingApp() {

  const authScreen =
    document.getElementById(
      "authScreen"
    );


  const appScreen =
    document.getElementById(
      "appScreen"
    );


  if (authScreen) {

    authScreen.classList.add(
      "hidden"
    );

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


  TradeSimState.ui.currentScreen =
    "app";


  const welcomeUser =
    document.getElementById(
      "welcomeUser"
    );


  if (
    welcomeUser &&
    TradeSimState.currentUser
  ) {

    welcomeUser.textContent =
      "Trader · " +
      TradeSimState.currentUser.username;

  }


  const loaded =
    await loadPortfolio();


  if (!loaded) {

    return;

  }


  renderDashboard();

}


/* =========================================================
   17. LOGOUT
========================================================= */

async function logout() {

  try {

    await TradeSimAPI.post(
      TradeSimConfig.api.logout,
      {}
    );

  } catch (error) {

    console.error(
      "LOGOUT ERR
