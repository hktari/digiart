interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-3">
        <span className="inline-block rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700">
          Coming soon
        </span>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </main>
  );
}
