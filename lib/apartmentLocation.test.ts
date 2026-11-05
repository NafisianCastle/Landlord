import { describe, expect, it } from "vitest";
import { apartmentLocation, validApartmentLocation } from "./apartmentLocation";
import { validateGuestProperties } from "./validation/guests";
describe("apartment coordinate validation",()=>{
  it("accepts complete numeric coordinates, including zero, and explicit clearing",()=>{
    for(const point of [null,{lat:0,lng:0},{lat:-90,lng:180},{lat:23.8103,lng:90.4125}]) expect(validApartmentLocation(point)).toBe(true);
    expect(apartmentLocation(0,0)).toEqual({lat:0,lng:0});expect(apartmentLocation(null,null)).toBeNull();
  });
  it("rejects partial, non-finite, string and out-of-range coordinates",()=>{
    for(const point of [undefined,{}, {lat:null,lng:90},{lat:23,lng:null},{lat:91,lng:90},{lat:23,lng:181},{lat:NaN,lng:0},{lat:0,lng:Infinity},{lat:"23",lng:90}]) expect(validApartmentLocation(point)).toBe(false);
  });
  it("validates imported guest coordinates while allowing legacy rows without them",()=>{
    expect(validateGuestProperties([{name:"Flat",latitude:23,longitude:90}])).toBeNull();
    expect(validateGuestProperties([{name:"Legacy flat"}])).toBeNull();
    expect(validateGuestProperties([{name:"Flat",latitude:23}])).toBe("Invalid imported location.");
    expect(validateGuestProperties([{name:"Flat",latitude:200,longitude:90}])).toBe("Invalid imported location.");
  });
});
