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
           id,
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

    return json({
      success: true,

      user,

      account: {
        id: account.id,
        cash: Number(account.cash),
        startingCapital: Number(account.starting_capital),
        realizedPnl: Number(account.realized_pnl)
      }
    });

  } catch (error) {
    console.error("ACCOUNT ERROR:", error);

    return json({
      error: "Unable to load account."
    }, 500);
  }
}
