import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id")!;
  const svix_ts = headerPayload.get("svix-timestamp")!;
  const svix_sig = headerPayload.get("svix-signature")!;

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_ts,
      "svix-signature": svix_sig,
    }) as WebhookEvent;
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id, email_addresses } = evt.data;
    await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerk_id: id,
        email: email_addresses[0]?.email_address,
      }),
    });
  }

  return new Response("OK", { status: 200 });
}
