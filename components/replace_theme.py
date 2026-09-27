import os
import re

directory = r"c:\Users\ADITYA KONDA\OneDrive\Documents\Desktop\Project V3\Project V2\Project\components"
files_to_update = [
    "ExpensesView.jsx",
    "FinancialHealthDashboard.jsx",
    "PersonalDashboardView.jsx",
    "RefundsView.jsx",
    "SettlementView.jsx",
    "TransactionLogView.jsx",
    "TripChatPolls.jsx",
    "VerificationQueueView.jsx",
    "VerifySettlementModal.jsx",
    "WeatherDigitalTwinView.jsx",
    "InteractiveTripMap.jsx",
    "GoogleAuthButton.jsx"
]

replacements = {
    # Gradients first to avoid partials
    'from-indigo-900 via-indigo-800 to-slate-900': 'from-[#1a090a] via-[#0d0b0c] to-[#050505]',
    'from-slate-900 via-indigo-950 to-slate-900': 'from-[#1a090a] via-[#0d0b0c] to-[#050505]',
    'from-slate-900 to-indigo-950': 'from-[#1a090a] to-[#0d0b0c]',
    'from-indigo-50/80 to-slate-50': 'from-[#9d1117]/10 to-[#0a0a0b]',
    'from-indigo-50 to-slate-50': 'from-[#0d0b0c] to-[#0a0a0b]',
    'from-indigo-600 via-indigo-700 to-violet-600': 'from-[#9d1117] via-[#7a0d12] to-[#4b090c]',
    'from-indigo-600 to-violet-600': 'from-[#9d1117] to-[#4b090c]',
    'from-indigo-600 to-violet-500': 'from-[#a91f24] to-[#4b090c]',
    'from-indigo-700 to-violet-700': 'from-[#7a0d12] to-[#3a060a]',
    'from-slate-700 to-indigo-600': 'from-[#a91f24] to-[#4b090c]',
    'from-purple-50 to-indigo-50': 'from-[#9d1117]/10 to-[#d8c49d]/5',
    'from-purple-100 to-indigo-100': 'from-[#9d1117]/15 to-[#d8c49d]/10',
    'bg-gradient-to-br from-slate-900 to-indigo-950': 'bg-gradient-to-br from-[#1a090a] to-[#0d0b0c]',

    # Background Colors
    'bg-white/95': 'bg-[#050505]/95',
    'bg-white/90': 'bg-[#101011]/90',
    'bg-white/80': 'bg-[#101011]/80',
    'bg-white/70': 'bg-[#101011]/70',
    'bg-white/20': 'bg-[#101011]/20',
    'bg-white/10': 'bg-white/5',
    'hover:bg-white/20': 'hover:bg-white/10',
    'bg-white': 'bg-[#101011]',
    
    'bg-slate-50/70': 'bg-[#0a0a0b]',
    'bg-slate-50/50': 'bg-[#0a0a0b]',
    'bg-slate-50': 'bg-[#050505]',
    'bg-slate-100': 'bg-[#151516]',
    'bg-slate-200': 'bg-[#1d1b1c]',
    'bg-slate-900/60': 'bg-black/72',

    # Border Colors
    'border-slate-800': 'border-[#272526]',
    'border-slate-300': 'border-[#272526]',
    'border-slate-200': 'border-[#272526]',
    'border-slate-100': 'border-[#1d1b1c]',
    
    # Text Colors
    'text-slate-900': 'text-[#f2eee5]',
    'text-slate-800': 'text-[#f2eee5]',
    'text-slate-700': 'text-[#d8c49d]',
    'text-slate-600': 'text-[#9c9791]',
    'text-slate-500': 'text-[#9c9791]',
    'text-slate-400': 'text-[#9c9791]',
    'text-slate-300': 'text-[#9c9791]',
    
    # Indigo Colors
    'bg-indigo-600': 'bg-[#9d1117]',
    'bg-indigo-700': 'bg-[#7a0d12]',
    'bg-indigo-500/30': 'bg-[#9d1117]/20',
    'bg-indigo-500/20': 'bg-[#9d1117]/15',
    'bg-indigo-500/10': 'bg-[#9d1117]/10',
    'bg-indigo-500': 'bg-[#d42a2f]',
    'bg-indigo-400': 'bg-[#d42a2f]',
    
    'bg-indigo-100/70': 'bg-[#9d1117]/12',
    'bg-indigo-100': 'bg-[#9d1117]/15',
    
    'bg-indigo-50/80': 'bg-[#9d1117]/12',
    'bg-indigo-50/70': 'bg-[#9d1117]/10',
    'bg-indigo-50/60': 'bg-[#9d1117]/10',
    'bg-indigo-50/50': 'bg-[#9d1117]/8',
    'bg-indigo-50': 'bg-[#9d1117]/10',
    
    'text-indigo-950': 'text-[#d8c49d]',
    'text-indigo-900': 'text-[#d8c49d]',
    'text-indigo-800': 'text-[#d8c49d]',
    'text-indigo-700': 'text-[#d8c49d]',
    'text-indigo-600': 'text-[#d8c49d]',
    'text-indigo-400': 'text-[#d8c49d]',
    'text-indigo-300': 'text-[#d8c49d]',
    'text-indigo-200': 'text-[#d8c49d]',
    'text-indigo-100': 'text-[#d8c49d]',
    
    'border-indigo-500/30': 'border-[#9d1117]/30',
    'border-indigo-500/20': 'border-[#9d1117]/20',
    'border-indigo-400/40': 'border-[#9d1117]/40',
    'border-indigo-400/30': 'border-[#9d1117]/30',
    'border-indigo-400': 'border-[#9d1117]/50',
    'border-indigo-300': 'border-[#9d1117]/40',
    'border-indigo-200': 'border-[#9d1117]/30',
    'border-indigo-100/50': 'border-[#9d1117]/15',
    'border-indigo-100': 'border-[#9d1117]/20',
    
    'shadow-indigo-600/40': 'shadow-[#9d1117]/40',
    'shadow-indigo-600/30': 'shadow-[#9d1117]/30',
    'shadow-indigo-600/20': 'shadow-[#9d1117]/20',
    'shadow-indigo-500/20': 'shadow-[#9d1117]/20',
    'shadow-indigo-200': 'shadow-[#9d1117]/20',
    'shadow-indigo-100': 'shadow-[#9d1117]/15',
    
    'ring-indigo-500': 'ring-[#9d1117]',
    'focus:ring-indigo-500': 'focus:ring-[#9d1117]',
    
    'hover:bg-indigo-700': 'hover:bg-[#7a0d12]',
    'hover:bg-indigo-500': 'hover:bg-[#d42a2f]',
    'hover:bg-indigo-400': 'hover:bg-[#d42a2f]',
    'hover:bg-indigo-100': 'hover:bg-[#9d1117]/15',
    'hover:bg-indigo-50': 'hover:bg-[#9d1117]/10',
    'hover:text-indigo-600': 'hover:text-[#d8c49d]',
    'hover:border-indigo-400': 'hover:border-[#9d1117]/50',
    
    # Status Colors
    'bg-emerald-50/70': 'bg-emerald-900/18',
    'bg-emerald-50/60': 'bg-emerald-900/15',
    'bg-emerald-50': 'bg-emerald-900/20',
    'text-emerald-900': 'text-emerald-400',
    'text-emerald-800': 'text-emerald-400',
    'text-emerald-700': 'text-emerald-400',
    'text-emerald-600': 'text-[#a8c49b]',
    'border-emerald-400/30': 'border-emerald-700/30',
    'border-emerald-300': 'border-emerald-700/40',
    'border-emerald-200': 'border-emerald-700/30',
    
    'bg-rose-600': 'bg-[#d42a2f]',
    'bg-rose-50': 'bg-rose-900/20',
    'text-rose-800': 'text-rose-400',
    'text-rose-700': 'text-rose-400',
    'text-rose-600': 'text-[#e18a8a]',
    'border-rose-300': 'border-rose-700/40',
    'border-rose-200': 'border-rose-700/30',
    'hover:bg-rose-700': 'hover:bg-[#a91f24]',
    
    'bg-amber-100/70': 'bg-amber-900/25',
    'bg-amber-100': 'bg-amber-900/25',
    'bg-amber-50/80': 'bg-amber-900/20',
    'bg-amber-50/70': 'bg-amber-900/18',
    'bg-amber-50': 'bg-amber-900/20',
    'text-amber-950': 'text-amber-300',
    'text-amber-900': 'text-amber-300',
    'text-amber-800/90': 'text-amber-300',
    'text-amber-800': 'text-amber-300',
    'text-amber-700/90': 'text-amber-300',
    'text-amber-700': 'text-amber-300',
    'text-amber-600': 'text-amber-400',
    'border-amber-300': 'border-amber-700/40',
    'border-amber-200/80': 'border-amber-700/30',
    'border-amber-200': 'border-amber-700/30',
    'hover:bg-amber-100': 'hover:bg-amber-900/30',
    
    # Hovers
    'hover:bg-slate-200': 'hover:bg-[#272526]',
    'hover:bg-slate-100': 'hover:bg-[#1d1b1c]',
    'hover:text-slate-900': 'hover:text-[#f2eee5]',
    'hover:text-slate-600': 'hover:text-[#f2eee5]',
    'hover:bg-rose-50': 'hover:bg-rose-900/20',
    'hover:bg-emerald-100': 'hover:bg-emerald-900/25',
    'hover:bg-emerald-50': 'hover:bg-emerald-900/20',
    'hover:border-slate-300': 'hover:border-[#272526]',
    'hover:border-emerald-300': 'hover:border-emerald-700/40',
    'hover:border-emerald-200': 'hover:border-emerald-700/30',
    
    # Others
    'border-white/10': 'border-white/5',
}

