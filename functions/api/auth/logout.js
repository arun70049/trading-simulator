function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function getSessionToken(request) {

  const cookie =
    request.headers.get("Cookie") || "";

  const match =
    cookie.match(
      /(?:^|;\s*)session=([^;]+)/
    );

  return match
    ? match[1]
    : null;
}

async function hashToken(token) {

  const buffer =
    await crypto.subtle.digest(
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

export async function onRequestPost(context) {

  try {

    const token =
      getSessionToken(
        context.request
      );

    if (token) {

      const tokenHash =
        await hashToken(token);

      await context.env.DB
        .prepare(
          `DELETE FROM sessions
           WHERE token_hash = ?`
        )
        .bind(tokenHash)
        .run();

    }

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json",

          "Set-Cookie":
            "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
        }
      }
    );

  } catch (error) {

    console.error(error);

    return json({
      error:
        "Unable to logout."
    }, 500);

  }

}
