import { Sparkles, TriangleAlert } from 'lucide-react'

export default function AINotice({ available = true, children }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${available ? 'border-violet-200 bg-violet-50 text-violet-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <div className="flex gap-3">
        {available ? <Sparkles className="mt-0.5 h-5 w-5 shrink-0" /> : <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />}
        <div>{children}</div>
      </div>
    </div>
  )
}