# Sort replacements by length (longest first) to prevent partial matches
sorted_replacements = sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True)

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Manual specific component overrides
    if "FinancialHealthDashboard.jsx" in filepath:
        content = content.replace("hotel: '#6366f1'", "hotel: '#9d1117'")
        content = content.replace("backgroundColor: '#ffffff'", "backgroundColor: '#101011', color: '#f2eee5'")
        content = content.replace("borderColor: '#e2e8f0'", "borderColor: '#272526'")
        content = content.replace('fill="#4f46e5"', 'fill="#9d1117"')
        content = content.replace('fill="#94a3b8"', 'fill="#9c9791"')
        content = content.replace('stroke="#64748b"', 'stroke="#9c9791"')
        
    if "TripChatPolls.jsx" in filepath:
        content = content.replace("bg-indigo-600 text-white shadow-indigo-100", "bg-[#9d1117] text-white shadow-[#9d1117]/15")
        content = content.replace("bg-slate-100 text-slate-900", "bg-[#151516] text-[#f2eee5]")

    if "GoogleAuthButton.jsx" in filepath:
        content = content.replace("bg-white hover:bg-slate-50 text-slate-700 border-slate-300", "bg-[#101011] hover:bg-[#151516] text-[#f2eee5] border-[#272526]")

    for old, new in sorted_replacements:
        content = content.replace(old, new)
        
    # Form inputs & Selects
    # Using regex to inject the background and text color to input and select elements if not present
    def add_input_classes(match):
        attrs = match.group(2)
        if 'bg-[#0a0a0b]' not in attrs:
            return match.group(1) + 'bg-[#0a0a0b] text-[#f2eee5] ' + attrs
        return match.group(0)

    content = re.sub(r'(<(?:input|select|textarea)[^>]*className=["\'])([^"\']*)', add_input_classes, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")

for filename in files_to_update:
    process_file(os.path.join(directory, filename))

print("Done")
