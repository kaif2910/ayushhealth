export default function ProgressBar({ step, labels }) {
  const percent = Math.round(((step - 1) / (labels.length - 1)) * 100)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>Step {step} of {labels.length}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-600 transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 hidden grid-cols-6 gap-2 md:grid">
        {labels.map((label, index) => (
          <div key={label} className={`text-xs ${index + 1 <= step ? 'font-semibold text-emerald-700' : 'text-slate-400'}`}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
