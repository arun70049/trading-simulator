const STORAGE_KEY = "tradesim_v2";

let state = loadState();
let currentUser = null;


/* =========================================================
   INITIAL STATE
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
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(error);
  }

  return createInitialState();
}


function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}


/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  return "₹" + Number(value).toLocaleString("en-IN", {
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
        (stock.price -
          position.averagePrice) *
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
   PASSWORD SHOW / HIDE
========================================================= */

function togglePassword(inputId, button) {

  const input =
    document.getElementById(inputId);

  if (!input) return;

  if (input.type === "password") {

    input.type = "text";
    button.textContent = "Hide";

  } else {

    input.type = "password";
    button.textContent = "Show";

  }

}


/* =========================================================
   AUTH MODE SWITCH
========================================================= */

function switchAuthMode() {

  const loginForm =
    document.getElementById("loginForm");

  const registerForm =
    document.getElementById("registerForm");

  const authTitle =
    document.getElementById("authTitle");

  const authSubtitle =
    document.getElementById("authSubtitle");

  const switchText =
    document.getElementById("switchText");

  const switchAuth =
    document.getElementById("switchAuth");

  if (
    !loginForm ||
    !registerForm
  ) return;


  const registerVisible =
    !registerForm.classList.contains("hidden");


  if (registerVisible) {

    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    loginForm.style.display = "block";
    registerForm.style.display = "none";

    authTitle.textContent =
      "Welcome back";

    authSubtitle.textContent =
      "Sign in to continue your trading simulation.";

    switchText.textContent =
      "New to TradeSim?";

    switchAuth.textContent =
      "Create account";

  } else {

    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");

    loginForm.style.display = "none";
    registerForm.style.display = "block";

    authTitle.textContent =
      "Create your trader account";

    authSubtitle.textContent =
      "Start with ₹1,00,000 simulated capital.";

    switchText.textContent =
      "Already have an account?";

    switchAuth.textContent =
      "Login";

  }

}


/* =========================================================
   AUTH MESSAGES
========================================================= */

function showMessage(id, message, success = false) {

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
    (success ? " success" : "");

}


function clearMessage(id) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent = "";
  element.className = "auth-message";

}


/* =========================================================
   REGISTER
========================================================= */

