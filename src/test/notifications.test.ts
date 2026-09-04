import { describe, expect, it } from "vitest";
import { customerReceipt, sellerNotification, type OrderNotificationContext } from "@/lib/sms/messages";

const base: OrderNotificationContext = {
  orderId: "6b1f2c34-0000-0000-0000-000000000001",
  quantity: 2,
  grossAmount: 39_800,
  clubEarningAmount: 16_000,
  status: "PAID",
  paymentStatus: "CAPTURED",
  customerName: "Kari Olsen",
  customerPhone: "4790000001",
  sellerId: "seller-1",
  sellerFirstName: "Johannes",
  sellerLastName: "Hansen",
  sellerPhone: "4790000002",
  sellerTotal: 6,
  teamName: "G2013",
  clubName: "Søgne FK",
  campaignName: "Høstdugnad 2026",
  paymentMode: "ONLINE",
  pickupLocation: "Klubbhuset",
  pickupCode: "ABC123",
};

describe("sms receipts", () => {
  it("tells the customer what they bought and who delivers it", () => {
    const text = customerReceipt(base);
    expect(text).toContain("G2013");
    expect(text).toContain("2 ×");
    expect(text).toContain("398 kr");
    expect(text).toContain("160 kr går til laget");
    expect(text).toContain("Johannes Hansen leverer");
  });

  it("says the club is invoiced when nobody pays online", () => {
    const text = customerReceipt({ ...base, paymentMode: "INVOICE", paymentStatus: "INVOICED" });
    expect(text).toContain("registrert");
    expect(text).toContain("Søgne FK fakturerer");
    expect(text).not.toContain("Betalt 398 kr");
  });

  it("tells the seller who bought how many, and the running total", () => {
    const text = sellerNotification(base);
    expect(text).toContain("Kari Olsen kjøpte 2 stk");
    expect(text).toContain("solgt 6 totalt");
    expect(text).toContain("ABC123");
  });

  it("omits the pickup code before one exists", () => {
    expect(sellerNotification({ ...base, pickupCode: null })).not.toContain("Hentekode");
  });

  it("keeps both messages inside a sensible SMS length", () => {
    expect(customerReceipt(base).length).toBeLessThan(320);
    expect(sellerNotification(base).length).toBeLessThan(160);
  });
});
