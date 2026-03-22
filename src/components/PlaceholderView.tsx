"use client";

interface PlaceholderViewProps {
  title: string;
  icon: string;
  description: string;
}

export default function PlaceholderView({ title, icon, description }: PlaceholderViewProps) {
  return (
    <div className="view-fade-in absolute inset-0 z-10 flex items-center justify-center" style={{ top: 48, bottom: 52 }}>
      <div className="text-center px-8">
        <div
          className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center glass-detail"
          dangerouslySetInnerHTML={{ __html: icon }}
          style={{ color: "rgba(0, 229, 255, 0.3)" }}
        />
        <h2 className="text-lg font-bold text-glow-white mb-2">{title}</h2>
        <p className="text-[12px] text-white/20 max-w-xs leading-relaxed">{description}</p>
        <div className="mt-4 px-4 py-2 rounded-xl glass-chip inline-block">
          <span className="text-[10px] text-cyan-400/40 font-medium">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
