function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";

  const match = cookie.match(
    /(?:^|;\s*)session=([^;]+)/
  );

  return match ? match[1] : null;
}

async function hashToken(token) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(buffer))
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

async function getUser(context) {
  const token = getSessionToken(context.request);

  if (!token) {
    return null;
  }

  const tokenHash = await hashToken(token);

  const session = await context.env.DB
    .prepare(
      `SELECT
         sessions.user_id,
         sessions.expires_at,
         users.username,
         users.role
       FROM sessions
       INNER JOIN users
         ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?
       LIMIT 1`
    )
    .bind(tokenHash)
    .first();

  if (!session) {
    return null;
  }

  if (
    new Date(session.expires_at) <=
    new Date()
  ) {
    await context.env.DB
      .prepare(
        `DELETE FROM sessions
         WHERE token_hash = ?`
      )
      .bind(tokenHash)
      .run();

    return null;
  }

  return {
    id: session.user_id,
    username: session.username,
    role: session.role
  };
}

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) {
      return json({
        error: "Database binding DB is not available."
      }, 500);
    }

    const user = await getUser(context);

    if (!user) {
      return json({
        authenticated: false,
        error: "Authentication required."
      }, 401);
    }

    const account = await context.env.DB
      .prepare(
        `SELECT
           cash,
           starting_capital,
           realized_pnl
         FROM accounts
         WHERE user_id = ?
         LIMIT 1`
      )
      .bind(user.id)
      .first();

    if (!account) {
      return json({
        error: "Trading account not found."
      }, 404);
    }

    const positions = await context.env.DB
      .prepare(
        `SELECT
           symbol,
           quantity,
           average_price
         FROM positions
         WHERE user_id = ?
           AND quantity > 0
         ORDER BY symbol`
      )
      .bind(user.id)
      .all();

    const orders = await context.env.DB
      .prepare(
        `SELECT
           id,
           symbol,
           side,
           quantity,
           price,
           value,
           created_at
         FROM orders
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 30`
      )
      .bind(user.id)
      .all();

    const stocks = await context.env.DB
      .prepare(
        `SELECT
           symbol,
           name,
           price,
           previous_close,
           updated_at
         FROM stocks
         ORDER BY symbol`
      )
      .all();

    return json({
      success: true,

      user,

      account: {
        cash: Number(account.cash),
        startingCapital:
          Number(account.starting_capital),
        realizedPnl:
          Number(account.realized_pnl)
      },

      positions: positions.results.map(position => ({
        symbol: position.symbol,
        quantity: Number(position.quantity),
        averagePrice:
          Number(position.average_price)
      })),

      orders: orders.results.map(order => ({
        id: Number(order.id),
        symbol: order.symbol,
        side: order.side,
        quantity: Number(order.quantity),
        price: Number(order.price),
        value: Number(order.value),
        time: order.created_at
      })),

      stocks: stocks.results.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: Number(stock.price),
        previousClose:
          Number(stock.previous_close),
        updatedAt: stock.updated_at
      }))
    });

  } catch (error) {
    console.error("PORTFOLIO ERROR:", error);

    return json({
      error: "Unable to load portfolio."
    }, 500);
  }
}
