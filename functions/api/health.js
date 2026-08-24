export function onRequestGet() {
  return Response.json({
    ok: true,
    service: "TradeSim API",
    version: "3.0"
  });
}
