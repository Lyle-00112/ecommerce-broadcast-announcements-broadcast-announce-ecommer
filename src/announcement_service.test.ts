import test from "node:test";
import assert from "node:assert/strict";
import { parseAnnouncement } from "./announcement_service.ts";

test("accepts the complete order state used for a member broadcast", () => {
  const result = parseAnnouncement({
    orderId: "order-1042",
    memberId: "member-77",
    checkout: "completed",
    fulfillment: "packed",
    receipt: "ready",
    orderUpdate: "Packed and ready for pickup"
  });
  assert.equal(result.fulfillment, "packed");
  assert.equal(result.receipt, "ready");
});

test("rejects an order without a member target", () => {
  assert.throws(() => parseAnnouncement({ orderId: "order-1042", checkout: "completed", fulfillment: "packed", receipt: "ready", orderUpdate: "Packed" }));
});
