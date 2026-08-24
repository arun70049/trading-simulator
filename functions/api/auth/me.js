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

  return Array.from(
    new Uint8Array(buffer)
  )
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

export async function onRequestGet(context) {

  try {

    const token =
      getSessionToken(context.request);

    if (!token) {
      return json({
        authenticated: false
      }, 401);
    }

    const tokenHash =
      await hashToken(token);

    const session =
      await context.env.DB
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

      return json({
        authenticated: false
      }, 401);

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

      return json({
        authenticated: false
      }, 401);

    }

    return json({
      authenticated: true,

      user: {
        id: session.user_id,
        username: session.username,
        role: session.role
      }
    });

  } catch (error) {

    console.error(error);

    return json({
      error: "Unable to verify session."
    }, 500);

  }

}
