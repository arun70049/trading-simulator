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

    /* =========================
       CHECK DATABASE
    ========================= */

    if (!context.env.DB) {
      return json({
        success: false,
        error: "Database binding DB is not available."
      }, 500);
    }


    /* =========================
       READ REQUEST
    ========================= */

    const body = await context.request.json();

    const username = String(body.username || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");


    /* =========================
       VALIDATION
    ========================= */

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
        error:
          "Password must be at least 8 characters."
      }, 400);
    }


    /* =========================
       CHECK EXISTING USER
    ========================= */

    const existing = await context.env.DB
      .prepare(
        `SELECT id
         FROM users
         WHERE username = ?
         LIMIT 1`
      )
      .bind(username)
      .first();

    if (existing) {
      return json({
        success: false,
        error:
          "Username already exists. Please choose another username."
      }, 409);
    }


    /* =========================
       PASSWORD HASH
    ========================= */

    const salt = crypto.getRandomValues(
      new Uint8Array(16)
    );

    const passwordHash =
      await hashPassword(
        password,
        salt
      );

    const storedPassword =
      bytesToHex(salt) +
      ":" +
      passwordHash;


    /* =========================
       CREATE USER
    ========================= */

    const userResult =
      await context.env.DB
        .prepare(
          `INSERT INTO users
           (username, password_hash, role)
           VALUES (?, ?, ?)`
        )
        .bind(
          username,
          storedPassword,
          "trader"
        )
        .run();


    const userId =
      userResult?.meta?.last_row_id;


    if (!userId) {

      return json({
        success: false,
        error:
          "User could not be created because the database did not return a user ID.",
        details:
          JSON.stringify(userResult?.meta || {})
      }, 500);

    }


    /* =========================
       CREATE TRADING ACCOUNT
    ========================= */

    try {

      await context.env.DB
        .prepare(
          `INSERT INTO accounts
           (user_id, cash, starting_capital, realized_pnl)
           VALUES (?, ?, ?, ?)`
        )
        .bind(
          userId,
          100000,
          100000,
          0
        )
        .run();

    } catch (accountError) {

      console.error(
        "ACCOUNT CREATION ERROR:",
        accountError
      );


      /*
       * IMPORTANT:
       * If user creation succeeded but account
       * creation failed, remove the user again.
       */

      try {

        await context.env.DB
          .prepare(
            `DELETE FROM users
             WHERE id = ?`
          )
          .bind(userId)
          .run();

      } catch (cleanupError) {

        console.error(
          "USER CLEANUP ERROR:",
          cleanupError
        );

      }


      return json({
        success: false,
        error:
          "User table worked, but trading account could not be created.",
        details:
          String(
            accountError?.message ||
            accountError
          )
      }, 500);

    }


    /* =========================
       SUCCESS
    ========================= */

    return json({

      success: true,

      message:
        "Your TradeSim account has been successfully created.",

      user: {
        id: userId,
        username: username,
        role: "trader"
      }

    }, 201);


  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );


    return json({

      success: false,

      error:
        "Unable to create account.",

      details:
        String(
          error?.message ||
          error
        )

    }, 500);

  }
}
