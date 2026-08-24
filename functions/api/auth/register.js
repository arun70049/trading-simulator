function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost(context) {

  try {

    const body = await context.request.json();

    const username =
      String(body.username || "")
        .trim()
        .toLowerCase();

    const password =
      String(body.password || "");

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return json({
        error:
          "Username must be 3-30 characters and contain only letters, numbers or underscore."
      }, 400);
    }

    if (password.length < 8) {
      return json({
        error:
          "Password must be at least 8 characters."
      }, 400);
    }

    const existing =
      await context.env.DB
        .prepare(
          "SELECT id FROM users WHERE username = ?"
        )
        .bind(username)
        .first();

    if (existing) {
      return json({
        error: "Username already exists."
      }, 409);
    }

    const passwordHash =
      await hashPassword(password);

    const result =
      await context.env.DB
        .prepare(
          `INSERT INTO users
           (username, password_hash, role)
           VALUES (?, ?, 'trader')`
        )
        .bind(username, passwordHash)
        .run();

    const userId =
      result.meta.last_row_id;

    await context.env.DB
      .prepare(
        `INSERT INTO accounts
         (user_id, cash, starting_capital)
         VALUES (?, 100000, 100000)`
      )
      .bind(userId)
      .run();

    return json({
      success: true,
      message: "Trader account created."
    }, 201);

  } catch (error) {

    console.error(error);

    return json({
      error: "Unable to create account."
    }, 500);
  }
}
