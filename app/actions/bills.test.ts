// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(() => ({ access:vi.fn(), create:vi.fn(), revalidate:vi.fn(), upload:vi.fn(), insert:vi.fn(), update:vi.fn(), remove:vi.fn() }));
vi.mock("@/lib/access", () => ({getUserWithAccess:mocks.access}));
vi.mock("@/lib/supabase/server", () => ({createClient:mocks.create}));
vi.mock("next-intl/server", () => ({getTranslations:async () => (key:string) => key}));
vi.mock("next/cache", () => ({revalidatePath:mocks.revalidate}));
import { createApartmentBill } from "./bills";
let shareAvailable=true, publishFailed=false;
const apartmentId="20000000-0000-0000-0000-000000000001";
const ownerId="10000000-0000-0000-0000-000000000001";
beforeEach(() => {
  vi.clearAllMocks(); shareAvailable=true;publishFailed=false;
  mocks.access.mockResolvedValue({hasAccess:true,user:{id:ownerId}});
  mocks.upload.mockResolvedValue({error:null});
  mocks.create.mockResolvedValue({storage:{from:() => ({upload:mocks.upload})},from:(table:string) => {
    const chain:Record<string,unknown>={};let kind="read";
    for(const name of ["select","eq"])chain[name]=() => chain;
    chain.insert=(value:unknown) => {kind="insert";mocks.insert(table,value);return chain;};
    chain.update=(value:unknown) => {kind="update";mocks.update(table,value);return chain;};
    chain.delete=() => {kind="delete";mocks.remove(table);return chain;};
    const result=() => table==="apartment_tenants" ? {data:shareAvailable ? {id:"30000000-0000-0000-0000-000000000001",invited_email:"tenant@example.test"} : null,error:null}
      : {data:kind==="update" && !publishFailed ? {id:"bill"} : null,error:kind==="update" && publishFailed ? {message:"Write failed"} : null};
    chain.single=async () => result();
    chain.then=(resolve:(value:unknown)=>void) => resolve(result());
    return chain;
  }});
});
function form() {
  const f=new FormData();Object.entries({title:"Electricity",tenantShareId:"30000000-0000-0000-0000-000000000001",amount:"1200.50",dueDate:"2026-10-31",visible:"on"}).forEach(([k,v])=>f.set(k,v));
  f.set("file",new File([new Uint8Array([137,80,78,71,13,10,26,10])],"bill.png",{type:"image/png"}));return f;
}
describe("monthly bill publishing",() => {
  it("rejects unauthenticated callers before touching storage or the database",async () => {
    mocks.access.mockResolvedValue(null);expect(await createApartmentBill(apartmentId,null,form())).toEqual({error:"accessDenied"});
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires an accessible owner-controlled tenant before uploading",async () => {
    shareAvailable=false;expect(await createApartmentBill(apartmentId,null,form())).toEqual({error:"notFound"});
    expect(mocks.upload).not.toHaveBeenCalled();expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not create a draft when the attachment has forged contents",async () => {
    const f=form();f.set("file",new File(["<html/>"],"bill.png",{type:"image/png"}));
    expect(await createApartmentBill(apartmentId,null,f)).toEqual({error:"fileType"});expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("publishes only after the private file upload succeeds using generated keys",async () => {
    expect(await createApartmentBill(apartmentId,null,form())).toEqual({success:true});
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^[a-f0-9-]+/bill/${ownerId}/[a-f0-9-]+\\.png$`)),expect.any(File),{contentType:"image/png",upsert:false});
    expect(mocks.update).toHaveBeenCalledWith("apartment_bills",expect.objectContaining({file_name:"bill.png"}));
  });
  it("removes the unpublished draft on upload failure",async () => {
    mocks.upload.mockResolvedValue({error:{message:"Storage unavailable"}});
    expect(await createApartmentBill(apartmentId,null,form())).toEqual({error:"uploadFailed"});
    expect(mocks.remove).toHaveBeenCalledWith("apartment_bills");expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not claim success when publishing fails",async () => {
    publishFailed=true;expect(await createApartmentBill(apartmentId,null,form())).toEqual({error:"saveFailed"});
    expect(mocks.remove).toHaveBeenCalledWith("apartment_bills");expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
