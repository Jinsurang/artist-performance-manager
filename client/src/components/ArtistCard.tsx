import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Edit2, Trash2, Instagram, Phone, Music } from "lucide-react";
import { ArtistCardProps } from "@/types";

export function ArtistCard({
    artist,
    onToggleFavorite,
    onEdit,
    onDelete,
    getGenreColor
}: ArtistCardProps) {
    const DAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];
    const artistDays = artist.preferredDays ? artist.preferredDays.split(',').filter(Boolean) : [];

    const getDayColor = (day: string) => {
        if (day === '토') return 'bg-blue-600';
        if (day === '일') return 'bg-red-700';
        if (day === '금') return 'bg-[#004D40]'; // Dark Teal
        return artistDays.includes(day) ? 'bg-[#3D9191]' : 'bg-slate-100 text-slate-300';
    };

    return (
        <div className="rounded-[1.5rem] p-4 sm:p-5 group flex flex-col h-full bg-white border-[1.5px] border-[#A8C3C3]/30 shadow-sm hover:shadow-md transition-all">
            {/* Header: Name, Grade and Actions */}
            <div className="flex justify-between items-start mb-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight leading-tight">
                            {artist.name || "이름 없음"}
                        </h4>
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-slate-300 flex items-center justify-center">
                            <span className="text-sm sm:text-base font-black text-[#1B4332]">{artist.grade || "C"}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {artist.genres && artist.genres.length > 0 ? artist.genres.map((g) => (
                            <span
                                key={g}
                                className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-2xl font-bold shadow-sm ${getGenreColor(g)} opacity-80`}
                            >
                                {g}
                            </span>
                        )) : (
                            <span className="text-[9px] text-slate-300 italic">장르 미등록</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-0 pt-0.5 ml-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors ${artist.isFavorite ? "text-amber-400" : ""}`}
                        onClick={() => onToggleFavorite(artist)}
                    >
                        <Star className={`h-4 w-4 sm:h-5 sm:w-5 ${artist.isFavorite ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        onClick={() => onEdit(artist)}
                    >
                        <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => onDelete(artist.id)}
                    >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                </div>
            </div>

            {/* Info Grid - RESTORED 2-COLUMN */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
                {/* Instruments */}
                <div className="space-y-1.5">
                    <span className="text-[10px] font-normal text-[#2D6A4F] uppercase tracking-wider">악기구성</span>
                    <div className="flex items-center gap-2 bg-[#E8F3F1] p-2 sm:p-3 rounded-xl border border-[#A8C3C3]/20 min-h-[44px]">
                        <Music className="h-3.5 w-3.5 text-[#2D6A4F]/60 flex-shrink-0" />
                        <span className={`font-bold text-[#1B4332] leading-tight break-words ${(artist.instruments?.length || 0) > 20 ? 'text-[9px]' : 'text-[11px]'
                            }`}>
                            {artist.instruments || "악기 미등록"}
                        </span>
                    </div>
                </div>

                {/* Schedule */}
                <div className="space-y-1.5">
                    <span className="text-[10px] font-normal text-[#2D6A4F] uppercase tracking-wider">선호 일정</span>
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {DAY_ORDER.map(day => {
                            const isSelected = artistDays.includes(day);
                            return (
                                <div
                                    key={day}
                                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[8px] sm:text-[9px] font-black transition-all ${isSelected
                                            ? getDayColor(day) + ' text-white shadow-sm'
                                            : 'bg-white text-slate-200 border border-slate-100'
                                        }`}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Contact Links */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                {artist.instagram && (
                    <div
                        className="flex items-center gap-1.5 cursor-pointer group/link"
                        onClick={() => {
                            const username = artist.instagram?.startsWith('@') ? artist.instagram.slice(1) : artist.instagram;
                            window.open(`https://instagram.com/${username}`, '_blank');
                        }}
                    >
                        <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                            <Instagram className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-[#2D6A4F] underline decoration-[#2D6A4F]/30 group-hover/link:text-[#1B4332] group-hover/link:decoration-[#1B4332] transition-all">
                            @{artist.instagram.replace(/^@/, '')}
                        </span>
                    </div>
                )}
                {artist.phone && (
                    <div
                        className="flex items-center gap-1.5 cursor-pointer group/link"
                        onClick={() => window.open(`tel:${artist.phone}`, '_self')}
                    >
                        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                            <Phone className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-[#2D6A4F] underline decoration-[#2D6A4F]/30 group-hover/link:text-[#1B4332] group-hover/link:decoration-[#1B4332] transition-all">
                            {artist.phone}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer / Notes */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    {artist.notes || "메모가 없습니다."}
                </p>
            </div>
        </div>
    );
}
