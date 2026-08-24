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
      "LOGOUT ERROR:",
      error
    );

  }


  resetState();


  TradeSimEvents.emit(
    "auth:logout"
  );


  showLoginScreen();

}


/* =========================================================
   18. DASHBOARD
========================================================= */

function renderDashboard() {

  renderAccount();

  renderMarket();

  renderPositions();

  renderOrders();


  TradeSimEvents.emit(
    "dashboard:rendered"
  );

}


function renderAccount() {

  const balance =
    document.getElementById(
      "balance"
    );


  const portfolio =
    document.getElementById(
      "portfolio"
    );


  const unrealized =
    document.getElementById(
      "unrealized"
    );


  const realized =
    document.getElementById(
      "realized"
    );


  const total =
    document.getElementById(
      "totalPnl"
    );


  if (balance) {

    balance.textContent =
      money(
        TradeSimState.cash
      );

  }


  if (portfolio) {

    portfolio.textContent =
      money(
        calculatePortfolioValue()
      );

  }


  updatePnlElement(
    unrealized,
    calculateUnrealizedPnl()
  );


  updatePnlElement(
    realized,
    number(
      TradeSimState.realizedPnl
    )
  );


  updatePnlElement(
    total,
    calculateTotalPnl()
  );

}


function updatePnlElement(
  element,
  value
) {

  if (!element) return;


  element.textContent =
    money(value);


  element.className =
    "stat-value " +
    (
      value >= 0
        ? "green"
        : "red"
    );

}


/* =========================================================
   19. MARKET RENDERER
========================================================= */

