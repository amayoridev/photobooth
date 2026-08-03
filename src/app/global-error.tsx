'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-4 font-sans">
        <h2 className="text-2xl font-bold text-rose-500">Something went wrong!</h2>
        <p className="text-sm text-slate-400 max-w-md">
          {error?.message || 'An unhandled global application error occurred.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
