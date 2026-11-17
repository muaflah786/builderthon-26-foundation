/** ORDOX wordmark: uppercase letters with the brand-orange accent on the second O. */
export function Wordmark({ name = "ORDOX" }: { name?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span
        aria-hidden="true"
        className="bg-primary inline-block size-5 -skew-x-12 rounded-[5px]"
      />
      <span>
        {name.slice(0, 3)}
        <span className="text-primary">{name.slice(3, 4)}</span>
        {name.slice(4)}
      </span>
    </span>
  );
}
