export default function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-semibold">{title}</h1>
      {action && <div className="self-start sm:self-auto">{action}</div>}
    </div>
  );
}
