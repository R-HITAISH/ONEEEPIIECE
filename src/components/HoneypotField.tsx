export function HoneypotField({ onFilled }: { onFilled?: () => void }) {
  return <div className="honeypot-field" aria-hidden="true">
    <label htmlFor="website">Website</label>
    <input id="website" type="text" name="website" tabIndex={-1} autoComplete="off" onChange={(event) => { if (event.target.value.trim()) onFilled?.(); }} />
  </div>;
}

