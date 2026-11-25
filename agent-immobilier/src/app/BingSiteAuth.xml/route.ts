const BING_USER = "F5B520DB4A8F8567C1BDDB6CEFF22A7E";

const BODY = `<?xml version="1.0"?>
<users>
	<user>${BING_USER}</user>
</users>
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
