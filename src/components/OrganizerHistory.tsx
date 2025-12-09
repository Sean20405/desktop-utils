import { Star } from "lucide-react";
import type { HistoryEntry } from './OrganizerTypes';

type HistoryPanelProps = {
    historyItems: HistoryEntry[];
    onToggleStar: (id: string) => void;
    onDeleteItem: (id: string) => void;
};

export function HistoryPanel({ historyItems, onToggleStar, onDeleteItem }: HistoryPanelProps) {
    return (
        <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {historyItems.map((item) => (
                        <div
                            key={item.id}
                            className="border border-gray-200 rounded-xl shadow-sm bg-white p-3 flex flex-col gap-2"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-sm">{item.title}</h3>
                                    <p className="text-xs text-gray-500">{item.time}</p>
                                </div>
                                <button
                                    className={`cursor-pointer active:scale-95 p-1 rounded transition-colors ${item.starred
                                        ? "text-yellow-500 hover:text-yellow-600"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                    onClick={() => onToggleStar(item.id)}
                                >
                                    <Star size={18} fill={item.starred ? "currentColor" : "none"} />
                                </button>
                            </div>
                            <div className="w-full h-24 rounded-lg overflow-hidden bg-gray-100">
                                {item.thumbnail ? (
                                    <img
                                        src={item.thumbnail}
                                        alt="History preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-200" />
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-gray-50">
                                    Rollback
                                </button>
                                <button
                                    className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-red-50 text-red-600"
                                    onClick={() => onDeleteItem(item.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
