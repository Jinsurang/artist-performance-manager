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
        <div className="rounded-[2rem] p-6 group flex flex-col h-full bg-white border-[1.5px] border-[#A8C3C3]/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            {/* Top Action Buttons - Floating for more space */}
            <div className="absolute top-4 right-4 flex gap-0.5 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors ${artist.isFavorite ? "text-amber-400" : ""}`}
                    onClick={() => onToggleFavorite(artist)}
                >
                    <Star className={`h-4.5 w-4.5 ${artist.isFavorite ? "fill-current" : ""}`} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    onClick={() => onEdit(artist)}
                >
                    <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => onDelete(artist.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Header: Name, Grade and Genres */}
            <div className="mb-6 pr-24"> {/* Extra right padding to avoid buttons */}
                <div className="flex items-start gap-3 mb-3">
                    <h4 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-[1.2] break-keep word-break-keep-all">
                        {artist.name || "이름 없음"}
                    </h4>
                    <div className="flex-shrink-0 min-w-[32px] sm:min-w-[40px] px-2 h-8 sm:h-10 rounded-lg border-[1.5px] border-slate-200 flex items-center justify-center bg-white shadow-sm mt-0.5">
                        <span className="text-lg sm:text-xl font-medium text-[#1B4332]">{artist.grade || "C"}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {artist.genres && artist.genres.length > 0 ? artist.genres.map((g) => (
                        <span
                            key={g}
                            className={`text-[10px] sm:text-xs px-3 py-1 rounded-2xl font-bold shadow-sm ${getGenreColor(g)} opacity-90`}
                        >
                            {g}
                        </span>
                    )) : (
                        <span className="text-xs text-slate-300 italic">장르 미등록</span>
                    )}
                </div>
            </div>

            {/* Info Stack */}
            <div className="space-y-6">
                {/* Instruments */}
                <div className="space-y-3">
                    <span className="text-[11px] font-black text-[#2D6A4F] uppercase tracking-wider">악기구성</span>
                    <div className="flex items-center gap-3 bg-[#E8F3F1] p-4 rounded-2xl border border-[#A8C3C3]/20">
                        <Music className="h-5 w-5 text-[#2D6A4F]/60 flex-shrink-0" />
                        <span className="font-bold text-[#1B4332] text-[13px] sm:text-sm leading-tight">
                            {artist.instruments || "악기 미등록"}
                        </span>
                    </div>
                </div>

                {/* Schedule */}
                <div className="space-y-3">
                    <span className="text-[11px] font-black text-[#2D6A4F] uppercase tracking-wider">선호 일정</span>
                    <div className="flex flex-wrap gap-1.5">
                        {DAY_ORDER.map(day => {
                            const isSelected = artistDays.includes(day);
                            return (
                                <div
                                    key={day}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-[11px] font-black transition-all ${isSelected
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
            <div className="flex flex-wrap gap-x-6 gap-y-4 mt-8">
                {artist.instagram && (
                    <div
                        className="flex items-center gap-2 cursor-pointer group/link"
                        onClick={() => {
                            const username = artist.instagram?.startsWith('@') ? artist.instagram.slice(1) : artist.instagram;
                            window.open(`https://instagram.com/${username}`, '_blank');
                        }}
                    >
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                            <Instagram className="h-5 w-5" />
                        </div>
                        <span className="text-[13px] font-bold text-[#2D6A4F] underline decoration-[#2D6A4F]/30 group-hover/link:text-[#1B4332] group-hover/link:decoration-[#1B4332] transition-all">
                            @{artist.instagram.replace(/^@/, '')}
                        </span>
                    </div>
                )}
                {artist.phone && (
                    <div
                        className="flex items-center gap-2 cursor-pointer group/link"
                        onClick={() => window.open(`tel:${artist.phone}`, '_self')}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                            <Phone className="h-5 w-5" />
                        </div>
                        <span className="text-[13px] font-bold text-[#2D6A4F] underline decoration-[#2D6A4F]/30 group-hover/link:text-[#1B4332] group-hover/link:decoration-[#1B4332] transition-all">
                            {artist.phone}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer / Notes */}
            <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-[13px] font-bold text-slate-500 leading-relaxed">
                    {artist.notes || "메모가 없습니다."}
                </p>
            </div>
        </div>
    );
}
