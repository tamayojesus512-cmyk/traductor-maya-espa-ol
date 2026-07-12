/** Decorative Maya greca side borders framing the page content. */
export function Greca() {
  return (
    <>
      <div className="greca-side pointer-events-none absolute left-0 top-0 h-full w-3 opacity-70" />
      <div className="greca-side pointer-events-none absolute right-0 top-0 h-full w-3 opacity-70" />
    </>
  );
}
