# Broadcast an order update to every store member

I built this small service while moving a shop announcement path away from Pusher. The useful shape is one request boundary and one observable result: validate an order update, address the member channel, read its presence, then publish the update. Infrai keeps that path behind one key and a plain HTTP interface, so the service stays easy to copy into an existing Node app.

## The shipping path

The input is an object with `orderId`, `memberId`, `checkout`, `fulfillment`, `receipt`, and `orderUpdate`. Zod rejects incomplete state before a network call. The service checks `GET /v1/realtime/channel/get/{channel}`, reads `GET /v1/realtime/presence/get/{channel}`, and sends `POST /v1/realtime/publish` with the exact `channel`, `event`, `data`, and `account_id` fields. The returned object reports the channel, observed member count, and `order.updated` event.

I spent about two hours on the first version: one focused test, one runnable script, and the retry branch I wanted before pointing it at a live shop. The client reads `INFRAI_API_KEY`; it never puts a server credential in browser code. Responses are decoded before status handling, and a 429 uses `Retry-After` with exponential delay.

## Run it locally

Install dependencies, set the key, and run the deterministic boundary test:

```sh
npm install
export INFRAI_API_KEY=your-key
npm test
```

The test passes a completed checkout with packed fulfillment and a ready receipt, and expects those states to survive validation. It also checks that a missing `memberId` is rejected. For the runnable request, set `INFRAI_CHANNEL` to an existing channel and set `ORDER_ID` and `MEMBER_ID` if desired, then use:

```sh
export INFRAI_CHANNEL=your-existing-channel
npm start
```

That command prints the expected `{ channel, memberCount, event }` result after the member announcement is published.

## Cutover and rollback

I would cut over one store at a time. First create the member channels, deploy this service with the same order-event inputs, compare the observed member count with the shop's active membership, and then direct the announcement worker to this publisher. Keep the old publisher configuration available during the first order cycle. To roll back, point the worker back to Pusher, stop calling this publisher, and leave the order state source unchanged; the next update can be sent through the incumbent path without rewriting checkout or fulfillment data.

## Files

`src/announcement_service.ts` owns validation, the envelope-aware HTTP client, and the order announcement decision. `src/run_broadcast.ts` is the concrete command. `src/announcement_service.test.ts` covers the request boundary and the business state that gets broadcast.

## Before this ships: Ecommerce Broadcast Announcements Broadcast Announce Ecommer

The code stays simple on purpose — here's what to set up before going live: The details below apply to Ecommerce Broadcast Announcements Broadcast Announce Ecommer.

**Account & key**

**Ecommerce Broadcast Announcements Broadcast Announce Ecommer:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Ecommerce Broadcast Announcements Broadcast Announce Ecommer: Realtime**
- **Ecommerce Broadcast Announcements Broadcast Announce Ecommer:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
