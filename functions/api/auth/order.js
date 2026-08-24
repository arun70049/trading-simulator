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
         sessions.expires_at
       FROM sessions
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
    id: session.user_id
  };
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return json({
        error: "Database binding DB is not available."
      }, 500);
    }

    const user = await getUser(context);

    if (!user) {
      return json({
        error: "Authentication required."
      }, 401);
    }

    const body = await context.request.json();

    const symbol =
      String(body.symbol || "")
        .trim()
        .toUpperCase();

    const side =
      String(body.side || "")
        .trim()
        .toUpperCase();

    const quantity =
      Number(body.quantity);

    const price =
      Number(body.price);

    if (!symbol) {
      return json({
        error: "Stock symbol is required."
      }, 400);
    }

    if (
      side !== "BUY" &&
      side !== "SELL"
    ) {
      return json({
        error: "Order side must be BUY or SELL."
      }, 400);
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return json({
        error: "Quantity must be a positive integer."
      }, 400);
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return json({
        error: "Price must be greater than zero."
      }, 400);
    }

    const stock = await context.env.DB
      .prepare(
        `SELECT
           symbol,
           name,
           price
         FROM stocks
         WHERE symbol = ?
         LIMIT 1`
      )
      .bind(symbol)
      .first();

    if (!stock) {
      return json({
        error: "Stock not found."
      }, 404);
    }

    const value = quantity * price;

    const account = await context.env.DB
      .prepare(
        `SELECT
           id,
           cash,
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

    const existing = await context.env.DB
      .prepare(
        `SELECT
           id,
           quantity,
           average_price
         FROM positions
         WHERE user_id = ?
           AND symbol = ?
         LIMIT 1`
      )
      .bind(user.id, symbol)
      .first();

    if (side === "BUY") {

      if (value > Number(account.cash)) {
        return json({
          error:
            "Insufficient simulated funds.",
          required: value,
          available:
            Number(account.cash)
        }, 400);
      }

      if (existing) {

        const oldQuantity =
          Number(existing.quantity);

        const oldAverage =
          Number(existing.average_price);

        const newQuantity =
          oldQuantity + quantity;

        const newAverage =
          (
            oldAverage * oldQuantity +
            price * quantity
          ) / newQuantity;

        await context.env.DB
          .prepare(
            `UPDATE positions
             SET quantity = ?,
                 average_price = ?
             WHERE id = ?
               AND user_id = ?`
          )
          .bind(
            newQuantity,
            newAverage,
            existing.id,
            user.id
          )
          .run();

      } else {

        await context.env.DB
          .prepare(
            `INSERT INTO positions
             (user_id, symbol, quantity, average_price)
             VALUES (?, ?, ?, ?)`
          )
          .bind(
            user.id,
            symbol,
            quantity,
            price
          )
          .run();

      }

      await context.env.DB
        .prepare(
          `UPDATE accounts
           SET cash = cash - ?
           WHERE user_id = ?`
        )
        .bind(value, user.id)
        .run();

    } else {

      if (
        !existing ||
        Number(existing.quantity) < quantity
      ) {
        return json({
          error:
            "Insufficient simulated holdings."
        }, 400);
      }

      const averagePrice =
        Number(existing.average_price);

      const realizedPnl =
        (
          price -
          averagePrice
        ) * quantity;

      const remainingQuantity =
        Number(existing.quantity) -
        quantity;

      if (remainingQuantity === 0) {

        await context.env.DB
          .prepare(
            `DELETE FROM positions
             WHERE id = ?
               AND user_id = ?`
          )
          .bind(
            existing.id,
            user.id
          )
          .run();

      } else {

        await context.env.DB
          .prepare(
            `UPDATE positions
             SET quantity = ?
             WHERE id = ?
               AND user_id = ?`
          )
          .bind(
            remainingQuantity,
            existing.id,
            user.id
          )
          .run();

      }

      await context.env.DB
        .prepare(
          `UPDATE accounts
           SET cash = cash + ?,
               realized_pnl = realized_pnl + ?
           WHERE user_id = ?`
        )
        .bind(
          value,
          realizedPnl,
          user.id
        )
        .run();
    }

    const orderResult =
      await context.env.DB
        .prepare(
          `INSERT INTO orders
           (
             user_id,
             symbol,
             side,
             quantity,
             price,
             value
           )
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          user.id,
          symbol,
          side,
          quantity,
          price,
          value
        )
        .run();

    return json({
      success: true,

      order: {
        id: orderResult.meta.last_row_id,
        symbol,
        side,
        quantity,
        price,
        value
      }
    }, 201);

  } catch (error) {

    console.error("ORDER ERROR:", error);

    return json({
      error:
        "Unable to execute simulated order.",
      details:
        String(error?.message || error)
    }, 500);
  }
        }