async function registerTrader(event) {

  if (event) {
    event.preventDefault();
  }

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

  clearMessage("registerMessage");


  if (!username || !password) {

    showMessage(
      "registerMessage",
      "Username and password are required."
    );

    return;

  }


  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {

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


  if (password !== confirmPassword) {

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

  button.disabled = true;

  button.innerHTML =
    "<span>Creating account...</span>";


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

          credentials: "same-origin",

          body: JSON.stringify({
            username,
            password
          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      showMessage(
        "registerMessage",
        data.error ||
        "Registration failed."
      );

      return;

    }


    showMessage(
      "registerMessage",
      "Account created successfully. You can now login.",
      true
    );


    document.getElementById(
      "registerPassword"
    ).value = "";

    document.getElementById(
      "registerConfirmPassword"
    ).value = "";


    setTimeout(() => {

      showLogin();

      document.getElementById(
        "loginUsername"
      ).value = username;

    }, 1200);


  } catch (error) {

    console.error(error);

    showMessage(
      "registerMessage",
      "Network error. Please try again."
    );

  } finally {

    button.disabled = false;

    button.innerHTML =
      "<span>Create Trader Account</span><span>→</span>";

  }

}


/* =========================================================
   LOGIN
========================================================= */

async function loginTrader(event) {

  if (event) {
    event.preventDefault();
  }

  const username =
    document.getElementById(
      "loginUsername"
    ).value.trim();

  const password =
    document.getElementById(
      "loginPassword"
    ).value;

  clearMessage("loginMessage");


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

  button.disabled = true;

  button.innerHTML =
    "<span>Logging in...</span>";


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

          credentials: "same-origin",

          body: JSON.stringify({
            username,
            password
          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      showMessage(
        "loginMessage",
        data.error ||
        "Login failed."
      );

      return;

    }


    currentUser =
      data.user;


    /*
      IMPORTANT:

      No localStorage login flag is created.

      Authentication is now controlled
      by the HttpOnly server session cookie.
    */


    showTradingApp();


  } catch (error) {

    console.error(error);

    showMessage(
      "loginMessage",
      "Network error. Please try again."
    );

  } finally {

    button.disabled = false;

    button.innerHTML =
      "<span>Login to TradeSim</span><span>→</span>";

  }

}


/* =========================================================
   SESSION VERIFICATION
========================================================= */

async function checkSession() {

  try {

    const response =
      await fetch(
        "/api/auth/me",
        {
          method: "GET",

          credentials:
            "same-origin",

          cache: "no-store"
        }
      );


    if (!response.ok) {

      showLoginScreen();
      return;

    }


    const data =
      await response.json();


    if (
      !data.authenticated ||
      !data.user
    ) {

      showLoginScreen();
      return;

    }


    currentUser =
      data.user;


    showTradingApp();


  } catch (error) {

    console.error(error);

    showLoginScreen();

  }

}


/* =========================================================
   SHOW LOGIN SCREEN
========================================================= */

function showLoginScreen() {

  currentUser = null;

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


  const welcomeUser =
    document.getElementById(
      "welcomeUser"
    );


  if (
    welcomeUser &&
    currentUser
  ) {

    welcomeUser.textContent =
      "Trader · " +
      currentUser.username;

  }


  renderDashboard();

}


/* =========================================================
   LOGIN VIEW
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

  const authTitle =
    document.getElementById(
      "authTitle"
    );

  const authSubtitle =
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


  if (authTitle) {

    authTitle.textContent =
      "Welcome back";

  }


  if (authSubtitle) {

    authSubtitle.textContent =
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


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  try {

    await fetch(
      "/api/auth/logout",
      {
        method: "POST",

        credentials:
          "same-origin"
      }
    );

  } catch (error) {

    console.error(error);

  }


  currentUser = null;

  showLoginScreen();

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
      (value >= 0
        ? "green"
        : "red");

  }


  if (realizedElement) {

    const value =
      state.realizedPnl;

    realizedElement.textContent =
      money(value);

    realizedElement.className =
      "stat-value " +
      (value >= 0
        ? "green"
        : "red");

  }


  if (totalPnlElement) {

    const value =
      calculateTotalPnl();

    totalPnlElement.textContent =
      money(value);

    totalPnlElement.className =
      "stat-value " +
      (value >= 0
        ? "green"
        : "red");

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

  if (!container) return;

  container.innerHTML = "";


  state.stocks.forEach(stock => {

    const change =
      stock.price -
      stock.previousClose;

    const percent =
      (
        change /
        stock.previousClose
      ) * 100;


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
            ${stock.name}
          </div>

          <div class="symbol">
            ${stock.symbol}
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
          onclick="openOrder('${stock.symbol}', 'BUY')"
        >
          BUY
        </button>

        <button
          class="btn sell-btn"
          onclick="openOrder('${stock.symbol}', 'SELL')"
        >
          SELL
        </button>

      </div>

    `;


    container.appendChild(card);

  });

}


/* =========================================================
   ORDER MODAL
========================================================= */

function openOrder(symbol, side) {

  const stock =
    getStock(symbol);

  if (!stock) return;


  const modal =
    document.getElementById(
      "orderModal"
    );


  document.getElementById(
    "orderSymbol"
  ).textContent =
    `${stock.name} (${stock.symbol})`;


  document.getElementById(
    "orderSide"
  ).value =
    side;


  document.getElementById(
    "orderQuantity"
  ).value =
    1;


  document.getElementById(
    "orderPrice"
  ).value =
    stock.price.toFixed(2);


  modal.classList.add("show");

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
    ).textContent;


  const symbol =
    symbolText.match(
      /\((.*?)\)/
    )?.[1];


  if (!symbol) return;


  const stock =
    getStock(symbol);


  const quantity =
    Number(
      document.getElementById(
        "orderQuantity"
      ).value
    ) || 0;


  const price =
    Number(
      document.getElementById(
        "orderPrice"
      ).value
    ) ||
    stock.price;


  const value =
    quantity * price;


  document.getElementById(
    "estimatedValue"
  ).textContent =
    money(value);

}


/* =========================================================
   EXECUTE ORDER
========================================================= */

function executeOrder() {

  const symbolText =
    document.getElementById(
      "orderSymbol"
    ).textContent;


  const symbol =
    symbolText.match(
      /\((.*?)\)/
    )?.[1];


  const side =
    document.getElementById(
      "orderSide"
    ).value;


  const quantity =
    Number(
      document.getElementById(
        "orderQuantity"
      ).value
    );


  const price =
    Number(
      document.getElementById(
        "orderPrice"
      ).value
    );


  const stock =
    getStock(symbol);


  if (!stock) {

    alert("Stock not found.");
    return;

  }


  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {

    alert(
      "Enter a valid quantity."
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


  const orderValue =
    quantity * price;


  if (side === "BUY") {

    if (
      orderValue >
      state.cash
    ) {

      alert(
        "Insufficient simulated funds.\n\n" +
        "Required: " +
        money(orderValue) +
        "\nAvailable: " +
        money(state.cash)
      );

      return;

    }


    state.cash -=
      orderValue;


    const existing =
      getPosition(symbol);


    if (existing) {

      const oldValue =
        existing.averagePrice *
        existing.quantity;

      const newValue =
        price *
        quantity;

      const totalQuantity =
        existing.quantity +
        quantity;


      existing.averagePrice =
        (
          oldValue +
          newValue
        ) /
        totalQuantity;


      existing.quantity =
        totalQuantity;

    } else {

      state.positions[symbol] = {

        symbol,

        quantity,

        averagePrice:
          price

      };

    }


  } else {

    const existing =
      getPosition(symbol);


    if (
      !existing ||
      existing.quantity <
      quantity
    ) {

      alert(
        "Insufficient simulated holdings.\n\n" +
        "You cannot sell more shares than you own."
      );

      return;

    }


    const pnl =
      (
        price -
        existing.averagePrice
      ) *
      quantity;


    state.cash +=
      orderValue;


    state.realizedPnl +=
      pnl;


    existing.quantity -=
      quantity;


    if (
      existing.quantity === 0
    ) {

      delete state.positions[
        symbol
      ];

    }

 
