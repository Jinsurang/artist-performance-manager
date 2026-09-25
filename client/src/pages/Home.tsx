import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, Bell, Star, ChevronLeft, ChevronRight, Search, Calendar, Users, Settings, Lock, Unlock, MessageSquare, Check, X, ShieldCheck, Instagram, Phone, RotateCcw, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ArtistCard } from "@/components/ArtistCard";
import { SettlementTab } from "@/components/SettlementTab";
import { Artist } from "@/types";

const AVAILABLE_GENRES = ["어쿠스틱", "팝", "재즈", "포크", "인디", "락", "발라드", "브릿팝", "가요"];

const GENRE_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  "어쿠스틱": { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  "팝": { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  "재즈": { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  "포크": { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  "인디": { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300" },
  "락": { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  "발라드": { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
  "브릿팝": { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  "가요": { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

const INSTRUMENTS = ["보컬", "어쿠스틱기타", "일렉기타", "피아노", "드럼", "베이스기타", "콘트라베이스", "관악기", "바이올린", "그외"];
const GRADE_OPTIONS = ["S", "A", "B", "C"];

const parseInstruments = (instrumentsStr: string | null): Record<string, number> => {
  if (!instrumentsStr) return {};
  const result: Record<string, number> = {};
  const parts = instrumentsStr.split(',').map(p => p.trim());
  parts.forEach(part => {
    const match = part.match(/(.+)\((\d+)\)/);
    if (match) {
      const name = match[1];
      const count = parseInt(match[2], 10);
      result[name] = count;
    }
  });
  return result;
};

const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 8) {
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
  }
  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`;
};

const formatResidentNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, '').slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};
const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

function SearchResults({ query, onSelect }: { query: string; onSelect: (artist: { id: number, name: string, instruments: string | null, memberCount: number }) => void }) {
  const { data: results, isLoading } = trpc.artist.searchPublic.useQuery({ name: query }, { enabled: query.length > 0 });

  if (isLoading) return <div className="text-[10px] text-slate-400 p-2">검색 중...</div>;
  if (!results || results.length === 0) return <div className="text-[10px] text-slate-400 p-2">검색 결과가 없습니다.</div>;

  return (
    <>
      {results.map((artist: any) => (
        <div
          key={artist.id}
          onClick={() => onSelect(artist)}
          className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-700 group-hover:text-emerald-700">{artist.name}</h4>
            <p className="text-[10px] text-slate-400 group-hover:text-emerald-500">{artist.memberCount || 1}명 - {artist.instruments || "악기 정보 없음"}</p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 rounded-full bg-white text-slate-300 group-hover:text-emerald-600 group-hover:bg-emerald-100">
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  useEffect(() => {
    console.log("[V3.0] Migration to Render - Stable Environment");
  }, []);

  const [isAdmin, setIsAdmin] = useState(() => {
    // Stage 1: Pessimistic check from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdmin') === 'true';
    }
    return false;
  });
  const [password, setPassword] = useState("");
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Stage 2: Server-side verification
  const { data: me, isLoading: isAuthLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  useEffect(() => {
    if (me) {
      if (me.role === 'admin') {
        setIsAdmin(true);
        localStorage.setItem('isAdmin', 'true');
      } else {
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
      }
    } else if (!isAuthLoading && isAdmin) {
      // If we thought we were admin but server says no (e.g. session expired)
      setIsAdmin(false);
      localStorage.removeItem('isAdmin');
      console.warn("[Auth] Session expired or invalid. Re-auth required.");
    }
  }, [me, isAuthLoading]);

  const [tab, setTab] = useState("dashboard");
  const [isArtistOpen, setIsArtistOpen] = useState(false);
  const [selectedPerformanceDay, setSelectedPerformanceDay] = useState<Date | null>(null);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [selectedArtistForPerformance, setSelectedArtistForPerformance] = useState<number | null>(null);
  const [changingArtistPerfId, setChangingArtistPerfId] = useState<number | null>(null);
  const [changeArtistSearch, setChangeArtistSearch] = useState("");

  // New state for multi-date flow
  const [savedArtistId, setSavedArtistId] = useState<number | null>(null);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [selectedArtistInstruments, setSelectedArtistInstruments] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [applicantMemo, setApplicantMemo] = useState("");

  const [noticeForm, setNoticeForm] = useState({ title: "", content: "" });
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  const [artistForm, setArtistForm] = useState({
    name: "",
    genres: [] as string[],
    phone: "",
    instagram: "",
    grade: "",
    availableTime: "",
    preferredDays: [] as string[],
    instruments: {} as Record<string, number>,
    memberCount: 1,
    notes: "",
    realName: "",
    residentNumber: "",
    bankAccount: "",
  });


  const [messageTemplate, setMessageTemplate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  });
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");
  const [perfArtistSearch, setPerfArtistSearch] = useState("");
  const [showConfirmedOnly, setShowConfirmedOnly] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Queries
  const { data: artists, refetch: refetchArtists } = trpc.artist.list.useQuery({}, { enabled: isAdmin });

  const { data: monthlyPerfs, refetch: refetchMonthlyPerfs } = trpc.performance.getMonthly.useQuery({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
  });

  const upcomingMonthlyPerfs = monthlyPerfs?.filter((p: any) => new Date(p.performanceDate) >= today) || [];

  // Mutations
  const queryClient = useQueryClient();
  const createArtist = trpc.artist.create.useMutation();
  const updateArtist = trpc.artist.update.useMutation();
  const deleteArtist = trpc.artist.delete.useMutation();
  const toggleFavorite = trpc.artist.update.useMutation({
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: [['artist', 'list']] });
      const previousArtists = queryClient.getQueryData([['artist', 'list'], { type: 'query' }]);
      queryClient.setQueryData([['artist', 'list'], { type: 'query' }], (old: any) => {
        if (!old) return old;
        return old.map((a: any) => a.id === id ? { ...a, isFavorite } : a);
      });
      return { previousArtists };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousArtists) {
        queryClient.setQueryData([['artist', 'list'], { type: 'query' }], context.previousArtists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['artist', 'list']] });
    }
  });

  const createPerformance = trpc.performance.create.useMutation();
  const updatePerformance = trpc.performance.update.useMutation({ onSuccess: () => refetchMonthlyPerfs() });
  const createPending = trpc.performance.createPending.useMutation();
  const deletePerformance = trpc.performance.delete.useMutation({ onSuccess: () => refetchMonthlyPerfs() });
  const confirmPerformance = trpc.performance.confirm.useMutation({ onSuccess: () => refetchMonthlyPerfs() });
  const createNotice = trpc.notice.create.useMutation();
  const updateNotice = trpc.notice.update.useMutation();
  const deleteNotice = trpc.notice.delete.useMutation();
  const { data: latestNotice, refetch: refetchNotices } = trpc.notice.getLatest.useQuery();
  const adminLogin = trpc.auth.adminLogin.useMutation();
  const getSetting = trpc.settings.get.useQuery({ key: "message_template" }, {
    enabled: isAdmin,
    retry: false
  });
  const updateSetting = trpc.settings.update.useMutation();

  useEffect(() => {
    if (getSetting.data) {
      setMessageTemplate(getSetting.data);
    }
  }, [getSetting.data]);

  const handleAdminLogin = async () => {
    try {
      if (password === "6009") {
        await adminLogin.mutateAsync({ passcode: password });
        setIsAdmin(true);
        localStorage.setItem('isAdmin', 'true');
        setIsLoginOpen(false);
        setPassword("");
        toast.success("관리자로 로그인되었습니다.");
        refetchArtists();
      } else {
        toast.error("비밀번호가 올바르지 않습니다.");
      }
    } catch (error: any) {
      console.error("[Auth] Admin login failed:", error);
      toast.error("관리자 인증에 실패했습니다.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    toast.success("로그아웃되었습니다.");
  };

  const handleCreateNotice = async () => {
    if (!noticeForm.title || !noticeForm.content) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }
    try {
      if (editingNotice) {
        await updateNotice.mutateAsync({
          id: editingNotice.id,
          title: noticeForm.title,
          content: noticeForm.content
        });
        toast.success("공지가 수정되었습니다.");
      } else {
        await createNotice.mutateAsync(noticeForm);
        toast.success("공지가 등록되었습니다.");
      }
      setNoticeForm({ title: "", content: "" });
      setEditingNotice(null);
      setIsNoticeOpen(false);
      await queryClient.invalidateQueries({ queryKey: [['notice']] });
      refetchNotices();
    } catch (error: any) {
      toast.error(`작업 실패: ${error?.message || '알 수 없는 오류'}`);
    }
  };

  const handleDeleteNotice = async (id: number) => {
    if (!confirm("정말 이 공지를 삭제하시겠습니까?")) return;
    try {
      await deleteNotice.mutateAsync({ id });
      toast.success("공지가 삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: [['notice']] });
      refetchNotices();
    } catch (error) {
      toast.error("삭제 실패");
    }
  };

  const handleSaveProfile = async () => {
    // ... (This function is no longer used in the public flow, but keeping it for now or we can remove/ignore)
  };

  const handleChangeArtist = async (perf: any, artist: any) => {
    if (!confirm(`${perf.artistName} → ${artist.name}(으)로 변경할까요?`)) return;
    try {
      await updatePerformance.mutateAsync({ id: perf.id, artistId: artist.id, title: `${artist.name} 공연` });
      toast.success(`아티스트가 ${artist.name}(으)로 변경되었습니다.`);
      setChangingArtistPerfId(null);
      setChangeArtistSearch("");
    } catch (e) {
      toast.error("아티스트 변경 실패");
    }
  };

  const handleDateClick = (date: Date) => {
    const isSelected = selectedDates.some(d => isSameDay(d, date));
    if (isSelected) {
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleBatchApply = async () => {
    if (!savedArtistId) {
      toast.error("상단에서 프로필을 먼저 저장해 주세요.");
      return;
    }

    if (selectedDates.length === 0) {
      toast.error("공연 날짜를 1개 이상 선택해주세요.");
      return;
    }

    if (!confirm(`총 ${selectedDates.length}개의 날짜에 공연을 신청하시겠습니까?`)) return;

    try {
      const results = await Promise.allSettled(selectedDates.map(date =>
        createPending.mutateAsync({
          artistId: savedArtistId,
          title: `${artistForm.name} 공연 신청`,
          performanceDate: date,
          notes: applicantMemo || "사용자 직접 신청",
        })
      ));

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`${successful}건의 공연 신청이 성공적으로 접수되었습니다!`);
        setSelectedDates([]); // Reset selection
        setIsProfileSaved(false);
        setSavedArtistId(null);
        setArtistForm({ ...artistForm, name: "" });
        setSelectedArtistInstruments("");
        setApplicantMemo("");
        refetchMonthlyPerfs();
      }

      if (failed > 0) {
        console.error("[Debug] Batch Application Errors:", results.filter(r => r.status === 'rejected'));
        toast.error(`${failed}건의 신청이 실패했습니다. (중복 신청 등)`);
      }

    } catch (error) {
      console.error("[Debug] Critical Application Error:", error);
      toast.error("시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const getGenreStyles = (genre: string) => GENRE_COLORS[genre] || { bg: "bg-gray-100 text-gray-800 border-gray-200" };

  const filteredArtists = artists && Array.isArray(artists) ? artists.map((a: any) => ({
    ...a,
    genres: typeof a.genre === 'string' ? a.genre.split(',').filter(Boolean) : []
  })).filter((a: any) => {
    const matchesSearch = a.name.toLowerCase().includes(artistSearch.toLowerCase());
    const genresArray = a.genres || [];
    const matchesGenre = selectedGenres.length === 0 || genresArray.some((g: string) => selectedGenres.includes(g));
    const matchesFavorite = !showFavoritesOnly || a.isFavorite;
    return matchesSearch && matchesGenre && matchesFavorite;
  }) : [];

  const handleEditArtist = (artist: Artist) => {
    // ... existing implementation
    setEditingArtist(artist);
    setArtistForm({
      name: artist.name,
      genres: artist.genres || [],
      phone: artist.phone || "",
      instagram: artist.instagram || "",
      grade: artist.grade || "",
      availableTime: artist.availableTime || "",
      preferredDays: typeof artist.preferredDays === 'string' ? artist.preferredDays.split(',').filter(Boolean) : [],
      instruments: parseInstruments(artist.instruments),
      memberCount: artist.memberCount || 1,
      notes: artist.notes || "",
      realName: artist.realName || "",
      residentNumber: artist.residentNumber || "",
      bankAccount: artist.bankAccount || "",
    });
    setIsArtistOpen(true);
  };

  const handleToggleFavorite = async (artist: Artist) => {
    try {
      await toggleFavorite.mutateAsync({
        id: artist.id,
        isFavorite: !artist.isFavorite,
      });
    } catch (error) {
      toast.error("즐겨찾기 변경 실패");
    }
  };

  const handleDeleteArtist = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteArtist.mutateAsync({ id });
      toast.success("아티스트 삭제됨");
      refetchArtists();
    } catch (error) {
      toast.error("삭제 실패");
    }
  };

  const handleSaveArtistAdmin = async () => {
    // ... Copy existing admin save logic
    if (!artistForm.name || artistForm.genres.length === 0) {
      toast.error("이름과 장르를 선택해주세요.");
      return;
    }

    const instrumentsString = INSTRUMENTS
      .filter(name => (artistForm.instruments[name] || 0) > 0)
      .map(name => `${name}(${artistForm.instruments[name]})`)
      .join(", ");

    try {
      const inputData = {
        name: artistForm.name,
        genre: artistForm.genres.join(","),
        phone: artistForm.phone,
        instagram: artistForm.instagram,
        grade: artistForm.grade,
        availableTime: artistForm.availableTime,
        preferredDays: artistForm.preferredDays.join(","),
        instruments: instrumentsString,
        memberCount: artistForm.memberCount,
        notes: artistForm.notes,
      };
      console.log('[V3.0] Saving artist (Render Ready):', inputData);

      if (editingArtist) {
        await updateArtist.mutateAsync({
          id: editingArtist.id,
          name: artistForm.name,
          genre: artistForm.genres.join(","),
          phone: artistForm.phone,
          instagram: artistForm.instagram,
          grade: artistForm.grade,
          availableTime: artistForm.availableTime,
          preferredDays: artistForm.preferredDays.join(","),
          instruments: instrumentsString,
          memberCount: artistForm.memberCount,
          notes: artistForm.notes,
          realName: artistForm.realName,
          residentNumber: artistForm.residentNumber,
          bankAccount: artistForm.bankAccount,
        });
        toast.success("수정 완료");
      } else {
        await createArtist.mutateAsync({
          name: artistForm.name,
          genre: artistForm.genres.join(","),
          phone: artistForm.phone,
          instagram: artistForm.instagram,
          grade: artistForm.grade,
          availableTime: artistForm.availableTime,
          preferredDays: artistForm.preferredDays.join(","),
          instruments: instrumentsString,
          memberCount: artistForm.memberCount,
          notes: artistForm.notes,
          realName: artistForm.realName,
          residentNumber: artistForm.residentNumber,
          bankAccount: artistForm.bankAccount,
        });
        toast.success("등록 완료");
      }
      setIsArtistOpen(false);
      await queryClient.invalidateQueries({ queryKey: [['artist', 'list']] });
      await refetchArtists();
    } catch (e: any) {
      console.error('[DEBUG] Save failed:', e);
      console.error('[DEBUG] Error message:', e?.message);
      console.error('[DEBUG] Error details:', JSON.stringify(e, null, 2));
      toast.error(`저장 실패: ${e?.message || '알 수 없는 오류'}`);
    }
  };

  const renderCalendar = (isAdminView: boolean) => {
    const headerDays = ["월", "화", "수", "목", "금", "토", "일"];

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    let firstDay = getDay(start); // 0 (Sun) to 6 (Sat)
    let emptySlots = firstDay === 0 ? 6 : firstDay - 1;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-px bg-primary/5 rounded-xl overflow-hidden border border-primary/10">
          {headerDays.map((d, i) => (
            <div key={d} className={`text-center py-2 text-[10px] font-black uppercase tracking-tighter bg-white ${d === '토' ? 'text-blue-500' : d === '일' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {d}
            </div>
          ))}
          {Array(emptySlots).fill(null).map((_, i) => <div key={`empty-${i}`} className="bg-white/50 min-h-[80px] sm:min-h-[112px]" />)}
          {daysInMonth.map((date, i) => {
            const dayNum = date.getDate();
            const weekDay = getDay(date);
            const isSat = weekDay === 6;
            const isSun = weekDay === 0;
            const isPast = date < today;
            const isToday = isSameDay(date, today);

            const perfs = (monthlyPerfs || [])
              .filter((p: any) => isSameDay(new Date(p.performanceDate), date))
              .filter((p: any) => !showConfirmedOnly || p.status === 'confirmed')
              .sort((a: any, b: any) => {
                const aConfirmed = a.status !== 'pending' && a.status !== 'cancelled';
                const bConfirmed = b.status !== 'pending' && b.status !== 'cancelled';
                if (aConfirmed && !bConfirmed) return -1;
                if (!aConfirmed && bConfirmed) return 1;
                return 0;
              });
            const hasConfirmed = perfs.some((p: any) => p.status !== 'pending');
            const isSelected = selectedDates.some(d => isSameDay(d, date));
            // 관리자는 지난 날짜도 열어서 긴급 교체 등 사후 수정이 가능해야 한다
            const isLocked = isPast && !isAdminView;

            return (
              <div
                key={i}
                onClick={() => {
                  if (isLocked) return;
                  if (isAdminView) {
                    setSelectedPerformanceDay(date);
                    setIsPerformanceDialogOpen(true);
                  } else {
                    handleDateClick(date);
                  }
                }}
                className={`${isPast && isAdminView ? 'bg-slate-50' : 'bg-white'} min-h-[80px] sm:min-h-[112px] p-1 sm:p-2 border-t border-l border-primary/5 relative cursor-pointer group transition-all ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''} ${isSelected ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-500 z-10' : 'hover:bg-primary/5'}`}
              >
                <span className={`text-xs font-black ${isToday ? 'bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : ''}`}>
                  {dayNum}
                </span>

                <div className="mt-1 flex flex-col gap-1 relative z-10">
                  {isAdminView && perfs.map((p: any, idx: number) => {
                    const isConfirmed = p.status === 'confirmed' || p.status === 'scheduled' || p.status === 'completed';
                    return (
                      <div
                        key={idx}
                        className={`text-[10px] sm:text-[11px] px-2 py-1 flex-shrink-0 rounded-md border font-black whitespace-normal break-words ${isConfirmed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : p.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : p.artistGenre && GENRE_COLORS[p.artistGenre]
                              ? `${GENRE_COLORS[p.artistGenre].bg} ${GENRE_COLORS[p.artistGenre].text} ${GENRE_COLORS[p.artistGenre].border}`
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          } hover:opacity-100 transition-all`}
                      >
                        {p.status === 'pending' ? '⌛ ' : ''}{p.artistName || p.title.split(' ')[0]}
                      </div>
                    );
                  })}
                </div>

                {!isLocked && (
                  isAdminView ? (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-primary/10 transition-opacity">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100 bg-indigo-500/10' : (hasConfirmed ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 bg-primary/10')}`}>
                      {isSelected ? (
                        <Check className="h-6 w-6 text-indigo-600 drop-shadow-sm" />
                      ) : (
                        !hasConfirmed && <Plus className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfdfc] text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/70 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-sm">
              <Star className="h-4 w-4 text-white fill-current" />
            </div>
            <h1 className="text-lg font-black tracking-tighter text-primary uppercase">
              작은따옴표
            </h1>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setIsTemplateOpen(true)}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => {
                setEditingNotice(null);
                setNoticeForm({ title: "", content: "" });
                setIsNoticeOpen(true);
              }}>
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-red-100 text-red-600 hover:bg-red-50" onClick={handleAdminLogout}>로그아웃</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 text-slate-400 font-bold text-[10px] uppercase tracking-widest" onClick={() => setIsLoginOpen(true)}>
              <Lock className="h-3 w-3 mr-1" /> Admin
            </Button>
          )}
        </div>
      </header>

      <main className="container py-6 px-4 max-w-5xl mx-auto flex-1 space-y-6">
        {!isAdmin ? (
          <>
            {/* Latest Notice Banner */}
            {latestNotice && (
              <Card className="shadow-none border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-emerald-900 mb-1">{latestNotice.title}</h4>
                      <p className="text-xs text-emerald-700 whitespace-pre-wrap">{latestNotice.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Artist Search & Selection */}
            <Card className="shadow-none border-primary/10 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-6 bg-primary/5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{isProfileSaved ? "아티스트 확인됨" : "STEP 01"}</span>
                  {isProfileSaved && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                </div>
                <CardTitle className="text-xl font-black">{isProfileSaved ? "아티스트 선택 완료" : "아티스트 선택"}</CardTitle>
                <p className="text-[11px] text-muted-foreground font-medium">아티스트를 검색하여 선택해주세요. <span className="text-[10px] text-slate-400">한글로 먼저 검색하고, 나오지 않으면 영어로 검색해보세요.</span></p>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {!isProfileSaved ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        className="h-10 pl-9 rounded-xl bg-slate-50 border-none text-sm"
                        placeholder="아티스트 이름을 입력하세요"
                        value={artistForm.name}
                        onChange={(e) => {
                          setArtistForm({ ...artistForm, name: e.target.value });
                        }}
                      />
                    </div>

                    {artistForm.name.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">검색 결과</Label>
                        <div className="grid grid-cols-1 gap-2">
                          <SearchResults
                            query={artistForm.name}
                            onSelect={(artist) => {
                              setSavedArtistId(artist.id);
                              setArtistForm({
                                ...artistForm,
                                name: artist.name,
                                memberCount: artist.memberCount,
                                instruments: parseInstruments(artist.instruments)
                              });
                              setSelectedArtistInstruments(artist.instruments || "악기 정보 없음");
                              setIsProfileSaved(true);
                              setIsEditingConfig(false);
                              toast.success(`${artist.name}님, 환영합니다! 이제 날짜를 선택해주세요.`);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-900">{artistForm.name}</h4>
                          <p className="text-[10px] text-emerald-600 font-medium">{selectedArtistInstruments}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isEditingConfig && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingConfig(true)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 font-bold text-xs"
                            >
                              구성변경
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsProfileSaved(false);
                                setIsEditingConfig(false);
                                setSavedArtistId(null);
                                setArtistForm({ ...artistForm, name: "" });
                                setSelectedArtistInstruments("");
                              }}
                              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold text-xs"
                            >
                              선택취소
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingConfig && (
                      <div className="p-5 bg-white border border-slate-100 rounded-2xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-black text-slate-700">인원 수</Label>
                            <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-xl">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm" onClick={() => setArtistForm({ ...artistForm, memberCount: Math.max(1, artistForm.memberCount - 1) })}>-</Button>
                              <span className="text-sm font-bold w-4 text-center">{artistForm.memberCount}명</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-primary text-white shadow-md shadow-primary/20" onClick={() => setArtistForm({ ...artistForm, memberCount: artistForm.memberCount + 1 })}>+</Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {INSTRUMENTS.map((inst) => (
                              <div key={inst} className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter">{inst}</span>
                                <div className="flex items-center justify-center gap-3">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white shadow-sm border border-slate-100" onClick={() => {
                                    const current = artistForm.instruments[inst] || 0;
                                    setArtistForm({
                                      ...artistForm,
                                      instruments: { ...artistForm.instruments, [inst]: Math.max(0, current - 1) }
                                    });
                                  }}>-</Button>
                                  <span className="text-xs font-black min-w-[20px] text-center">{artistForm.instruments[inst] || 0}</span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-200" onClick={() => {
                                    const current = artistForm.instruments[inst] || 0;
                                    setArtistForm({
                                      ...artistForm,
                                      instruments: { ...artistForm.instruments, [inst]: current + 1 }
                                    });
                                  }}>+</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-sm shadow-lg shadow-emerald-100"
                            onClick={async () => {
                              if (!savedArtistId) return;
                              const instrumentStr = Object.entries(artistForm.instruments)
                                .filter(([_, count]) => count > 0)
                                .map(([name, count]) => `${name}(${count})`)
                                .join(", ");

                              try {
                                await updateArtist.mutateAsync({
                                  id: savedArtistId,
                                  memberCount: artistForm.memberCount,
                                  instruments: instrumentStr
                                });
                                setSelectedArtistInstruments(instrumentStr);
                                setIsEditingConfig(false);
                                toast.success("구성이 수정되었습니다.");
                                refetchArtists();
                              } catch (e) {
                                toast.error("수정 중 오류가 발생했습니다.");
                              }
                            }}
                          >
                            저장하기
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-slate-200 text-slate-500 font-black text-sm"
                            onClick={() => {
                              setIsEditingConfig(false);
                              // Re-parse current instruments if canceled
                              const originalStr = selectedArtistInstruments;
                              setArtistForm({
                                ...artistForm,
                                instruments: parseInstruments(originalStr)
                              });
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Selection */}
            <div className={`space-y-4 transition-all duration-700 ${!isProfileSaved ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tighter leading-none">공연 신청 날짜 선택</h3>
                  <p className="text-[10px] text-slate-400 font-normal leading-tight">
                    원하시는 날짜를 클릭하여 선택해주세요. 선택 후 하단 버튼을 눌러 일괄 신청할 수 있습니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirmedOnly(!showConfirmedOnly)}
                    className={`h-8 rounded-xl text-[10px] font-black px-3 transition-all ${showConfirmedOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200'}`}
                  >
                    {showConfirmedOnly ? "확정 공연만" : "전체 일정"}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xs font-black min-w-[60px] text-center">{format(currentMonth, "M월")}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              {renderCalendar(false)}

              <div className="px-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 ml-1">요청사항 메모</label>
                  <textarea
                    className="w-full min-h-[100px] p-4 text-sm bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none placeholder:text-slate-400 font-medium"
                    placeholder="관리자에게 요청사항이 있다면 이곳에 남겨주세요."
                    value={applicantMemo}
                    onChange={(e) => setApplicantMemo(e.target.value)}
                  />
                </div>

                {selectedDates.length > 0 && (
                  <Button
                    className="w-full h-14 text-lg font-black rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 animate-in slide-in-from-bottom-4 fade-in"
                    onClick={handleBatchApply}
                  >
                    <span className="mr-2">🚀</span> {selectedDates.length}일 공연 신청하기
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Admin View */
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              {["dashboard", "artists", "settlement"].map(t => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3.5 text-xs font-black transition-all rounded-lg ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>
                  {t === 'dashboard' ? '일정관리' : t === 'artists' ? `아티스트${artists ? `(${artists.length})` : ''}` : '정산'}
                </button>
              ))}
            </div>

            {tab === 'dashboard' && (
              <div className="space-y-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfirmedOnly(!showConfirmedOnly)}
                      className={`h-9 rounded-xl text-xs font-black px-4 transition-all ${showConfirmedOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      {showConfirmedOnly ? "확정 공연만 보기" : "모든 신청 보기"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg text-xs font-bold"
                      onClick={() => {
                        const today = new Date();
                        setCurrentMonth(today);
                      }}
                    >
                      오늘
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 rounded-2xl border-none bg-blue-50/50">
                    <p className="text-[9px] font-black text-blue-400 uppercase">예정된 공연</p>
                    <h4 className="text-xl font-black text-blue-700">{upcomingMonthlyPerfs.filter((p: any) => p.artistId).length}</h4>
                  </Card>
                  <Card className="p-4 rounded-2xl border-none bg-amber-50/50">
                    <p className="text-[9px] font-black text-amber-500 uppercase">미지정 공연일정</p>
                    <h4 className="text-xl font-black text-amber-700">{(() => {
                      const daysInMonth = eachDayOfInterval({
                        start: startOfMonth(currentMonth),
                        end: endOfMonth(currentMonth)
                      });
                      const performanceDates = new Set(
                        (monthlyPerfs || []).filter((p: any) => p.artistId).map((p: any) =>
                          format(new Date(p.performanceDate), 'yyyy-MM-dd')
                        )
                      );
                      return daysInMonth.filter(day =>
                        day >= today && !performanceDates.has(format(day, 'yyyy-MM-dd'))
                      ).length;
                    })()}</h4>
                  </Card>
                </div>
                {renderCalendar(true)}
              </div>
            )
            }

            {
              tab === 'artists' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Input placeholder="Search name..." value={artistSearch} onChange={e => setArtistSearch(e.target.value)} className="flex-1 h-10 rounded-xl bg-slate-50 border-none" />
                        <Button
                          onClick={() => {
                            setEditingArtist(null);
                            setArtistForm({
                              name: "",
                              genres: [],
                              phone: "",
                              instagram: "",
                              grade: "",
                              availableTime: "",
                              preferredDays: [],
                              instruments: {},
                              memberCount: 1,
                              notes: "",
                              realName: "",
                              residentNumber: "",
                              bankAccount: "",
                            });
                            setIsArtistOpen(true);
                          }}
                          className="h-10 rounded-xl font-bold text-xs whitespace-nowrap"
                        >
                          + 아티스트 추가
                        </Button>
                      </div>

                      {/* Genre & Favorite Filters */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button
                          variant={showFavoritesOnly ? "default" : "outline"}
                          size="sm"
                          className={`h-7 rounded-lg text-[10px] font-bold ${showFavoritesOnly ? 'bg-amber-400 text-white border-amber-400 hover:bg-amber-500' : 'text-slate-400 border-slate-200'}`}
                          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        >
                          <Star className={`h-3 w-3 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                          즐겨찾기
                        </Button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        {AVAILABLE_GENRES.map(g => (
                          <button
                            key={g}
                            onClick={() => {
                              setSelectedGenres(prev =>
                                prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                              );
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedGenres.includes(g)
                              ? getGenreStyles(g).bg + ' ring-1 ring-offset-1 ' + getGenreStyles(g).bg.replace('bg-', 'ring-')
                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                              }`}
                          >
                            {g}
                          </button>
                        ))}
                        {selectedGenres.length > 0 && (
                          <button
                            onClick={() => setSelectedGenres([])}
                            className="text-[10px] text-slate-400 underline ml-auto"
                          >
                            필터 초기화
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 px-1">
                      {filteredArtists.map(a => <ArtistCard key={a.id} artist={a} onToggleFavorite={handleToggleFavorite} onEdit={handleEditArtist} onDelete={handleDeleteArtist} getGenreColor={(g) => getGenreStyles(g).bg} />)}
                    </div>
                  </div>
                </div>
              )
            }

            {tab === 'settlement' && <SettlementTab />}
          </div>
        )}
      </main >

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="max-w-[280px] rounded-3xl border-none p-6">
          <DialogHeader><DialogTitle className="text-center font-normal">관리자 로그인</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="password" placeholder="암호" className="h-11 rounded-xl text-center font-normal tracking-widest bg-slate-50 border-none" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
            <Button className="w-full h-11 rounded-xl font-normal text-xs" onClick={handleAdminLogin}>로그인</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Notification Dialog (Management Popup) */}
      <Dialog open={isNoticeOpen} onOpenChange={setIsNoticeOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                공지사항 관리
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
            {/* Form Section */}
            <Card className="border-primary/10 shadow-none bg-slate-50/50 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black opacity-40 uppercase">TITLE</Label>
                  <Input
                    className="h-10 rounded-xl bg-white border-slate-200"
                    placeholder="공지 제목"
                    value={noticeForm.title}
                    onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black opacity-40 uppercase">CONTENT</Label>
                  <Textarea
                    className="rounded-xl bg-white border-slate-200 min-h-[100px]"
                    placeholder="공지 내용"
                    value={noticeForm.content}
                    onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full h-11 rounded-xl font-black text-xs"
                  onClick={handleCreateNotice}
                >
                  {editingNotice ? "수정 완료" : "공지 등록"}
                </Button>
              </CardContent>
            </Card>

            {/* List Section */}
            <div className="space-y-2">
              <Label className="text-[9px] font-black opacity-40 uppercase pl-1">EXISTING NOTICES</Label>
              <div className="space-y-2">
                {trpc.notice.list.useQuery().data?.map((n: any) => (
                  <div key={n.id} className="p-3 bg-white border border-slate-100 rounded-2xl flex items-start justify-between gap-3 group">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{n.title}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{n.content}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditingNotice(n);
                        setNoticeForm({ title: n.title, content: n.content });
                      }}>
                        <Edit2 className="h-3 w-3 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" onClick={() => handleDeleteNotice(n.id)}>
                        <Trash2 className="h-3 w-3 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Assignment Dialog (Daily Management) */}
      <Dialog open={isPerformanceDialogOpen} onOpenChange={(open) => {
        setIsPerformanceDialogOpen(open);
        if (!open) {
          setChangingArtistPerfId(null);
          setChangeArtistSearch("");
        }
      }}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {selectedPerformanceDay && format(selectedPerformanceDay, 'M월 d일')} 공연 관리
                {selectedPerformanceDay && selectedPerformanceDay < today && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">지난 공연 · 사후 수정</span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1">
            {/* 1. Existing Performances List */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black opacity-40 uppercase pl-1">EXISTING PERFORMANCES</Label>
              <div className="space-y-2">
                {(() => {
                  const dailyPerfs = monthlyPerfs?.filter((p: any) =>
                    selectedPerformanceDay && isSameDay(new Date(p.performanceDate), selectedPerformanceDay)
                  ) || [];

                  if (dailyPerfs.length === 0) {
                    return <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">등록된 공연이 없습니다.</div>;
                  }

                  return dailyPerfs.map((p: any) => (
                    <div key={p.id} className={`bg-white border rounded-2xl group ${changingArtistPerfId === p.id ? 'border-indigo-200' : 'border-slate-100'}`}>
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${p.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                            {p.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{p.artistName} <span className="text-[10px] text-slate-400 font-normal">({p.artistMemberCount || 1}명 - {p.artistInstruments || "정보없음"})</span></h4>
                        <div className="flex items-center gap-3 mt-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                          {p.artistInstagram && (
                            <a
                              href={`https://instagram.com/${p.artistInstagram.replace(/^@/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] font-bold text-pink-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Instagram className="h-3 w-3" />
                              @{p.artistInstagram.replace(/^@/, '')}
                            </a>
                          )}
                          {p.artistPhone && (
                            <a
                              href={`tel:${p.artistPhone}`}
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {p.artistPhone}
                            </a>
                          )}
                        </div>
                        {p.notes && p.notes !== "사용자 직접 신청" && (
                          <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                            <p className="text-[11px] text-indigo-700 font-medium leading-relaxed italic">
                              <span className="font-bold not-italic mr-1">📝 요청사항:</span>
                              "{p.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-xl ${changingArtistPerfId === p.id ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
                          title="아티스트 변경"
                          onClick={() => {
                            setChangingArtistPerfId(changingArtistPerfId === p.id ? null : p.id);
                            setChangeArtistSearch("");
                          }}
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                        {p.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                            onClick={async () => {
                              if (confirm("공연을 확정하시겠습니까?")) {
                                try {
                                  await confirmPerformance.mutateAsync({ id: p.id });
                                  toast.success("공연이 확정되었습니다.");
                                } catch (e) {
                                  toast.error("확정 실패");
                                }
                              }
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : p.status === 'confirmed' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl"
                            title="대기 상태로 되돌리기"
                            onClick={async () => {
                              if (confirm("공연을 다시 대기 상태(Pending)로 되돌리시겠습니까?")) {
                                try {
                                  await updatePerformance.mutateAsync({ id: p.id, status: 'pending' });
                                  toast.success("대기 상태로 변경되었습니다.");
                                } catch (e) {
                                  toast.error("변경 실패");
                                }
                              }
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          onClick={async () => {
                            if (confirm("공연을 삭제하시겠습니까?")) {
                              try {
                                await deletePerformance.mutateAsync({ id: p.id });
                                toast.success("공연이 삭제되었습니다.");
                                refetchMonthlyPerfs();
                              } catch (e) {
                                toast.error("삭제 실패");
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {changingArtistPerfId === p.id && (
                      <div className="px-4 pb-4 pt-3 space-y-2 border-t border-indigo-100 bg-indigo-50/30 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">아티스트 변경</Label>
                          <button
                            className="text-[10px] font-bold text-slate-400 underline"
                            onClick={() => { setChangingArtistPerfId(null); setChangeArtistSearch(""); }}
                          >
                            취소
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
                          <Input
                            autoFocus
                            placeholder="변경할 아티스트 이름 검색"
                            value={changeArtistSearch}
                            onChange={e => setChangeArtistSearch(e.target.value)}
                            className="h-9 pl-9 rounded-xl bg-white border-slate-200 text-sm"
                          />
                        </div>
                        <div className="max-h-[180px] overflow-y-auto space-y-1 pr-0.5">
                          {(artists || [])
                            .filter((a: any) => a.id !== p.artistId && a.name.toLowerCase().includes(changeArtistSearch.toLowerCase()))
                            .slice(0, 8)
                            .map((a: any) => (
                              <button
                                key={a.id}
                                onClick={() => handleChangeArtist(p, a)}
                                disabled={updatePerformance.isPending}
                                className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 flex items-center justify-between transition-colors"
                              >
                                <span className="text-xs font-bold text-slate-700">{a.name}</span>
                                <span className="text-[10px] font-medium text-slate-400">{a.memberCount || 1}명 · {a.genre}</span>
                              </button>
                            ))}
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                          공연 건은 그대로 두고 아티스트만 바뀝니다. 팁·입금 상태는 유지되고, 정산 탭의 인원·수당은 새 아티스트 기준으로 다시 계산됩니다.
                        </p>
                      </div>
                    )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* 2. Add New Performance Section */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black opacity-40 uppercase pl-1">ADD NEW PERFORMANCE</Label>

              <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">아티스트 검색</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                    <Input
                      placeholder="아티스트 이름을 입력하세요"
                      value={perfArtistSearch}
                      onChange={e => setPerfArtistSearch(e.target.value)}
                      className="h-10 pl-9 rounded-xl bg-white border-slate-200 text-sm"
                    />
                  </div>
                </div>

                {perfArtistSearch.length > 0 && !selectedArtistForPerformance && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {artists?.map((a: any) => ({
                      ...a,
                      genresArray: typeof a.genre === 'string' ? a.genre.split(',').filter(Boolean) : []
                    }))
                      .filter((a: any) => a.name.toLowerCase().includes(perfArtistSearch.toLowerCase()))
                      .map((artist: any) => (
                        <div
                          key={artist.id}
                          onClick={() => {
                            setSelectedArtistForPerformance(artist.id);
                            setPerfArtistSearch("");
                          }}
                          className="p-3 bg-white hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-slate-700 group-hover:text-emerald-700">{artist.name}</h4>
                            <p className="text-[10px] text-slate-400 group-hover:text-emerald-500">{artist.genre}</p>
                          </div>
                          <Plus className="h-4 w-4 text-slate-300 group-hover:text-emerald-600" />
                        </div>
                      ))}
                  </div>
                )}

                {selectedArtistForPerformance && (() => {
                  const selectedArtist = artists?.find((a: any) => a.id === selectedArtistForPerformance);
                  if (!selectedArtist) return null;
                  return (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-[10px] font-black text-white uppercase tracking-tighter">선택됨</span>
                          <span className="text-[10px] font-black text-emerald-600/60 uppercase">{selectedArtist.genre}</span>
                        </div>
                        <h4 className="font-black text-emerald-900 text-lg">{selectedArtist.name}</h4>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 rounded-full" onClick={() => setSelectedArtistForPerformance(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })()}

                <Button
                  className="w-full h-12 rounded-2xl font-black text-sm shadow-lg shadow-primary/20"
                  disabled={!selectedArtistForPerformance}
                  onClick={async () => {
                    try {
                      const selectedArtist = artists?.find((a: any) => a.id === selectedArtistForPerformance);
                      await createPerformance.mutateAsync({
                        artistId: selectedArtistForPerformance!,
                        title: `${selectedArtist?.name} 공연`,
                        performanceDate: selectedPerformanceDay!,
                        status: 'confirmed',
                        notes: '관리자 직접 추가'
                      });
                      toast.success('공연이 추가되었습니다.');
                      setSelectedArtistForPerformance(null);
                      setPerfArtistSearch("");
                      refetchMonthlyPerfs();
                    } catch (error) {
                      toast.error('공연 추가에 실패했습니다.');
                    }
                  }}
                >
                  공연 추가하기
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              메시지 템플릿
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black opacity-40">TEMPLATE MESSAGE</Label>
              <Textarea
                className="rounded-xl bg-slate-50 border-none min-h-[200px]"
                placeholder="안녕하세요, 작은따옴표입니다...&#10;&#10;다음 달 공연 신청을 받습니다."
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[10px] text-amber-700 font-medium">
                💡 이 템플릿은 매달 아티스트들에게 공연 신청을 요청할 때 사용됩니다.
              </p>
            </div>
            <Button
              className="w-full h-12 rounded-2xl font-black text-sm"
              onClick={async () => {
                try {
                  await updateSetting.mutateAsync({ key: "message_template", value: messageTemplate });
                  toast.success('템플릿이 저장되었습니다.');
                  setIsTemplateOpen(false);
                } catch (error) {
                  toast.error('템플릿 저장 실패');
                }
              }}
            >
              템플릿 저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isArtistOpen} onOpenChange={setIsArtistOpen}>
        <DialogContent className="max-w-md rounded-3xl overflow-y-auto max-h-[85vh] p-6 border-none">
          <DialogHeader><DialogTitle className="font-black text-lg">{editingArtist ? "정보 수정" : "아티스트 추가"}</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[11px] font-medium text-slate-600">이름</Label><Input className="h-10 rounded-xl bg-slate-50 border border-slate-200" value={artistForm.name} onChange={e => setArtistForm({ ...artistForm, name: e.target.value })} /></div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">연락처</Label>
                <Input
                  className="h-10 rounded-xl bg-slate-50 border border-slate-200"
                  placeholder="010-0000-0000"
                  value={artistForm.phone}
                  onChange={e => setArtistForm({ ...artistForm, phone: formatPhoneNumber(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">인스타그램 ID</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
                  <Input
                    className="h-10 pl-7 rounded-xl bg-slate-50 border border-slate-200"
                    placeholder="username"
                    value={artistForm.instagram.replace(/^@/, '')}
                    onChange={e => setArtistForm({ ...artistForm, instagram: e.target.value.replace(/^@/, '') })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">등급</Label>
                <Select value={artistForm.grade} onValueChange={(value) => setArtistForm({ ...artistForm, grade: value })}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border border-slate-200">
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">인원</Label>
                <div className="flex items-center gap-3 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200">
                  <button
                    onClick={() => setArtistForm({ ...artistForm, memberCount: Math.max(1, artistForm.memberCount - 1) })}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center"
                  >-</button>
                  <span className="text-xs font-black min-w-[2ch] text-center">{artistForm.memberCount}</span>
                  <button
                    onClick={() => setArtistForm({ ...artistForm, memberCount: artistForm.memberCount + 1 })}
                    className="w-6 h-6 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center justify-center"
                  >+</button>
                  <span className="text-[10px] font-bold text-slate-400 ml-1">명</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-slate-600">장르</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_GENRES.map(g => {
                  const active = artistForm.genres.includes(g);
                  const genreColors: Record<string, string> = {
                    '어쿠스틱': 'bg-amber-500 border-amber-500',
                    '팝': 'bg-pink-500 border-pink-500',
                    '재즈': 'bg-blue-500 border-blue-500',
                    '포크': 'bg-purple-500 border-purple-500',
                    '인디': 'bg-teal-500 border-teal-500',
                    '락': 'bg-red-500 border-red-500',
                    '발라드': 'bg-rose-500 border-rose-500',
                    '브루스': 'bg-indigo-500 border-indigo-500',
                    '기타': 'bg-gray-500 border-gray-500'
                  };
                  const colorClass = active ? genreColors[g] || 'bg-primary border-primary' : 'bg-white border-slate-200';
                  return <button key={g} onClick={() => setArtistForm({ ...artistForm, genres: active ? artistForm.genres.filter(x => x !== g) : [...artistForm.genres, g] })} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${colorClass} ${active ? 'text-white' : 'text-slate-400'}`}>{g}</button>
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-slate-600">선호 요일/시간</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {WEEK_DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => {
                      const active = artistForm.preferredDays.includes(day);
                      setArtistForm({
                        ...artistForm,
                        preferredDays: active
                          ? artistForm.preferredDays.filter(d => d !== day)
                          : [...artistForm.preferredDays, day]
                      });
                    }}
                    className={`w-8 h-8 rounded-lg text-[10px] font-bold border transition-all ${artistForm.preferredDays.includes(day)
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <Input
                className="h-10 rounded-xl bg-slate-50 border border-slate-200"
                placeholder="예: 18:00 - 22:00"
                value={artistForm.availableTime}
                onChange={e => setArtistForm({ ...artistForm, availableTime: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-slate-600">인원 및 악기구성</Label>
              <div className="grid grid-cols-2 gap-2">
                {INSTRUMENTS.map(i => (
                  <div key={i} className="flex flex-col items-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-primary/20">
                    <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">{i}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setArtistForm({ ...artistForm, instruments: { ...artistForm.instruments, [i]: Math.max(0, (artistForm.instruments[i] || 0) - 1) } })}
                        className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center"
                      >-</button>
                      <span className="text-xs font-black min-w-[1ch] text-center">{artistForm.instruments[i] || 0}</span>
                      <button
                        onClick={() => setArtistForm({ ...artistForm, instruments: { ...artistForm.instruments, [i]: (artistForm.instruments[i] || 0) + 1 } })}
                        className="w-6 h-6 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center justify-center"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div>
                <Label className="text-[11px] font-black text-indigo-700">정산 정보</Label>
                <p className="text-[10px] font-medium text-indigo-400">정산 탭 지급 리스트에 표시됩니다. 관리자만 볼 수 있습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-slate-600">실명</Label>
                  <Input
                    className="h-10 rounded-xl bg-white border border-slate-200"
                    placeholder="홍길동"
                    value={artistForm.realName}
                    onChange={e => setArtistForm({ ...artistForm, realName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-slate-600">주민등록번호</Label>
                  <Input
                    className="h-10 rounded-xl bg-white border border-slate-200 tabular-nums"
                    placeholder="000000-0000000"
                    inputMode="numeric"
                    value={artistForm.residentNumber}
                    onChange={e => setArtistForm({ ...artistForm, residentNumber: formatResidentNumber(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">계좌번호</Label>
                <Input
                  className="h-10 rounded-xl bg-white border border-slate-200"
                  placeholder="은행명 계좌번호 (예: 카카오뱅크 3333-00-0000000)"
                  value={artistForm.bankAccount}
                  onChange={e => setArtistForm({ ...artistForm, bankAccount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-[11px] font-medium text-slate-600">메모</Label><Textarea className="rounded-xl bg-slate-50 border border-slate-200 min-h-[100px]" value={artistForm.notes} onChange={e => setArtistForm({ ...artistForm, notes: e.target.value })} /></div>
            <Button className="w-full h-12 rounded-2xl font-black text-sm" onClick={handleSaveArtistAdmin}>변경사항 저장</Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="py-12 bg-white border-t border-primary/5">
        <div className="container max-w-xl mx-auto px-4 text-center space-y-4">
          <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => window.open('https://www.instagram.com/singlemarks_art/', '_blank')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300">
              <Instagram className="h-6 w-6" />
            </div>
            <div className="mt-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
              @singlemarks_art
            </div>
            <p className="text-[9px] font-bold text-slate-400">인스타그램에서 공연 소식을 확인하세요</p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">
            <span>Since 2026</span>
            <div className="w-1 h-1 rounded-full bg-slate-200" />
            <span>Artist Performance Manager</span>
          </div>
        </div>
      </footer>
    </div >
  );
}
