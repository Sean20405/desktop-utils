import React, { useMemo, useState } from "react";
import { ChevronDown, Star, Trash2 } from "lucide-react";
import { useDesktop } from "../context/DesktopContext";

function DesktopPreview() {
  const { items } = useDesktop();

  // Keep preview proportional to a 1920x1080 desktop but scaled down without stretching layout.
  const { scale, previewWidth, previewHeight } = useMemo(() => {
    const baseWidth = 1920;
    const baseHeight = 1080;
    const scale = 0.32;
    return {
      scale,
      previewWidth: baseWidth * scale,
      previewHeight: baseHeight * scale,
    };
  }, []);

  return (
    <div className="w-full h-full relative border rounded-lg overflow-hidden bg-slate-800/80 shadow-inner flex items-center justify-center">
      <div
        className="relative rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10"
        style={{
          width: previewWidth,
          height: previewHeight,
          backgroundImage:
            'url("https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=2070")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Desktop icons */}
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute"
            style={{
              left: item.x * scale,
              top: item.y * scale,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-white/15 backdrop-blur rounded-lg border border-white/10 shadow">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.label} className="w-9 h-9 object-contain" />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded" />
              )}
            </div>
            <div className="mt-1 text-white text-[10px] text-center drop-shadow">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrganizerApp() {
  const [tab, setTab] = useState<"rule" | "tag" | "history">("rule");

  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
      {/* Main Container */}
      <div className="flex flex-1 border rounded-xl bg-white p-3 gap-3 shadow-inner overflow-hidden">
        
        {/* Left side – Preview + Rule Editor */}
        <div className="flex flex-col flex-[1.05] gap-3 min-w-[520px]">
          <div className="w-full h-[380px]">
            <DesktopPreview />
          </div>

          <div className="h-24 border rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
            Rule Editor
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button className="px-6 py-2 border rounded-lg bg-white">Save</button>
            <button className="px-6 py-2 border rounded-lg bg-white">Preview</button>
            <button className="px-6 py-2 border rounded-lg bg-white">Run</button>
          </div>
        </div>

        {/* Right side – Tabs */}
        <div className="w-96 border rounded-xl p-3 flex flex-col overflow-auto">
          
          {/* Tabs */}
          <div className="flex mb-4 border-b">
            <button 
              onClick={() => setTab("rule")}
              className={`flex-1 py-2 text-center ${tab === "rule" ? 'bg-orange-100 font-semibold' : ''}`}
            >
              Rule
            </button>
            <button 
              onClick={() => setTab("tag")}
              className={`flex-1 py-2 text-center ${tab === "tag" ? 'bg-orange-100 font-semibold' : ''}`}
            >
              Tag
            </button>
            <button 
              onClick={() => setTab("history")}
              className={`flex-1 py-2 text-center ${tab === "history" ? 'bg-orange-100 font-semibold' : ''}`}
            >
              History
            </button>
          </div>

          {/* ===== RULE PAGE ===== */}
          {tab === "rule" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center border rounded-lg p-2">
                <input className="flex-1 outline-none" placeholder="save rule" />
                <ChevronDown size={18} />
              </div>

              <div className="font-semibold text-sm text-gray-700">Categories</div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "All files with the same tag",
                  "All files of type...",
                  "All files not accessed within...",
                  "All files",
                  "All files accessed within...",
                  "All files of the same type...",
                  "All files of tag..."
                ].map((text, idx) => (
                  <div key={idx} className="p-2 bg-blue-100 rounded-lg text-sm cursor-pointer hover:bg-blue-200">
                    {text}
                  </div>
                ))}
              </div>

              <div className="font-semibold text-sm mt-3 text-gray-700">Actions</div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Move to a new folder",
                  "Each move to a new folder",
                  "Move to default folder",
                  "Move to most densely packed folder",
                  "Sort by (criteria)"
                ].map((text, idx) => (
                  <div key={idx} className="p-2 bg-orange-200 rounded-lg text-sm cursor-pointer hover:bg-orange-300">
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== TAG PAGE ===== */}
          {tab === "tag" && (
            <div className="flex flex-col h-full">
              
              {/* ALL Tags */}
              <div className="flex flex-col border-b pb-3 mb-3">
                <div className="font-semibold mb-2">ALL</div>
                <div className="flex gap-2 flex-wrap">
                  {["Game 1","Game 2","Game 3","Game 4","doc 1","doc 2"].map((t, i) => (
                    <div key={i} className="px-3 py-1 bg-orange-200 rounded-lg">{t}</div>
                  ))}
                </div>
              </div>

              {/* Game category */}
              <div className="flex flex-col border-b pb-3 mb-3">
                <div className="font-semibold mb-2">Games</div>
                <div className="flex gap-2 flex-wrap">
                  {["Game 1","Game 2","Game 3","Game 4"].map((t, i) => (
                    <div key={i} className="px-3 py-1 bg-blue-200 rounded-lg">{t}</div>
                  ))}
                </div>
              </div>

              {/* File category */}
              <div className="flex flex-col pb-3">
                <div className="font-semibold mb-2">File related</div>
                <div className="flex gap-2 flex-wrap">
                  {["doc 1","doc 2"].map((t, i) => (
                    <div key={i} className="px-3 py-1 bg-green-200 rounded-lg">{t}</div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-auto flex gap-3">
                <button className="flex-1 py-2 border rounded-lg bg-white">AI Generate Tag</button>
                <button className="flex-1 py-2 border rounded-lg bg-white">AI Assign Tag</button>
              </div>

              <button className="mt-3 p-2 text-red-600 border rounded-lg flex items-center justify-center gap-2">
                <Trash2 size={18} /> Delete Tag
              </button>
            </div>
          )}

          {/* ===== HISTORY PAGE ===== */}
          {tab === "history" && (
            <div className="flex flex-col gap-4">
              {[1,2].map((i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">2025/10/23 {i === 1 ? "10:50" : "08:50"}</div>
                    <Star size={20} className={i === 1 ? "text-yellow-500" : "text-gray-400"} />
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    Rules: {i === 1 ? "sort game in date" : "another rule"}
                  </div>

                  <div className="w-full h-20 bg-gray-200 rounded mb-3" />

                  <button className="px-4 py-2 border rounded-lg bg-white">
                    Rollback
                  </button>
                </div>
              ))}

              <button className="text-red-600 flex items-center justify-center gap-2 border rounded-lg py-2">
                <Trash2 size={18} /> Delete All History
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
