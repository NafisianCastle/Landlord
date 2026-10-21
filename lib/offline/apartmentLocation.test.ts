import {beforeEach,describe,expect,it} from "vitest";
import db from "./db";
import {createGuestApartment,getGuestApartment,saveGuestApartmentLocation,updateGuestApartmentMetadata} from "./guestApartments";
beforeEach(async()=>{await db.guestApartments.clear();});
describe("guest apartment location persistence",()=>{
  it("persists a pin across reads and metadata changes, and clears it explicitly",async()=>{
    const apartment=await createGuestApartment({name:"Flat 4B"});
    await saveGuestApartmentLocation(apartment.id,{lat:23.8,lng:90.4});
    await updateGuestApartmentMetadata(apartment.id,{name:"Flat 5B"});
    expect(await getGuestApartment(apartment.id)).toMatchObject({name:"Flat 5B",latitude:23.8,longitude:90.4});
    await saveGuestApartmentLocation(apartment.id,null);
    expect(await getGuestApartment(apartment.id)).toMatchObject({latitude:null,longitude:null});
  });
  it("does not report saving a deleted apartment as successful",async()=>{
    await expect(saveGuestApartmentLocation("missing",{lat:23,lng:90})).rejects.toThrow("Apartment not found");
  });
});