function renderMarket() {

  const container =
    document.getElementById(
      "market"
    );


  if (!container) return;


  container.innerHTML =
    "";


  TradeSimState.stocks.forEach(
    stock => {

      const price =
        number(stock.price);


      const previousClose =
        number(
          stock.previousClose
        );


      const change =
        price -
        previousClose;


      const percent =
        previousClose !== 0
          ? (
              change /
              previousClose
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
              ${escapeHTML(stock.name || "")}
            </div>

            <div class="symbol">
              ${escapeHTML(stock.symbol || "")}
            </div>

          </div>

          <div>

            <div class="stock-price">
              ${money(price)}
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
   20. ORDER MODAL
========================================================= */

function openOrder(
  symbol,
  side
) {

  const stock =
    getStock(symbol);


  if (!stock) {

    alert("Stock not found.");

    return;

  }


  TradeSimState.ui.currentOrder = {

    symbol,
    side

  };


  const modal =
    document.getElementById(
      "orderModal"
    );


  if (!modal) return;


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
      number(
        stock.price
      ).toFixed(2);

  }


  modal.classList.add(
    "show"
  );


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


  TradeSimState.ui.currentOrder =
    null;

}


/* =========================================================
   21. ORDER ESTIMATE
========================================================= */

function updateEstimate() {

  const current =
    TradeSimState.ui.currentOrder;


  if (!current) return;


  const stock =
    getStock(current.symbol);


  if (!stock) return;


  const quantity =
    number(
      document.getElementById(
        "orderQuantity"
      )?.value
    );


  const inputPrice =
    number(
      document.getElementById(
        "orderPrice"
      )?.value
    );


  const price =
    inputPrice > 0
      ? inputPrice
      : number(stock.price);


  const value =
    quantity * price;


  const element =
    document.getElementById(
      "estimatedValue"
    );


  if (element) {

    element.textContent =
      money(value);

  }

}


/* =========================================================
   22. EXECUTE ORDER
========================================================= */

async function executeOrder() {

  const current =
    TradeSimState.ui.currentOrder;


  if (!current) {

    alert(
      "No order selected."
    );

    return;

  }


  const side =
    document.getElementById(
      "orderSide"
    )?.value;


  const quantity =
    Number(
      document.getElementById(
        "orderQuantity"
      )?.value
    );


  const price =
    Number(
      document.getElementById(
        "orderPrice"
      )?.value
    );


  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {

    alert(
      "Invalid order side."
    );

    return;

  }


  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {

    alert(
      "Quantity must be a positive whole number."
    );

    return;

  }


  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert(
      "Enter a valid price."
    );

    return;

  }


  const button =
    document.querySelector(
      "#orderModal .confirm-btn"
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Processing...";

  }


  try {

    await TradeSimAPI.post(
      TradeSimConfig.api.order,
      {
        symbol:
          current.symbol,

        side,

        quantity,

        price
      }
    );


    closeOrder();


    const loaded =
      await loadPortfolio();


    if (!loaded) {

      return;

    }


    renderDashboard();


    TradeSimEvents.emit(
      "order:executed",
      {
        symbol:
          current.symbol,

        side,

        quantity,

        price
      }
    );


    alert(
      `${side} order executed successfully.\n\n` +
      `${current.symbol} × ${quantity}\n` +
      `Price: ${money(price)}\n` +
      `Value: ${money(quantity * price)}`
    );


  } catch (error) {

    console.error(
      "EXECUTE ORDER ERROR:",
      error
    );


    alert(
      error.message ||
      "Unable to execute order."
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Confirm Order";

    }

  }

}


/* =========================================================
   23. POSITIONS
========================================================= */

function renderPositions() {

  const container =
    document.getElementById(
      "positions"
    );


  if (!container) return;


  container.innerHTML =
    "";


  const positions =
    Object.values(
      TradeSimState.positions
    );


  if (!positions.length) {

    container.innerHTML = `
      <div class="empty-state">
        No open positions.
      </div>
    `;

    return;

  }


  positions.forEach(
    position => {

      const stock =
        getStock(
          position.symbol
        );


      if (!stock) return;


      const quantity =
        number(
          position.quantity
        );


      const averagePrice =
        number(
          position.averagePrice
        );


      const currentPrice =
        number(
          stock.price
        );


      const marketValue =
        quantity *
        currentPrice;


      const pnl =
        (
          currentPrice -
          averagePrice
        ) *
        quantity;


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "position-row";


      row.innerHTML = `

        <div>

          <strong>
            ${escapeHTML(position.symbol)}
          </strong>

          <div class="muted">
            ${escapeHTML(stock.name || "")}
          </div>

        </div>

        <div>
          ${quantity}
        </div>

        <div>
          ${money(averagePrice)}
        </div>

        <div>
          ${money(currentPrice)}
        </div>

        <div>
          ${money(marketValue)}
        </div>

        <div class="${
          pnl >= 0
            ? "green"
            : "red"
        }">

          ${pnl >= 0 ? "+" : ""}
          ${money(pnl)}

        </div>

      `;


      container.appendChild(row);

    }
  );

}


/* =========================================================
   24. ORDERS
========================================================= */

function renderOrders() {

  const container =
    document.getElementById(
      "orders"
    );


  if (!container) return;


  container.innerHTML =
    "";


  if (
    !Array.isArray(
      TradeSimState.orders
    ) ||
    !TradeSimState.orders.length
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No orders yet.
      </div>
    `;

    return;

  }


  TradeSimState.orders.forEach(
    order => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "order-row";


      row.innerHTML = `

        <div>

          <strong>
            ${escapeHTML(order.symbol || "")}
          </strong>

          <div class="muted">
            ${escapeHTML(order.time || "")}
          </div>

        </div>

        <div>
          ${number(order.quantity)}
        </div>

        <div>
          ${money(order.price)}
        </div>

        <div>
          ${money(order.value)}
        </div>

        <div class="${
          order.side === "BUY"
            ? "red"
            : "green"
        }">

          ${escapeHTML(order.side || "")}

        </div>

      `;


      container.appendChild(row);

    }
  );

       }
       /* =========================================================
   25. REAL-TIME MARKET DATA INTERFACE
   ---------------------------------------------------------
   IMPORTANT:

   This does NOT pretend to provide exchange real-time data.

   It creates the interface required for a future legitimate
   market-data provider.

   The rest of TradeSim does not need to know whether data
   comes from:
   • simulation
   • polling
   • WebSocket
   • another legal provider
========================================================= */

const MarketDataEngine = {

  provider: null,

  connected: false,

  async connect(provider) {

    if (
      !provider ||
      typeof provider.connect !== "function"
    ) {

      console.warn(
        "Invalid market data provider."
      );

      return false;

    }


    this.provider =
      provider;


    try {

      await provider.connect({

        onSnapshot:
          stocks =>
            this.applySnapshot(stocks),

        onPrice:
          update =>
            this.applyPriceUpdate(update),

        onStatus:
          status =>
            this.handleStatus(status),

        onError:
          error =>
            console.error(
              "Market provider error:",
              error
            )

      });


      this.connected =
        true;


      TradeSimState.market.connected =
        true;


      TradeSimState.market.source =
        provider.name ||
        "unknown";


      return true;

    } catch (error) {

      console.error(
        "MARKET DATA CONNECTION ERROR:",
        error
      );


      this.connected =
        false;


      TradeSimState.market.connected =
        false;


      return false;

    }

  },


  disconnect() {

    if (
      this.provider &&
      typeof this.provider.disconnect ===
        "function"
    ) {

      this.provider.disconnect();

    }


    this.connected =
      false;


    TradeSimState.market.connected =
      false;

  },


  applySnapshot(stocks) {

    if (
      !Array.isArray(stocks)
    ) {

      return;

    }


    TradeSimState.stocks =
      stocks;


    TradeSimState.market.lastUpdate =
      Date.now();


    renderDashboard();


    TradeSimEvents.emit(
      "market:snapshot",
      stocks
    );

  },


  applyPriceUpdate(update) {

    if (
      !update ||
      !update.symbol
    ) {

      return;

    }


    const stock =
      getStock(
        update.symbol
      );


    if (!stock) {

      return;

    }


    if (
      update.price !== undefined
    ) {

      stock.price =
        number(update.price);

    }


    if (
      update.previousClose !==
      undefined
    ) {

      stock.previousClose =
        number(
          update.previousClose
        );

    }


    TradeSimState.market.lastUpdate =
      Date.now();


    renderAccount();

    renderMarket();

    renderPositions();


    TradeSimEvents.emit(
      "market:price",
      update
    );

  },


  handleStatus(status) {

    TradeSimState.market.connected =
      Boolean(
        status?.connected
      );


    TradeSimEvents.emit(
      "market:status",
      status
    );

  }

};


/* =========================================================
   26. SAFE HTML HELPERS
========================================================= */

function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(value) {

  return String(value)
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /'/g,
      "\\'"
    );

}


/* =========================================================
   27. FUTURE FEATURE API
   ---------------------------------------------------------
   New feature modules can communicate with the application
   through this interface instead of editing the core.
========================================================= */

window.TradeSimCore = {

  config:
    TradeSimConfig,

  state:
    TradeSimState,

  events:
    TradeSimEvents,

  api:
    TradeSimAPI,

  market:
    MarketDataEngine,

  registerModule:
    TradeSim.registerModule,

  getModule:
    TradeSim.getModule,

  helpers: {

    money,

    number,

    getStock,

    getPosition

  }

};


/* =========================================================
   28. GLOBAL COMPATIBILITY
   ---------------------------------------------------------
   Existing HTML onclick handlers continue working.
========================================================= */

window.money =
  money;

window.getStock =
  getStock;

window.getPosition =
  getPosition;

window.calculatePortfolioValue =
  calculatePortfolioValue;

window.calculateUnrealizedPnl =
  calculateUnrealizedPnl;

window.calculateTotalPnl =
  calculateTotalPnl;

window.togglePassword =
  togglePassword;

window.switchAuthMode =
  switchAuthMode;

window.registerTrader =
  registerTrader;

window.loginTrader =
  loginTrader;

window.checkSession =
  checkSession;

window.showLoginScreen =
  showLoginScreen;

window.showTradingApp =
  showTradingApp;

window.logout =
  logout;

window.renderDashboard =
  renderDashboard;

window.renderMarket =
  renderMarket;

window.openOrder =
  openOrder;

window.closeOrder =
  closeOrder;

window.updateEstimate =
  updateEstimate;

window.executeOrder =
  executeOrder;

window.renderPositions =
  renderPositions;

window.renderOrders =
  renderOrders;


/* =========================================================
   29. AUTOMATIC UI ESTIMATE EVENTS
========================================================= */

document.addEventListener(
  "input",
  event => {

    if (
      event.target?.id ===
        "orderQuantity" ||
      event.target?.id ===
        "orderPrice"
    ) {

      updateEstimate();

    }

  }
);


/* =========================================================
   30. STARTUP
========================================================= */

async function bootTradeSim() {

  try {

    console.log(
      "TradeSim starting..."
    );


    TradeSimEvents.emit(
      "app:starting"
    );


    await checkSession();


    TradeSimEvents.emit(
      "app:ready"
    );


    console.log(
      "TradeSim ready."
    );

  } catch (error) {

    console.error(
      "TradeSim startup error:",
      error
    );


    showLoginScreen();

  }

}


/* =========================================================
   DOM READY
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    bootTradeSim
  );

} else {

  bootTradeSim();

}
