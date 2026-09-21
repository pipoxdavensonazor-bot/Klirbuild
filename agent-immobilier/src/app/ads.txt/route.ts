const BODY = `google.com, pub-9701452344811975, DIRECT, f08c47fec0942fa0
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
