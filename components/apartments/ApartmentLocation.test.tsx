import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import ApartmentLocation from "./ApartmentLocation";
const mapLoad = vi.hoisted(() => vi.fn());
vi.mock("next/dynamic", () => ({default: () => (props: {onChange:(point:{lat:number;lng:number})=>void}) => {
  mapLoad();return <button type="button" onClick={()=>props.onChange({lat:23.8103,lng:90.4125})}>Choose map pin</button>;
}}));
beforeEach(()=>vi.clearAllMocks());
describe("apartment location",()=>{
  it("does not load the map or request GPS before the user chooses them",()=>{
    const gps=vi.fn();Object.defineProperty(navigator,"geolocation",{configurable:true,value:{getCurrentPosition:gps}});
    render(<ApartmentLocation canEdit onSave={vi.fn()}/>);
    expect(mapLoad).not.toHaveBeenCalled();expect(gps).not.toHaveBeenCalled();
  });
  it("chooses a pin and saves latitude/longitude only on explicit submission",async()=>{
    const save=vi.fn().mockResolvedValue({success:true});render(<ApartmentLocation canEdit onSave={save}/>);
    fireEvent.click(screen.getByRole("button",{name:"Open map"}));
    fireEvent.click(screen.getByRole("button",{name:"Choose map pin"}));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Save location"}));
    await waitFor(()=>expect(save).toHaveBeenCalledWith({lat:23.8103,lng:90.4125}));
    expect(await screen.findByRole("status")).toHaveTextContent("Location saved.");
  });
  it("retains the previous location when the server rejects a save",async()=>{
    render(<ApartmentLocation latitude={23} longitude={90} canEdit onSave={vi.fn().mockResolvedValue({error:"Access denied"})}/>);
    fireEvent.change(screen.getByLabelText("Latitude"),{target:{value:"24"}});
    fireEvent.click(screen.getByRole("button",{name:"Save location"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.getByText("Saved: 23.000000, 90.000000")).toBeInTheDocument();
  });
  it("allows removing a saved point without changing apartment details",async()=>{
    const save=vi.fn().mockResolvedValue({success:true});render(<ApartmentLocation latitude={23} longitude={90} canEdit onSave={save}/>);
    fireEvent.click(screen.getByRole("button",{name:"Remove location"}));
    await waitFor(()=>expect(save).toHaveBeenCalledWith(null));
    expect(await screen.findByText("No location saved yet.")).toBeInTheDocument();
  });
  it("leaves read-only sharing without edit, GPS or removal controls",()=>{
    render(<ApartmentLocation latitude={23} longitude={90} />);
    expect(screen.getByRole("button",{name:"Open map"})).toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Save location"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Remove location"})).not.toBeInTheDocument();
  });
  it("uses explicit GPS permission and recovers from permission denial",async()=>{
    const gps=vi.fn((_success:unknown,error:()=>void)=>error());
    Object.defineProperty(navigator,"geolocation",{configurable:true,value:{getCurrentPosition:gps}});
    render(<ApartmentLocation canEdit onSave={vi.fn()}/>);
    await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Use my current location"})));
    expect(gps).toHaveBeenCalledOnce();expect(screen.getByRole("alert")).toHaveTextContent("Check browser permission");
    expect(screen.getByLabelText("Latitude")).toBeEnabled();
  });
});
