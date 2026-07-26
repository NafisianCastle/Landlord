export default function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="truncate text-xl font-semibold">{title}</h1>
      {action}
    </div>
  );
}
