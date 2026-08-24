const STORAGE_KEY = "tradesim_v2";

let state = loadState();

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return "₹" + Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getStock(symbol) {
  return state.stocks.find(stock => stock.symbol === symbol);
}

function getPosition(symbol) {
  return state.positions[symbol] || null;
}

function calculatePortfolioValue() {
  let value = state.cash;

  Object.values(state.positions).forEach(position => {
    const stock = getStock(position.symbol);

    if (stock) {
      value += position.quantity * stock.price;
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
        (stock.price - position.averagePrice) *
        position.quantity;
    }
  });

  return pnl;
}

function calculateTotalPnl() {
  return state.realizedPnl + calculateUnrealizedPnl();
}

function renderDashboard() {

  const balanceElement = document.getElementById("balance");
  const portfolioElement = document.getElementById("portfolio");
  const unrealizedElement = document.getElementById("unrealized");
  const realizedElement = document.getElementById("realized");
  const totalPnlElement = document.getElementById("totalPnl");

  if (balanceElement) {
    balanceElement.textContent = money(state.cash);
  }

  if (portfolioElement) {
    portfolioElement.textContent =
      money(calculatePortfolioValue());
  }

  if (unrealizedElement) {
    const value = calculateUnrealizedPnl();

    unrealizedElement.textContent = money(value);
    unrealizedElement.className =
      "stat-value " + (value >= 0 ? "green" : "red");
  }

  if (realizedElement) {
    const value = state.realizedPnl;

    realizedElement.textContent = money(value);
    realizedElement.className =
      "stat-value " + (value >= 0 ? "green" : "red");
  }

  if (totalPnlElement) {
    const value = calculateTotalPnl();

    totalPnlElement.textContent = money(value);
    totalPnlElement.className =
      "stat-value " + (value >= 0 ? "green" : "red");
  }

  renderMarket();
  renderPositions();
  renderOrders();
}

function renderMarket() {

  const container = document.getElementById("market");

  if (!container) return;

  container.innerHTML = "";

  state.stocks.forEach(stock => {

    const change =
      stock.price - stock.previousClose;

    const percent =
      (change / stock.previousClose) * 100;

    const card = document.createElement("div");

    card.className = "stock-card";

    card.innerHTML = `
      <div class="stock-top">

        <div>
          <div class="stock-name">${stock.name}</div>
          <div class="symbol">${stock.symbol}</div>
        </div>

        <div>
          <div class="stock-price">
            ${money(stock.price)}
          </div>

          <div class="stock-change ${change >= 0 ? "green" : "red"}">
            ${change >= 0 ? "+" : ""}
            ${money(change)}
            (${percent.toFixed(2)}%)
          </div>
        </div>

      </div>

      <div class="stock-actions">

        <button
          class="btn buy-btn"
          onclick="openOrder('${stock.symbol}', 'BUY')">
          BUY
        </button>

        <button
          class="btn sell-btn"
          onclick="openOrder('${stock.symbol}', 'SELL')">
          SELL
        </button>

      </div>
    `;

    container.appendChild(card);
  });
}

function openOrder(symbol, side) {

  const stock = getStock(symbol);

  if (!stock) return;

  const modal = document.getElementById("orderModal");

  document.getElementById("orderSymbol").textContent =
    `${stock.name} (${stock.symbol})`;

  document.getElementById("orderSide").value = side;

  document.getElementById("orderQuantity").value = 1;

  document.getElementById("orderPrice").value =
    stock.price.toFixed(2);

  modal.classList.add("show");

  updateEstimate();
}

function closeOrder() {
  document
    .getElementById("orderModal")
    .classList.remove("show");
}

function updateEstimate() {

  const symbolText =
    document.getElementById("orderSymbol").textContent;

  const symbol =
    symbolText.match(/\((.*?)\)/)?.[1];

  if (!symbol) return;

  const stock = getStock(symbol);

  const quantity =
    Number(document.getElementById("orderQuantity").value) || 0;

  const price =
    Number(document.getElementById("orderPrice").value) ||
    stock.price;

  const value = quantity * price;

  document.getElementById("estimatedValue").textContent =
    money(value);
}

