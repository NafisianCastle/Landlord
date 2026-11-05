import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({access:vi.fn(),create:vi.fn(),update:vi.fn(),revalidate:vi.fn(),single:vi.fn()}));
vi.mock("@/lib/access",()=>({getUserWithAccess:mocks.access}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.create}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
vi.mock("next-intl/server",()=>({getTranslations:async()=>(key:string)=>key}));
import {saveApartmentLocation} from "./apartments";
const id="20000000-0000-0000-0000-000000000001";
beforeEach(()=>{
  vi.clearAllMocks();mocks.access.mockResolvedValue({hasAccess:true,user:{id:"owner"}});
  mocks.single.mockResolvedValue({data:{id},error:null});
  const chain={update:mocks.update,eq:vi.fn().mockReturnThis(),select:vi.fn().mockReturnThis(),single:mocks.single};
  mocks.update.mockReturnValue(chain);mocks.create.mockResolvedValue({from:()=>chain});
});
describe("saving apartment location",()=>{
  it("requires authentication before any database access",async()=>{
    mocks.access.mockResolvedValue(null);expect(await saveApartmentLocation(id,{lat:23,lng:90})).toEqual({error:"accessDenied"});expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects forged ids and non-finite coordinates",async()=>{
    expect(await saveApartmentLocation("invalid",{lat:23,lng:90})).toEqual({error:"invalidCoordinates"});
    expect(await saveApartmentLocation(id,{lat:NaN,lng:90})).toEqual({error:"invalidCoordinates"});expect(mocks.update).not.toHaveBeenCalled();
  });
  it("writes only coordinate fields and invalidates apartment views",async()=>{
    expect(await saveApartmentLocation(id,{lat:0,lng:0})).toEqual({success:true});
    expect(mocks.update).toHaveBeenCalledWith({latitude:0,longitude:0});expect(mocks.revalidate).toHaveBeenCalledWith(`/apartments/${id}`);
  });
  it("clears both coordinates together",async()=>{
    expect(await saveApartmentLocation(id,null)).toEqual({success:true});expect(mocks.update).toHaveBeenCalledWith({latitude:null,longitude:null});
  });
  it("does not report success when RLS hides or rejects the update",async()=>{
    mocks.single.mockResolvedValue({data:null,error:{code:"PGRST116"}});
    expect(await saveApartmentLocation(id,{lat:23,lng:90})).toEqual({error:"saveFailed"});expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
