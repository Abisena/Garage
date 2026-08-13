export function LoadingScreen({ message = 'Memuat...' }) {
  return (
    <div
      className="flex items-center justify-center h-screen bg-slate-50"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-live="polite" aria-busy="true">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <span className="sr-only">Memuat halaman...</span>
    </div>
  );
}
