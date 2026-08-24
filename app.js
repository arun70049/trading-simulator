let state = {
  cash: 100000,
  startingCapital: 100000,
  realizedPnl: 0,
  stocks: [],
  positions: {},
  orders: []
};

let currentUser = null;


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

  let value = Number(state.cash);

  Object.values(state.positions).forEach(position => {

    const stock = getStock(position.symbol);

    if (stock) {
      value +=
        Number(position.quantity) *
        Number(stock.price);
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
          Number(stock.price) -
          Number(position.averagePrice)
        ) *
        Number(position.quantity);

    }

  });

  return pnl;
}


function calculateTotalPnl() {

  return (
    Number(state.realizedPnl) +
    calculateUnrealizedPnl()
  );

}


/* =========================================================
   LOAD PORTFOLIO FROM D1
========================================================= */

async function loadPortfolio() {

  try {

    const response = await fetch(
      "/api/portfolio",
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      }
    );


    const data = await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Unable to load portfolio."
      );

    }


    state.cash =
      Number(data.account.cash);

    state.startingCapital =
      Number(data.account.startingCapital);

    state.realizedPnl =
      Number(data.account.realizedPnl);


    state.stocks =
      Array.isArray(data.stocks)
        ? data.stocks
        : [];


    state.positions = {};


    if (Array.isArray(data.positions)) {

      data.positions.forEach(position => {

        state.positions[position.symbol] = {

          symbol:
            position.symbol,

          quantity:
            Number(position.quantity),

          averagePrice:
            Number(position.averagePrice)

        };

      });

    }


    state.orders =
      Array.isArray(data.orders)
        ? data.orders
        : [];


    return true;

  } catch (error) {

    console.error(
      "LOAD PORTFOLIO ERROR:",
      error
    );

    alert(
      error.message ||
      "Unable to load your trading account."
    );

    return false;

  }

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

    button.textContent =
      "Hide";

  } else {

    input.type = "password";

    button.textContent =
      "Show";

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
    (success ? " success" : "");

}


function clearMessage(id) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent = "";

  element.className =
    "auth-message";

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
    !/^[A-Za-z0-9_]{3,30}$/.test(username)
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

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              username,
              password
            })
        }
      );


    const data =
      await response.json();


   if (!response.ok) {

  const errorMessage =
    data.details
      ? `${data.error || "Registration failed."} ${data.details}`
      : (
          data.error ||
          "Registration failed."
        );

  showMessage(
    "registerMessage",
    errorMessage
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

      const loginUsername =
        document.getElementById(
          "loginUsername"
        );

      if (loginUsername) {

        loginUsername.value =
          username;

      }

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

          credentials:
            "same-origin",

          body:
            JSON.stringify({
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

          cache:
            "no-store"
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


  const loaded =
    await loadPortfolio();


  if (!loaded) {
    return;
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


  state = {
    cash: 100000,
    startingCapital: 100000,
    realizedPnl: 0,
    stocks: [],
    positions: {},
    orders: []
  };


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
      (
        value >= 0
          ? "green"
          : "red"
      );

  }


  if (realizedElement) {

    const value =
      Number(state.realizedPnl);


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


  if (!container) return;


  container.innerHTML = "";


  state.stocks.forEach(stock => {

    const change =
      Number(stock.price) -
      Number(stock.previousClose);


    const percent =
      Number(stock.previousClose) !== 0
        ? (
            change /
            Number(stock.previousClose)
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


  if (!stock) {

    alert("Stock not found.");

    return;

  }


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
      Number(stock.price).toFixed(2);

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

}


function updateEstimate() {

  const symbolText =
    document.getElementById(
      "orderSymbol"
    )?.textContent || "";


  const symbol =
    symbolText.match(
      /\((.*?)\)/
    )?.[1];


  if (!symbol) return;


  const stock =
    getStock(symbol);


  if (!stock) return;


  const quantity =
    Number(
      document.getElementById(
        "orderQuantity"
      )?.value
    ) || 0;


  const priceInput =
    Number(
      document.getElementById(
        "orderPrice"
      )?.value
    );


  const price =
    Number.isFinite(priceInput) &&
    priceInput > 0
      ? priceInput
      : Number(stock.price);


  const value =
    quantity * price;


  const estimatedValue =
    document.getElementById(
      "estimatedValue"
    );


  if (estimatedValue) {

    estimatedValue.textContent =
      money(value);

  }

}



/* =========================================================
   EXECUTE ORDER — D1 API
========================================================= */

async function executeOrder() {

  const symbolText =
    document.getElementById(
      "orderSymbol"
    )?.textContent || "";


  const symbol =
    symbolText.match(
      /\((.*?)\)/
    )?.[1];


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


  if (!symbol) {

    alert("Stock not found.");

    return;

  }


  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {

    alert("Invalid order side.");

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
      "#orderModal .confirm-order, #orderModal .buy-btn, #orderModal .sell-btn, #orderModal button[type='submit']"
    );


  if (button) {

    button.disabled = true;

  }


  try {

    const response =
      await fetch(
        "/api/order",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              symbol,
              side,
              quantity,
              price
            })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Unable to execute order."
      );

    }


    closeOrder();


    const loaded =
      await loadPortfolio();


    if (!loaded) {
      return;
    }


    renderDashboard();


    alert(
      `${side} order executed successfully.\n\n` +
      `${symbol} × ${quantity}\n` +
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

      button.disabled = false;

    }

  }

}


/* =========================================================
   POSITIONS
========================================================= */

function renderPositions() {

  const container =
    document.getElementById(
      "positions"
    );


  if (!container) return;


  container.innerHTML = "";


  const positions =
    Object.values(state.positions);


  if (positions.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        No open positions.
      </div>
    `;

    return;

  }


  positions.forEach(position => {

    const stock =
      getStock(position.symbol);


    if (!stock) return;


    const marketValue =
      Number(position.quantity) *
      Number(stock.price);


    const pnl =
      (
        Number(stock.price) -
        Number(position.averagePrice)
      ) *
      Number(position.quantity);


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "position-row";


    row.innerHTML = `

      <div>
        <strong>
          ${position.symbol}
        </strong>

        <div class="muted">
          ${stock.name}
        </div>
      </div>


      <div>
        ${position.quantity}
      </div>


      <div>
        ${money(position.averagePrice)}
      </div>


      <div>
        ${money(stock.price)}
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

  });

}


/* =========================================================
   ORDERS
========================================================= */

function renderOrders() {

  const container =
    document.getElementById(
      "orders"
    );


  if (!container) return;


  container.innerHTML = "";


  if (
    !Array.isArray(state.orders) ||
    state.orders.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No orders yet.
      </div>
    `;

    return;

  }


  state.orders.forEach(order => {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "order-row";


    row.innerHTML = `

      <div>

        <strong>
          ${order.symbol}
        </strong>

        <div class="muted">
          ${order.time || ""}
        </div>

      </div>


      <div>
        ${order.quantity}
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

        ${order.side}

      </div>

    `;


    container.appendChild(row);

  });

}


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    checkSession();

  }
);
