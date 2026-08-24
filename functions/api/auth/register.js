function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password, saltBytes) {
  const passwordBytes = new TextEncoder().encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 120000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return json({
        success: false,
        error: "Database binding DB is not available."
      }, 500);
    }

    const body = await context.request.json();

    const username = String(body.username || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return json({
        success: false,
        error:
          "Username must be 3-30 characters and contain only letters, numbers or underscore."
      }, 400);
    }

    if (password.length < 8) {
      return json({
        success: false,
        error: "Password must be at least 8 characters."
      }, 400);
    }

    const existing = await context.env.DB
      .prepare(
        "SELECT id FROM users WHERE username = ? LIMIT 1"
      )
      .bind(username)
      .first();

    if (existing) {
      return json({
        success: false,
        error: "Username already exists."
      }, 409);
    }

    const salt = crypto.getRandomValues(
      new Uint8Array(16)
    );

    const passwordHash = await hashPassword(
      password,
      salt
    );

    const storedPassword =
      bytesToHex(salt) + ":" + passwordHash;

    const result = await context.env.DB
      .prepare(
        `INSERT INTO users
         (username, password_hash, role)
         VALUES (?, ?, 'trader')`
      )
      .bind(username, storedPassword)
      .run();

    const userId = result.meta.last_row_id;

    if (!userId) {
      return json({
        success: false,
        error: "User was not created because no user ID was returned."
      }, 500);
    }

    await context.env.DB
      .prepare(
        `INSERT INTO accounts
         (user_id, cash, starting_capital, realized_pnl)
         VALUES (?, 100000, 100000, 0)`
      )
      .bind(userId)
      .run();

    return json({
      success: true,
      message: "Trader account created successfully.",
      user: {
        id: userId,
        username: username,
        role: "trader"
      }
    }, 201);

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return json({
      success: false,
      error: "Unable to create account.",
      details: String(error?.message || error)
    }, 500);
  }
}