function executeOrder() {

  const symbolText =
    document.getElementById("orderSymbol").textContent;

  const symbol =
    symbolText.match(/\((.*?)\)/)?.[1];

  const side =
    document.getElementById("orderSide").value;

  const quantity =
    Number(document.getElementById("orderQuantity").value);

  const price =
    Number(document.getElementById("orderPrice").value);

  const stock = getStock(symbol);

  if (!stock) {
    alert("Stock not found.");
    return;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    alert("Enter a valid quantity.");
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    alert("Enter a valid price.");
    return;
  }

  const orderValue = quantity * price;

  if (side === "BUY") {

    if (orderValue > state.cash) {
      alert(
        "Insufficient simulated funds.\n\n" +
        "Required: " + money(orderValue) +
        "\nAvailable: " + money(state.cash)
      );

      return;
    }

    state.cash -= orderValue;

    const existing =
      getPosition(symbol);

    if (existing) {

      const oldValue =
        existing.averagePrice * existing.quantity;

      const newValue =
        price * quantity;

      const totalQuantity =
        existing.quantity + quantity;

      existing.averagePrice =
        (oldValue + newValue) /
        totalQuantity;

      existing.quantity =
        totalQuantity;

    } else {

      state.positions[symbol] = {
        symbol,
        quantity,
        averagePrice: price
      };

    }

  } else {

    const existing =
      getPosition(symbol);

    if (!existing || existing.quantity < quantity) {

      alert(
        "Insufficient simulated holdings.\n\n" +
        "You cannot sell more shares than you own."
      );

      return;
    }

    const pnl =
      (price - existing.averagePrice) *
      quantity;

    state.cash += orderValue;

    state.realizedPnl += pnl;

    existing.quantity -= quantity;

    if (existing.quantity === 0) {
      delete state.positions[symbol];
    }
  }

  const order = {
    id: "ORD-" + Date.now(),
    time: new Date().toLocaleString("en-IN"),
    symbol,
    side,
    quantity,
    price,
    value: orderValue
  };

  state.orders.unshift(order);

  saveState();

  closeOrder();

  renderDashboard();

  alert(
    "SIMULATED ORDER EXECUTED\n\n" +
    side + " " +
    quantity + " × " +
    symbol +
    "\nPrice: " +
    money(price) +
    "\nOrder Value: " +
    money(orderValue)
  );
}

function renderPositions() {

  const container =
    document.getElementById("positions");

  if (!container) return;

  const positions =
    Object.values(state.positions);

  if (positions.length === 0) {

    container.innerHTML =
      `<div class="empty">
        No open positions
      </div>`;

    return;
  }

  container.innerHTML = "";

  positions.forEach(position => {

    const stock =
      getStock(position.symbol);

    if (!stock) return;

    const pnl =
      (stock.price - position.averagePrice) *
      position.quantity;

    const value =
      stock.price * position.quantity;

    const card =
      document.createElement("div");

    card.className =
      "portfolio-card";

    card.innerHTML = `
      <div class="position-row">

        <div class="position-main">

          <strong>${stock.name}</strong>

          <small>
            ${position.symbol}
            · ${position.quantity} shares
          </small>

          <small>
            Avg. ₹${position.averagePrice.toFixed(2)}
          </small>

        </div>

        <div style="text-align:right">

          <strong>${money(value)}</strong>

          <div class="${pnl >= 0 ? "green" : "red"}">
            ${pnl >= 0 ? "+" : ""}
            ${money(pnl)}
          </div>

        </div>

      </div>
    `;

    container.appendChild(card);
  });
}

function renderOrders() {

  const container =
    document.getElementById("orders");

  if (!container) return;

  if (state.orders.length === 0) {

    container.innerHTML =
      `<div class="empty">
        No orders yet
      </div>`;

    return;
  }

  container.innerHTML = "";

  state.orders.slice(0, 30).forEach(order => {

    const card =
      document.createElement("div");

    card.className =
      "order-card";

    card.innerHTML = `
      <div class="order-row">

        <div>

          <strong>
            ${order.side} ${order.symbol}
          </strong>

          <div class="muted">
            ${order.quantity} shares
          </div>

          <div class="muted">
            ${order.time}
          </div>

        </div>

        <div style="text-align:right">

          <strong>
            ${money(order.value)}
          </strong>

          <div class="muted">
            @ ${money(order.price)}
          </div>

        </div>

      </div>
    `;

    container.appendChild(card);
  });
}

function marketMove(direction) {

  state.stocks.forEach(stock => {

    let multiplier;

    if (direction === "UP") {
      multiplier =
        1 + Math.random() * 0.03;
    }

    if (direction === "DOWN") {
      multiplier =
        1 - Math.random() * 0.03;
    }

    if (direction === "VOLATILE") {
      multiplier =
        1 + (Math.random() - 0.5) * 0.12;
    }

    stock.price =
      Math.max(
        1,
        stock.price * multiplier
      );
  });

  saveState();

  renderDashboard();
}

function resetSimulation() {

  const confirmed =
    confirm(
      "Reset the entire simulated trading account?\n\n" +
      "All positions, orders and P&L will be deleted."
    );

  if (!confirmed) return;

  state =
    createInitialState();

  saveState();

  renderDashboard();
}

document.addEventListener("DOMContentLoaded", () => {

  renderDashboard();

  const quantity =
    document.getElementById("orderQuantity");

  const price =
    document.getElementById("orderPrice");

  if (quantity) {
    quantity.addEventListener(
      "input",
      updateEstimate
    );
  }

  if (price) {
    price.addEventListener(
      "input",
      updateEstimate
    );
  }
});
