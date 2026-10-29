import { broadcastOrderAnnouncement } from "./announcement_service.ts";

const input = {
  orderId: process.env.ORDER_ID ?? "order-1042",
  memberId: process.env.MEMBER_ID ?? "member-77",
  checkout: "completed",
  fulfillment: "packed",
  receipt: "ready",
  orderUpdate: "Your order is packed and the receipt is ready."
};

const channel = process.env.INFRAI_CHANNEL;
if (!channel) throw new Error("INFRAI_CHANNEL is required");

const result = await broadcastOrderAnnouncement(input, process.env.INFRAI_API_KEY, channel);
console.log(JSON.stringify(result, null, 2));
