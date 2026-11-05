// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_BILL_BYTES, validateBill, validateBillFile } from "./bills";

function bill() {
  const f = new FormData();
  Object.entries({ title: "Electricity", amount: "1200.50", tenantShareId: "30000000-0000-0000-0000-000000000001", dueDate: "2026-10-31", visible: "on" })
    .forEach(([key,value]) => f.set(key,value));
  return f;
}
function attachment(content: BlobPart, name: string, type: string) {
  const f = new FormData(); f.set("file", new File([content],name,{ type })); return f;
}
describe("bill input validation", () => {
  it("accepts a bill and rejects ambiguous monetary amounts, invalid dates and duplicate recipients", () => {
    expect(validateBill(bill())).toBeNull();
    for (const value of ["0", "-1", "NaN", "1e3", "1.001", "1000000000001"]) {
      const f=bill(); f.set("amount",value); expect(validateBill(f)).not.toBeNull();
    }
    const f=bill(); f.set("dueDate","2026-02-30"); expect(validateBill(f)).not.toBeNull();
    f.set("dueDate","2026-10-31"); f.append("tenantShareId","30000000-0000-0000-0000-000000000001");
    expect(validateBill(f)).not.toBeNull();
  });
  it("accepts signature-matched images and complete PDF receipts", async () => {
    for (const [data,name,type] of [
      [new Uint8Array([137,80,78,71,13,10,26,10]),"bill.png","image/png"],
      [new Uint8Array([255,216,255,224]),"receipt.jpg","image/jpeg"],
      ["RIFF0000WEBPVP8 ","receipt.webp","image/webp"],
      ["%PDF-1.7\nreceipt\n%%EOF","receipt.pdf","application/pdf"],
    ] as const) expect(await validateBillFile(attachment(data,name,type))).toHaveProperty("extension");
  });
  it("rejects spoofed MIME, SVG, duplicate files, empty and oversized receipts", async () => {
    expect(await validateBillFile(attachment("<html>active</html>","receipt.png","image/png"))).toEqual({ error:"fileType" });
    expect(await validateBillFile(attachment("<svg/>","receipt.svg","image/svg+xml"))).toEqual({ error:"fileType" });
    expect(await validateBillFile(attachment("","receipt.png","image/png"))).toEqual({ error:"chooseFile" });
    const f=attachment("%PDF-1.7\n%%EOF","bill.pdf","application/pdf");
    f.append("file",new File(["x"],"extra.png",{type:"image/png"}));
    expect(await validateBillFile(f)).toEqual({ error:"chooseFile" });
    expect(await validateBillFile(attachment(new Uint8Array(MAX_BILL_BYTES+1),"bill.png","image/png"))).toEqual({ error:"fileTooLarge" });
  });
});
