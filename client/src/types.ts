export interface Artist {
    id: number;
    name: string;
    genre: string;
    genres: string[];
    phone?: string | null;
    instagram?: string | null;
    grade?: string | null;
    availableTime?: string | null;
    instruments?: string | null;
    notes?: string | null;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Performance {
    id: number;
    artistId: number;
    title: string;
    performanceDate: string;
    status: "scheduled" | "confirmed" | "completed" | "cancelled";
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ArtistCardProps {
    artist: Artist;
    onToggleFavorite: (artist: Artist) => void;
    onEdit: (artist: Artist) => void;
    onDelete: (id: number) => void;
    getGenreColor: (genre: string) => string;
}
