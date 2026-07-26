export default function LegalPageLayout({
  title,
  lastUpdated,
  draftNotice,
  body,
}: {
  title: string;
  lastUpdated: string;
  draftNotice: string;
  body: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-xs text-muted-foreground">{lastUpdated}</p>
      <p className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
        {draftNotice}
      </p>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        {body.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
