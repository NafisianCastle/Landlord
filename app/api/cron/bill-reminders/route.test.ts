import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(() => ({ admin:vi.fn(), send:vi.fn(), fcm:vi.fn(), config:vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient:mocks.admin }));
vi.mock("@/lib/webPush", () => ({ sendPush:mocks.send }));
vi.mock("@/lib/pushConfig", () => ({ remindersConfigured:mocks.config }));
vi.mock("@/lib/fcm", () => ({ sendFcm:mocks.fcm }));
import { GET } from "./route";
const update=vi.fn(), remove=vi.fn(), filters=vi.fn();
let revoked=false;
let subscriptionError=false;
let deviceTokens:{token:string}[]=[];
beforeEach(() => {
  vi.clearAllMocks(); revoked=false; subscriptionError=false; deviceTokens=[];
  mocks.fcm.mockResolvedValue({ token:"fcm",expired:false,sent:false });
  vi.stubEnv("CRON_SECRET","test-secret"); mocks.config.mockReturnValue(true);
  mocks.send.mockResolvedValue({ endpoint:"https://push.example/test",expired:false,sent:false });
  mocks.admin.mockReturnValue({ from:(table:string) => {
    let current=false,mutation=false;
    const chain:Record<string,unknown>={};
    for(const name of ["select","eq","is","not","lte","order","limit","in","gt"]) chain[name]=(...args:unknown[]) => {
      filters(table,name,...args); return chain;
    };
    chain.update=(value:unknown) => { mutation=true; update(table,value); return chain; };
    chain.delete=() => { mutation=true; remove(table); return chain; };
    chain.maybeSingle=() => {current=true;return chain;};
    chain.then=(resolve:(value:unknown)=>void) => resolve({
      error:table==="push_subscriptions" && subscriptionError ? {message:"Unavailable"} : null,
      data:mutation ? null : current ? revoked ? null : {id:"bill"} : table==="device_push_tokens" ? deviceTokens : table==="push_subscriptions"
        ? [{endpoint:"https://push.example/test",p256dh:"key",auth:"auth"}]
        : [{id:"bill",tenant_share_id:"share",tenant:{user_id:"tenant"}}],
    });
    return chain;
  }});
});
afterEach(() => vi.unstubAllEnvs());
const request=() => new Request("https://example.test/api/cron/bill-reminders",{headers:{authorization:"Bearer test-secret"}});
describe("tenant bill reminders", () => {
  it("rejects unauthorized calls and absent secrets before accessing tenant data",async () => {
    vi.stubEnv("CRON_SECRET","");expect((await GET(request())).status).toBe(401);expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("requires delivery configuration",async () => {
    mocks.config.mockReturnValue(false);expect((await GET(request())).status).toBe(503);expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("selects visible unpaid published bills and sends only to the assigned tenant",async () => {
    await GET(request());
    expect(filters).toHaveBeenCalledWith("apartment_bills","eq","visible_to_tenant",true);
    expect(filters).toHaveBeenCalledWith("apartment_bills","is","paid_at",null);
    expect(filters).toHaveBeenCalledWith("apartment_bills","not","storage_path","is",null);
    expect(filters).toHaveBeenCalledWith("push_subscriptions","eq","user_id","tenant");
    expect(mocks.send).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({url:"/bills#bill-bill"}));
    expect(update).not.toHaveBeenCalled();
  });
  it("does not send when access was revoked after the initial query",async () => {
    revoked=true;expect((await GET(request())).status).toBe(200);expect(mocks.send).not.toHaveBeenCalled();
  });
  it("records delivery only after provider acceptance",async () => {
    mocks.send.mockResolvedValue({endpoint:"https://push.example/test",expired:false,sent:true});
    expect((await (await GET(request())).json()).sent).toBe(1);
    expect(update).toHaveBeenCalledWith("apartment_bills",{reminder_sent_at:expect.any(String)});
  });
  it("cleans expired subscriptions without claiming success",async () => {
    mocks.send.mockResolvedValue({endpoint:"https://push.example/test",expired:true,sent:false});
    expect(await (await GET(request())).json()).toEqual({sent:0,expiredSubscriptionsRemoved:1});
    expect(remove).toHaveBeenCalledWith("push_subscriptions");expect(update).not.toHaveBeenCalled();
  });
  it("reports subscription lookup failures without marking bills reminded",async () => {
    subscriptionError=true;expect((await GET(request())).status).toBe(500);expect(update).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
  });
  it("also reminds the tenant's phone through FCM",async () => {
    deviceTokens=[{token:"fcm"}];
    mocks.fcm.mockResolvedValue({token:"fcm",expired:false,sent:true});
    expect((await (await GET(request())).json()).sent).toBe(1);
    expect(filters).toHaveBeenCalledWith("device_push_tokens","eq","user_id","tenant");
    expect(mocks.fcm).toHaveBeenCalledWith("fcm",expect.objectContaining({url:"/bills#bill-bill"}));
  });
  it("prunes unregistered FCM tokens",async () => {
    deviceTokens=[{token:"fcm"}];
    mocks.fcm.mockResolvedValue({token:"fcm",expired:true,sent:false});
    expect(await (await GET(request())).json()).toEqual({sent:0,expiredSubscriptionsRemoved:1});
    expect(remove).toHaveBeenCalledWith("device_push_tokens");
  });
});
