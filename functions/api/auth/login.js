function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(
      hex.substring(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password, saltBytes) {

  const passwordBytes =
    new TextEncoder().encode(password);

  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 120000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

  return bytesToHex(
    new Uint8Array(derivedBits)
  );
}

async function createSession(env, userId) {

  const tokenBytes =
    crypto.getRandomValues(
      new Uint8Array(32)
    );

  const token =
    bytesToHex(tokenBytes);

  const tokenHashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );

  const tokenHash =
    bytesToHex(
      new Uint8Array(tokenHashBuffer)
    );

  const expires =
    new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

  await env.DB
    .prepare(
      `INSERT INTO sessions
       (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`
    )
    .bind(
      userId,
      tokenHash,
      expires
    )
    .run();

  return token;
}

export async function onRequestPost(context) {

  try {

    const body =
      await context.request.json();

    const username =
      String(body.username || "")
        .trim()
        .toLowerCase();

    const password =
      String(body.password || "");

    if (!username || !password) {

      return json({
        error:
          "Username and password are required."
      }, 400);

    }

    const user =
      await context.env.DB
        .prepare(
          `SELECT id, username, password_hash, role
           FROM users
           WHERE username = ?`
        )
        .bind(username)
        .first();

    if (!user) {

      return json({
        error:
          "Invalid username or password."
      }, 401);

    }

    const parts =
      String(user.password_hash).split(":");

    if (parts.length !== 2) {

      return json({
        error:
          "Account password format is invalid."
      }, 500);

    }

    const salt =
      hexToBytes(parts[0]);

    const expectedHash =
      parts[1];

    const actualHash =
      await hashPassword(
        password,
        salt
      );

    if (actualHash !== expectedHash) {

      return json({
        error:
          "Invalid username or password."
      }, 401);

    }

    const token =
      await createSession(
        context.env,
        user.id
      );

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",

          "Set-Cookie":
            `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
        }
      }
    );

  } catch (error) {

    console.error(error);

    return json({
      error:
        "Unable to login."
    }, 500);

  }
        }
