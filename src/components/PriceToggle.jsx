export default function PriceToggle({ mode, onModeChange }) {
  const nextMode = mode === 'W' ? 'R' : 'W';

  return (
    <button
      className={`price-toggle price-toggle-${mode.toLowerCase()}`}
      type="button"
      aria-label={`Switch to ${nextMode} price`}
      onClick={() => onModeChange(nextMode)}
    >
      {mode}
    </button>
  );
}
