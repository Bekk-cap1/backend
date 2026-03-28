export default function ProtectedRouteLoading() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-[2px]">
      <div className="flex min-w-[240px] items-center gap-3 rounded-xl border border-border bg-card/95 px-5 py-4 shadow-lg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <div className="text-sm font-medium text-foreground">Загрузка страницы...</div>
      </div>
    </div>
  );
}
