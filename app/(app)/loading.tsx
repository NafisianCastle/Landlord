import SectionLoading from "@/components/system/SectionLoading";

export default function AppLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <SectionLoading />
      <SectionLoading />
    </div>
  );
}
