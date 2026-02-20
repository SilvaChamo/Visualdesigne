import React from 'react'

interface ProgressBarProps {
    label: string
    current: string
    max: string
    percentage: number
    color?: 'red' | 'blue' | 'green'
}

export default function UsageProgress({ label, current, max, percentage, color = 'red' }: ProgressBarProps) {
    const colorClasses = {
        red: 'bg-red-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]',
        blue: 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]',
        green: 'bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.4)]'
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <div>
                    <span className="text-gray-500 text-[10px] font-bold block uppercase tracking-widest mb-1">{label}</span>
                    <span className="text-gray-900 font-black text-xl tracking-tighter">{current}</span>
                    <span className="text-gray-400 text-xs ml-1 font-medium">/ {max}</span>
                </div>
                <div className="text-right">
                    <span className={`text-sm font-black ${percentage > 90 ? 'text-red-500' : 'text-gray-900'}`}>
                        {percentage}%
                    </span>
                </div>
            </div>

            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClasses[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
