# 아티스트 공연 관리 시스템 - TODO

## 데이터베이스 및 백엔드
- [x] Artist 테이블 스키마 설계 (이름, 장르, 연락처, 인스타그램)
- [x] Performance 테이블 스키마 설계 (날짜, 아티스트, 상태)
- [x] 데이터베이스 마이그레이션 실행
- [x] 아티스트 CRUD 프로시저 구현
- [x] 공연 일정 CRUD 프로시저 구현
- [x] 공연 일정 검색/필터 프로시저 구현
- [x] 아티스트 통계 조회 프로시저 구현

## 백엔드 API (tRPC)
- [x] artist.list - 아티스트 목록 조회 (검색, 필터)
- [x] artist.create - 아티스트 등록
- [x] artist.update - 아티스트 정보 수정
- [x] artist.delete - 아티스트 삭제
- [x] artist.getStats - 아티스트별 공연 통계
- [x] performance.list - 공연 일정 조회
- [x] performance.create - 공연 일정 등록
- [x] performance.update - 공연 일정 수정 (드래그 앤 드롭 포함)
- [x] performance.delete - 공연 일정 삭제
- [x] performance.getWeekly - 이번 주 공연 요약
- [x] performance.getMonthly - 이번 달 공연 요약

## 프론트엔드 UI
- [x] DashboardLayout 커스터마이징 (작은따옴표 브랜딩)
- [x] 대시보드 페이지 (이번 주/달 요약)
- [x] 아티스트 관리 페이지 (목록, 검색, 필터)
- [x] 아티스트 등록/수정 모달 또는 폼
- [x] 월간 캘린더 뷰 페이지
- [x] 캘린더 셀 컴포넌트 (날짜별 공연 표시)
- [x] 공연 상태 관리 UI (예정/확정/완료/취소)
- [x] 아티스트별 공연 이력 페이지
- [x] 네비게이션 메뉴 구성

## 기능 구현
- [x] 캘린더 라이브러리 통합 (date-fns)
- [x] 아티스트 검색 및 필터링 로직
- [x] 공연 상태 전환 로직
- [x] 최적화된 업데이트 (optimistic updates)

## 테스트 및 검증
- [x] 아티스트 CRUD 테스트 작성
- [x] 공연 일정 CRUD 테스트 작성
- [x] 전체 통합 테스트 (9 tests passed)

## 배포 준비
- [x] 프론트엔드 미니멀 재작성 (에러 제거)
- [x] 테스트 재실행 (9 tests passed)
- [ ] 체크포인트 생성
- [ ] 사용자에게 프로젝트 전달
