export function InstallmentRequestSuccessView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start py-4">
      <div
        className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#e8f5e9]"
        aria-hidden
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="#2e7d32"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-left text-sm leading-relaxed text-gray-800">{message}</p>
    </div>
  );
}
