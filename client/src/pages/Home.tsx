import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, Bell, Star, ChevronLeft, ChevronRight, Search, Calendar, Users, Settings, Lock, Unlock, MessageSquare, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ArtistCard } from "@/components/ArtistCard";
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

const INSTRUMENTS = ["보컬", "기타", "건반", "드럼", "바이올린", "첼로", "콘트라베이스", "관악기"];
const GRADE_OPTIONS = ["S", "A", "B", "C"];

function SearchResults({ query, onSelect }: { query: string; onSelect: (artist: { id: number, name: string, instruments: string | null }) => void }) {
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
            <p className="text-[10px] text-slate-400 group-hover:text-emerald-500">{artist.instruments || "악기 정보 없음"}</p>
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
    console.log("[V2.2] App Initialized");
    console.log("[V2.2] Environment:", import.meta.env.MODE);
  }, []);

  const [isAdmin, setIsAdmin] = useState(() => {
    // Restore login state from localStorage
    const saved = localStorage.getItem('isAdmin');
    return saved === 'true';
  });
  const [password, setPassword] = useState("");
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [tab, setTab] = useState("dashboard");
  const [isArtistOpen, setIsArtistOpen] = useState(false);
  const [selectedPerformanceDay, setSelectedPerformanceDay] = useState<Date | null>(null);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [selectedArtistForPerformance, setSelectedArtistForPerformance] = useState<number | null>(null);

  // New state for multi-date flow
  const [savedArtistId, setSavedArtistId] = useState<number | null>(null);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [selectedArtistInstruments, setSelectedArtistInstruments] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

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
    instruments: {} as Record<string, number>,
    notes: "",
  });

  const [performanceForm, setPerformanceForm] = useState({
    artistId: "",
    timeSlot: "",
    notes: "",
  });

  const [messageTemplate, setMessageTemplate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  });
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [artistSearch, setArtistSearch] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Queries
  const { data: artists, refetch: refetchArtists } = trpc.artist.list.useQuery({
    genre: selectedGenre || undefined,
  }, { enabled: isAdmin });

  const { data: monthlyPerfs, refetch: refetchMonthlyPerfs } = trpc.performance.getMonthly.useQuery({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
  });

  const upcomingMonthlyPerfs = monthlyPerfs?.filter((p: any) => new Date(p.performanceDate) >= today) || [];

  // Mutations
  const createArtist = trpc.artist.create.useMutation();
  const updateArtist = trpc.artist.update.useMutation();
  const deleteArtist = trpc.artist.delete.useMutation();
  const toggleFavorite = trpc.artist.update.useMutation();
  const createPerformance = trpc.performance.create.useMutation();
  const createPending = trpc.performance.createPending.useMutation();
  const deletePerformance = trpc.performance.delete.useMutation();
  const createNotice = trpc.notice.create.useMutation();
  const { data: latestNotice } = trpc.notice.getLatest.useQuery();

  const handleAdminLogin = () => {
    if (password === "6009") {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      setIsLoginOpen(false);
      setPassword("");
      toast.success("관리자로 로그인되었습니다.");
    } else {
      toast.error("비밀번호가 올바르지 않습니다.");
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
      console.log('[DEBUG] Creating notice with data:', noticeForm);
      await createNotice.mutateAsync(noticeForm);
      toast.success("공지가 등록되었습니다.");
      setNoticeForm({ title: "", content: "" });
      setIsNoticeOpen(false);
    } catch (error: any) {
      console.error('[DEBUG] Notice creation failed:', error);
      console.error('[DEBUG] Error message:', error?.message);
      console.error('[DEBUG] Error details:', JSON.stringify(error, null, 2));
      toast.error(`공지 등록 실패: ${error?.message || '알 수 없는 오류'}`);
    }
  };

  const handleSaveProfile = async () => {
    // ... (This function is no longer used in the public flow, but keeping it for now or we can remove/ignore)
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
          notes: "사용자 직접 신청",
        })
      ));

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`${successful}건의 공연 신청이 성공적으로 접수되었습니다!`);
        setSelectedDates([]); // Reset selection
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
  })).filter((a: any) =>
    a.name.toLowerCase().includes(artistSearch.toLowerCase())
  ) : [];

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
      instruments: {},
      notes: artist.notes || "",
    });
    setIsArtistOpen(true);
  };

  const handleToggleFavorite = async (artist: Artist) => {
    try {
      await toggleFavorite.mutateAsync({
        id: artist.id,
        isFavorite: !artist.isFavorite,
      });
      refetchArtists();
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

    const instrumentsString = Object.entries(artistForm.instruments)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");

    try {
      const inputData = {
        name: artistForm.name,
        genre: artistForm.genres.join(","),
        phone: artistForm.phone,
        instagram: artistForm.instagram,
        grade: artistForm.grade,
        availableTime: artistForm.availableTime,
        instruments: instrumentsString,
        notes: artistForm.notes,
      };
      console.log('[V2.2] Saving artist with data:', inputData);

      if (editingArtist) {
        await updateArtist.mutateAsync({
          id: editingArtist.id,
          name: artistForm.name,
          genre: artistForm.genres.join(","),
          phone: artistForm.phone,
          instagram: artistForm.instagram,
          grade: artistForm.grade,
          availableTime: artistForm.availableTime,
          instruments: instrumentsString,
          notes: artistForm.notes,
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
          instruments: instrumentsString,
          notes: artistForm.notes,
        });
        toast.success("등록 완료");
      }
      setIsArtistOpen(false);
      refetchArtists();
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
          {Array(emptySlots).fill(null).map((_, i) => <div key={`empty-${i}`} className="bg-white/50 h-20 sm:h-28" />)}
          {daysInMonth.map((date, i) => {
            const dayNum = date.getDate();
            const weekDay = getDay(date);
            const isSat = weekDay === 6;
            const isSun = weekDay === 0;
            const isPast = date < today;
            const isToday = isSameDay(date, today);

            const perfs = monthlyPerfs?.filter((p: any) => isSameDay(new Date(p.performanceDate), date)) || [];
            const hasConfirmed = perfs.some((p: any) => p.status !== 'pending');
            const isSelected = selectedDates.some(d => isSameDay(d, date));

            return (
              <div
                key={i}
                onClick={() => {
                  if (isPast) return;
                  if (isAdminView) {
                    setSelectedPerformanceDay(date);
                    setIsPerformanceDialogOpen(true);
                  } else {
                    handleDateClick(date);
                  }
                }}
                className={`bg-white h-20 sm:h-28 p-1 sm:p-2 border-t border-l border-primary/5 relative cursor-pointer group transition-all ${isPast ? 'opacity-40 grayscale pointer-events-none' : ''} ${isSelected ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-500 z-10' : 'hover:bg-primary/5'}`}
              >
                <span className={`text-xs font-black ${isToday ? 'bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : ''}`}>
                  {dayNum}
                </span>

                <div className="mt-1 space-y-1 overflow-hidden">
                  {perfs.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        if (isAdminView) {
                          e.stopPropagation();
                          if (confirm(`"${p.title}" 공연을 삭제하시겠습니까?`)) {
                            deletePerformance.mutate({ id: p.id }, {
                              onSuccess: () => {
                                toast.success('공연이 삭제되었습니다.');
                                refetchMonthlyPerfs();
                              },
                              onError: () => toast.error('삭제 실패')
                            });
                          }
                        }
                      }}
                      className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded border font-bold truncate ${p.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} ${isAdminView ? 'hover:bg-red-100 hover:border-red-300 cursor-pointer' : ''}`}
                    >
                      {p.status === 'pending' ? '⌛ ' : '✅ '}{p.title.split(' ')[0]}
                    </div>
                  ))}
                  {!isPast && (
                    isAdminView ? (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-primary/10 transition-opacity">
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    ) : !hasConfirmed && (
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100 bg-indigo-500/10' : 'opacity-0 group-hover:opacity-100 bg-primary/10'}`}>
                        {isSelected ? <Check className="h-6 w-6 text-indigo-600" /> : <Plus className="h-4 w-4 text-primary" />}
                      </div>
                    )
                  )}
                </div>
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
            <div className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
              V2.2 LIVE
            </div>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setIsTemplateOpen(true)}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setIsNoticeOpen(true)}>
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

      <main className="container py-6 px-4 max-w-xl mx-auto flex-1 space-y-6">
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
                              setArtistForm({ ...artistForm, name: artist.name });
                              setSelectedArtistInstruments(artist.instruments || "악기 정보 없음");
                              setIsProfileSaved(true);
                              toast.success(`${artist.name}님, 환영합니다! 이제 날짜를 선택해주세요.`);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsProfileSaved(false);
                        setSavedArtistId(null);
                        setArtistForm({ ...artistForm, name: "" });
                        setSelectedArtistInstruments("");
                      }}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                    >
                      변경
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Selection */}
            <div className={`space-y-4 transition-all duration-700 ${!isProfileSaved ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center justify-between px-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">STEP 02</span>
                  <h3 className="text-lg font-black tracking-tighter">공연 신청 날짜 선택</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xs font-black min-w-[60px] text-center">{format(currentMonth, "M월")}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              {renderCalendar(false)}

              <div className="p-4">
                {selectedDates.length > 0 ? (
                  <Button
                    className="w-full h-14 text-lg font-black rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 animate-in slide-in-from-bottom-4 fade-in"
                    onClick={handleBatchApply}
                  >
                    <span className="mr-2">🚀</span> {selectedDates.length}일 공연 신청하기
                  </Button>
                ) : (
                  <p className="text-[10px] text-center text-slate-400 font-bold">
                    원하시는 날짜를 클릭하여 선택해주세요.<br />
                    선택 후 하단 버튼을 눌러 일괄 신청할 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Admin View */
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              {["dashboard", "artists"].map(t => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-black transition-all rounded-lg ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>
                  {t === 'dashboard' ? '일정관리' : `아티스트${artists ? `(${artists.length})` : ''}`}
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
                          instruments: {},
                          notes: ""
                        });
                        setIsArtistOpen(true);
                      }}
                      className="h-10 rounded-xl font-bold text-xs whitespace-nowrap"
                    >
                      + 아티스트 추가
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {filteredArtists.map(a => <ArtistCard key={a.id} artist={a} onToggleFavorite={handleToggleFavorite} onEdit={handleEditArtist} onDelete={handleDeleteArtist} getGenreColor={(g) => getGenreStyles(g).bg} />)}
                  </div>
                </div>
              )
            }
          </div >
        )}
      </main >

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="max-w-[280px] rounded-3xl border-none p-6">
          <DialogHeader><DialogTitle className="text-center font-black">ADMIN ACCESS</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="password" placeholder="Passcode" className="h-11 rounded-xl text-center font-black tracking-widest bg-slate-50 border-none" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
            <Button className="w-full h-11 rounded-xl font-black text-xs" onClick={handleAdminLogin}>UNLOCK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={isNoticeOpen} onOpenChange={setIsNoticeOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              공지 작성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black opacity-40">TITLE</Label>
              <Input
                className="h-10 rounded-xl bg-slate-50 border-none"
                placeholder="공지 제목"
                value={noticeForm.title}
                onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black opacity-40">CONTENT</Label>
              <Textarea
                className="rounded-xl bg-slate-50 border-none min-h-[150px]"
                placeholder="공지 내용"
                value={noticeForm.content}
                onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })}
              />
            </div>
            <Button
              className="w-full h-12 rounded-2xl font-black text-sm"
              onClick={handleCreateNotice}
            >
              공지 등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Assignment Dialog */}
      <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {selectedPerformanceDay && format(selectedPerformanceDay, 'M월 d일')} 공연 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black opacity-40">ARTIST</Label>
              <Select
                value={selectedArtistForPerformance?.toString() || ""}
                onValueChange={(value) => setSelectedArtistForPerformance(parseInt(value))}
              >
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-none">
                  <SelectValue placeholder="아티스트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {artists?.map((artist: any) => (
                    <SelectItem key={artist.id} value={artist.id.toString()}>
                      {artist.name} ({artist.genre})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-12 rounded-2xl font-black text-sm"
              onClick={async () => {
                if (!selectedArtistForPerformance || !selectedPerformanceDay) {
                  toast.error('아티스트를 선택해주세요.');
                  return;
                }
                try {
                  const selectedArtist = artists?.find((a: any) => a.id === selectedArtistForPerformance);
                  await createPerformance.mutateAsync({
                    artistId: selectedArtistForPerformance,
                    title: `${selectedArtist?.name} 공연`,
                    performanceDate: selectedPerformanceDay,
                    status: 'confirmed',
                    notes: '관리자 직접 추가'
                  });
                  toast.success('공연이 추가되었습니다.');
                  setIsPerformanceDialogOpen(false);
                  setSelectedArtistForPerformance(null);
                  refetchMonthlyPerfs();
                } catch (error) {
                  toast.error('공연 추가에 실패했습니다.');
                }
              }}
            >
              공연 추가
            </Button>
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
              onClick={() => {
                toast.success('템플릿이 저장되었습니다.');
                setIsTemplateOpen(false);
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
              <div className="space-y-1"><Label className="text-[11px] font-medium text-slate-600">연락처</Label><Input className="h-10 rounded-xl bg-slate-50 border border-slate-200" value={artistForm.phone} onChange={e => setArtistForm({ ...artistForm, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[11px] font-medium text-slate-600">인스타그램 ID</Label><Input className="h-10 rounded-xl bg-slate-50 border border-slate-200" placeholder="@username" value={artistForm.instagram} onChange={e => setArtistForm({ ...artistForm, instagram: e.target.value })} /></div>
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
              <Label className="text-[11px] font-medium text-slate-600">악기</Label>
              <div className="grid grid-cols-3 gap-2">
                {INSTRUMENTS.map(i => (
                  <div key={i} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[8px] font-bold mb-1">{i}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setArtistForm({ ...artistForm, instruments: { ...artistForm.instruments, [i]: Math.max(0, (artistForm.instruments[i] || 0) - 1) } })} className="w-4 h-4 rounded bg-white border border-slate-200 text-[10px]">-</button>
                      <span className="text-[10px] font-bold">{artistForm.instruments[i] || 0}</span>
                      <button onClick={() => setArtistForm({ ...artistForm, instruments: { ...artistForm.instruments, [i]: (artistForm.instruments[i] || 0) + 1 } })} className="w-4 h-4 rounded bg-primary text-white text-[10px]">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-[11px] font-medium text-slate-600">메모</Label><Textarea className="rounded-xl bg-slate-50 border border-slate-200 min-h-[100px]" value={artistForm.notes} onChange={e => setArtistForm({ ...artistForm, notes: e.target.value })} /></div>
            <Button className="w-full h-12 rounded-2xl font-black text-sm" onClick={handleSaveArtistAdmin}>변경사항 저장</Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="py-8 bg-slate-50/50"><div className="container text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Jak-Eun-Tta-Om-Pyo. Mobile Ready v2.2</div></footer>
    </div >
  );
}
