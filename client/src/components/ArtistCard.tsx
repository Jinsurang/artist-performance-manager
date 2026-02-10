import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Edit2, Trash2, Instagram, Phone, Music, Clock } from "lucide-react";
import { ArtistCardProps } from "@/types";

export function ArtistCard({
    artist,
    onToggleFavorite,
    onEdit,
    onDelete,
    getGenreColor
}: ArtistCardProps) {
    return (
        <div className="glass-card hover-scale rounded-2xl p-5 group flex flex-col h-full bg-white/60 dark:bg-black/40 border border-primary/10 hover:border-primary/30">
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                            {artist.name || "이름 없음"}
                        </h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/20 text-primary">
                            {artist.grade || "C"}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {artist.genres && artist.genres.length > 0 ? artist.genres.map((g) => (
                            <span
                                key={g}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shadow-sm ${getGenreColor(g)}`}
                            >
                                {g}
                            </span>
                        )) : (
                            <span className="text-[10px] text-slate-400 italic">장르 미등록</span>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-xl transition-all ${artist.isFavorite
                        ? "text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20"
                        : "text-muted-foreground hover:text-amber-400 hover:bg-amber-50"
                        }`}
                    onClick={() => onToggleFavorite(artist)}
                >
                    <Star className={`h-5 w-5 ${artist.isFavorite ? "fill-current" : ""}`} />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 text-[11px]">
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <Music className="h-3.5 w-3.5 text-primary/60" />
                    <span className="truncate">{artist.instruments || "악기 미등록"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-primary/60" />
                    <span className="truncate">
                        {artist.preferredDays ? `${artist.preferredDays.split(',').join('/')} ${artist.availableTime || ""}` : (artist.availableTime || "미등록")}
                    </span>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-primary/5 flex items-center justify-between">
                <div className="flex gap-1">
                    {artist.instagram && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-pink-500/70 hover:text-pink-500 hover:bg-pink-50"
                            onClick={() => {
                                const username = artist.instagram?.startsWith('@') ? artist.instagram.slice(1) : artist.instagram;
                                window.open(`https://instagram.com/${username}`, '_blank');
                            }}
                        >
                            <Instagram className="h-4 w-4" />
                        </Button>
                    )}
                    {artist.phone && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-blue-500/70 hover:text-blue-500 hover:bg-blue-50"
                            onClick={() => window.open(`tel:${artist.phone}`, '_self')}
                        >
                            <Phone className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() => onEdit(artist)}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                        onClick={() => onDelete(artist.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
