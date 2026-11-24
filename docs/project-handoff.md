# 다이빙투어 홈페이지 프로젝트 인수인계

최종 갱신일: 2026. 11. 24

작업 위치: `/Users/hyunmook/proj/divingtour`

GitHub 저장소: `https://github.com/hyunmock/divetour`

이 문서는 새로운 AI 에이전트 세션에서 기존 결정과 작업 상태를 잃지 않고 홈페이지 구축을 이어가기 위한 기준 문서입니다. 새 세션에서는 먼저 이 문서와 루트의 `AGENTS.md`를 끝까지 읽습니다.

## 1. 프로젝트 목표

다이빙투어 모임의 다음 정보를 제공하는 정적 홈페이지를 만듭니다.

- 모임 소개와 가입 안내
- 예정 및 완료 투어 일정
- 공식 회칙과 FAQ
- 완료된 투어의 사진·영상 링크

콘텐츠는 Notion을 단일 원본으로 관리하고, Astro가 빌드 시 공개 승인된 데이터만 가져와 GitHub Pages에 배포합니다.

```text
Notion
  ├─ 투어 일정
  ├─ 회칙
  ├─ FAQ
  └─ 사진·영상 메타데이터
          ↓ 빌드 시 공개 데이터만 조회
Astro + GitHub Actions
          ↓
GitHub Pages
          ↓ 외부 링크
암호가 설정된 네이버 MYBOX
```

MYBOX 접근 암호는 홈페이지, Notion, GitHub 또는 빌드 로그에 저장하지 않고 카카오톡 팀 채널에서만 공유합니다.

## 2. 반드시 먼저 읽을 문서

새 작업을 시작하기 전에 다음 순서로 읽습니다.

1. `AGENTS.md`: 저장소 기여 규칙과 보안 경계
2. `README.md`: 현재 구조와 운영 개요
3. `docs/project-handoff.md`: 전체 작업 상태와 다음 작업
4. `docs/architecture.md`: 시스템별 책임과 데이터 흐름
5. `docs/notion-schema.md`: Notion 속성과 공개 조건
6. `docs/content-migration.md`: 기존 콘텐츠 이관 결과와 확인 필요 항목

정책 원문을 확인해야 할 때는 `docs/archive/`의 문서를 참고합니다.

## 3. 현재 Git 상태

문서 작성 직전 상태는 다음과 같습니다.

```text
현재 브랜치: feat/migrate-notion-content
원격 추적: origin/feat/migrate-notion-content
작업 트리: 깨끗함
```

관련 커밋:

```text
d8afaa9 docs: Notion 콘텐츠 이관 결과 기록
b112e44 chore: 홈페이지 구조와 Notion 스키마 정리
7198315 origin/main
```

브랜치 관계:

```text
origin/main
  └─ chore/restructure-site-and-notion-schema  (b112e44)
       └─ feat/migrate-notion-content          (d8afaa9)
```

2026. 11. 24 확인 시 두 작업 브랜치 모두 Pull Request가 아직 생성되지 않았습니다.

- `chore/restructure-site-and-notion-schema`
- `feat/migrate-notion-content`

`feat/migrate-notion-content`가 앞선 구조 변경 커밋을 포함하므로 다음 중 하나를 선택합니다.

1. 두 단계를 한 번에 반영하려면 `feat/migrate-notion-content`에서 `main`으로 PR 생성
2. 단계별 검토가 필요하면 먼저 구조 변경 브랜치를 `main`에 병합한 뒤 콘텐츠 이관 브랜치를 최신 `main` 기준으로 정리

사용자 지시 없이 강제 푸시, 리베이스 또는 기존 브랜치 삭제를 하지 않습니다.

## 4. 저장소 구조

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── architecture.md
│   ├── content-migration.md
│   ├── notion-schema.md
│   ├── project-handoff.md
│   └── archive/
│       ├── community-rules.md
│       ├── faq.md
│       ├── initial-draft.md
│       ├── welcome.md
│       └── writing-guide.md
└── public/
    ├── downloads/community-rules.pdf
    └── images/community/
        ├── divingtour-room.png
        ├── divingtour-room-circle.png
        ├── staff-room.png
        ├── staff-room-circle.png
        └── staff-room-circle-alt.png
```

`staff-room-circle-alt.png`은 기존 `운영진방 cicle.png`과 다른 이미지이므로 중복으로 삭제하지 않고 변형 자산으로 보존했습니다.

## 5. 완료된 단계

기본 홈페이지 계획은 10단계입니다. 5~8단계 구현과 테스트 데이터 검증을 마쳤으며 실서비스 연동 검증이 남았습니다.

| 단계 | 제목 | 상태 |
|---:|---|---|
| 1 | 저장소 구조 정리 | 완료 |
| 2 | Notion 정보 구조 및 스키마 구축 | 완료 |
| 3 | 기존 콘텐츠를 Notion으로 이관 | 완료 |
| 4 | Astro 프로젝트 기반 구축 | 완료 |
| 5 | 홈페이지 UI와 정적 페이지 구현 | 완료 |
| 6 | Notion API 빌드 연동 | 구현 완료 · 실인증 검증 대기 |
| 7 | 완료 투어와 MYBOX 미디어 연결 | 구현 완료 · 공개 앨범 검증 대기 |
| 8 | 콘텐츠·보안·접근성 검증 | 테스트 빌드 검증 완료 · 실제 빌드 대기 |
| 9 | GitHub Actions 수동 게시와 GitHub Pages 배포 | 대기 |
| 10 | 공식 홈페이지 전환 | 대기 |

### 5.1 저장소 구조 정리

- 루트의 기존 문서를 `docs/archive/`로 이동
- PDF를 `public/downloads/`로 이동
- 이미지를 `public/images/community/`로 이동하고 영문 이름 적용
- `README.md`와 `AGENTS.md` 개편
- `.env`, `node_modules`, `dist`, `.astro` 제외 규칙 추가
- 아키텍처와 Notion 스키마 문서 작성

### 5.2 Notion 구조 및 스키마 구축

기준 페이지: [다이빙투어모임](https://app.notion.com/p/41cfb09f8fa9804a8154e61409cb5d90)

생성한 일반 페이지:

- [홈페이지 관리](https://app.notion.com/p/422fb09f8fa981b7b12eda9a9edf1a7a)
  - [모임 안내 (가입 안내 포함)](https://app.notion.com/p/422fb09f8fa981bb825fdb887bffcb54)
- [회칙](https://app.notion.com/p/422fb09f8fa9812a9541d9837fb10c4f)
- [콘텐츠 운영 안내](https://app.notion.com/p/422fb09f8fa981eba197c9ab976fc309)

생성한 데이터베이스:

| 데이터베이스 | 페이지 URL | 데이터 소스 ID |
|---|---|---|
| 투어 일정 | [열기](https://app.notion.com/p/422fb09f8fa981bfa850f47dbcc11a36) | `collection://422fb09f-8fa9-8176-929e-000b67ed0edb` |
| FAQ | [열기](https://app.notion.com/p/422fb09f8fa981a88caddabd7047d591) | `collection://422fb09f-8fa9-815d-8abd-000bcffc6514` |
| 사진·영상 | [열기](https://app.notion.com/p/422fb09f8fa9817887e1ef91d2fb959e) | `collection://422fb09f-8fa9-8118-923f-000b8da66bd5` |

사진·영상 DB의 `관련 투어`와 투어 일정 DB의 `사진·영상`은 양방향 관계입니다.

### 5.3 기존 콘텐츠 이관

투어 일정 8건을 이관했습니다.

- 2026년 10월 강릉
- 2027년 1월 풀장 연습
- 2027년 1월 양양
- 2027년 3월 팔라우
- 2027년 5월 코론 다이빙
- 2027년 추석 해외 투어 후보
- 2027년 12월 시밀란 후보
- 2028년 1월 팔라우 후보

검증 결과:

- 투어 8건, 고유 슬러그 8개
- 8건 모두 `상태 = 제안`
- 8건 모두 `공개 여부 = 해제`, `기록 공개 = 해제`
- FAQ 20건, 표시 순서 1~20, 중복 없음
- FAQ 20건 모두 `공개 여부 = 해제`
- 회칙 버전 0.1.1과 개정 이력 이관
- 모임 소개와 가입 안내 작성
- 기존 Notion `다이빙투어계획`과 저장소 원문 보존

팔라우와 코론은 상세 내용을 새 투어 레코드 본문에 옮기고 기존 페이지 링크를 남겼습니다.

## 6. 확정된 설계 결정

### 기술과 배포

- 프레임워크: Astro + TypeScript
- 출력: 정적 사이트
- 원데이터: Notion
- 코드와 배포 이력: GitHub
- 배포 대상: GitHub Pages
- 예상 주소: `https://hyunmock.github.io/divetour/`
- 기존 ChatGPT Site는 새 사이트 검증 전까지 유지

### 콘텐츠

- Notion이 홈페이지 콘텐츠의 단일 원본
- GitHub에는 같은 콘텐츠를 편집 원본으로 중복 관리하지 않음
- 기존 Markdown은 이관 검증용 기록으로 보존
- Notion의 공개 속성을 통과한 콘텐츠만 빌드

### 사진과 영상

- 원본 저장소: 네이버 MYBOX
- 홈페이지와 Notion에는 암호가 설정된 MYBOX 공유 URL만 기록
- 암호는 카카오톡 팀 채널에서만 공유
- 완료된 투어에 여러 사진·영상 레코드를 연결할 수 있음
- 투어와 미디어 양쪽의 공개 조건을 만족해야 홈페이지에 표시

## 7. 보안 규칙

다음 정보는 절대 저장소, Notion 또는 정적 산출물에 기록하지 않습니다.

- Notion API 토큰
- MYBOX 접근 암호
- 공개 동의를 받지 않은 개인 연락처
- 비공개 Notion 콘텐츠의 전체 데이터

중요한 구현 원칙:

- Notion API는 브라우저에서 호출하지 않음
- 토큰은 GitHub Actions Secrets와 로컬 `.env`에서만 사용
- `.env.example`에는 변수 이름만 기록
- 비공개 데이터를 브라우저로 내려보낸 뒤 CSS나 JavaScript로 숨기지 않음
- Notion 보기 필터는 접근제어 수단으로 간주하지 않음
- 빌드 코드에서 공개 조건을 다시 검사
- Notion 조회 또는 검증 실패 시 새 배포를 중단하고 기존 사이트 유지

## 8. 공개 조건

투어는 다음 조건을 만족할 때 홈페이지에 표시합니다.

```text
공개 여부 = 선택됨
상태 != 취소
필수 표시 데이터가 유효함
```

완료 투어의 사진·영상은 다음 조건을 모두 만족해야 합니다.

```text
투어 상태 = 완료
투어 공개 여부 = 선택됨
투어 기록 공개 = 선택됨
미디어 공개 상태 = 공개
MYBOX URL 존재
링크가 만료되지 않음
```

링크가 종료된 투어 기록은 투어 페이지는 유지하되 미디어 링크를 숨기고 공개 종료 안내를 표시합니다.

## 9. 운영진 확인이 필요한 사항

현재 콘텐츠는 모두 비공개이므로 다음 항목을 확인하기 전에는 공개 속성을 활성화하지 않습니다.

1. 각 투어의 현재 상태와 실제 완료 여부
2. 월 단위로만 기록된 투어의 정확한 날짜
3. 인솔강사와 제안자 이름의 홈페이지 공개 동의
4. 회칙의 시행일
5. 회칙과 FAQ 20건의 홈페이지 공개 승인
6. 팔라우와 코론 상세 정보의 최신성
7. 홈페이지에 사용할 대표 이미지의 공개 동의

이 확인은 Astro 기반 구축을 막지는 않지만 실제 콘텐츠 공개 전에는 반드시 완료해야 합니다.

## 10. 4단계 Astro 프로젝트 기반 구축

이 단계에서는 Notion API를 아직 연결하지 않고 실행 가능한 정적 프로젝트 기반까지만 만듭니다.

### 세부 작업

1. 현재 브랜치와 PR 병합 상태 확인
2. 적절한 기준 브랜치에서 새 작업 브랜치 생성
3. Astro + TypeScript 프로젝트 초기화
4. GitHub Pages 하위 경로 설정
5. 기본 폴더와 공통 레이아웃 생성
6. 임시 홈 페이지 구현
7. 전역 스타일과 기본 디자인 토큰 작성
8. 개발, 검사, 빌드 스크립트 정의
9. `.env.example` 작성
10. 로컬 정적 빌드와 민감정보 검사
11. 문서 갱신, 커밋 및 원격 푸시

### 권장 구조

```text
src/
├── components/
├── layouts/
│   └── BaseLayout.astro
├── pages/
│   └── index.astro
├── lib/
├── styles/
│   └── global.css
└── types/
```

### Astro 설정

GitHub Pages의 저장소 하위 경로를 고려합니다.

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hyunmock.github.io",
  base: "/divetour",
  output: "static",
});
```

이미지와 내부 링크를 `/images/...`처럼 루트 기준으로 고정하면 GitHub Pages에서 깨질 수 있습니다. Astro의 base URL을 고려한 경로를 사용합니다.

### 예상 환경변수 이름

실제 값은 작성하지 않습니다.

```dotenv
NOTION_TOKEN=
NOTION_TOURS_DATABASE_ID=
NOTION_FAQ_DATABASE_ID=
NOTION_MEDIA_DATABASE_ID=
NOTION_RULES_PAGE_ID=
NOTION_ABOUT_PAGE_ID=
NOTION_JOIN_PAGE_ID=
```

### 4단계 완료 조건

- 의존성 설치 가능
- `npm run dev` 실행 가능
- `npm run build` 성공
- 정적 산출물이 `dist/`에 생성됨
- GitHub Pages base 경로가 반영됨
- 실제 비밀정보가 저장소에 없음
- 임시 홈 페이지가 모바일과 데스크톱에서 정상 표시됨

## 11. 이후 단계

### 5단계: 홈페이지 UI와 정적 페이지 구현

- 홈, 모임 소개, 가입 안내
- 투어 목록, 예정 투어, 완료 투어와 상세 페이지
- 회칙, FAQ 페이지와 개별 투어의 사진·영상 링크
- Header, Footer, TourCard, MediaCard 등 공통 컴포넌트
- 모바일 우선 반응형과 키보드 접근성

### 6단계: Notion API 빌드 연동

- 서버 또는 빌드 환경 전용 Notion 클라이언트
- Notion 데이터를 홈페이지 모델로 변환
- 공개 조건과 필수 필드 검증
- API 실패 시 빌드 중단
- 브라우저 번들에 토큰과 비공개 원본이 포함되지 않는지 검사

### 7단계: 완료 투어와 MYBOX 미디어 연결

- 투어와 사진·영상 관계 조회
- 완료 투어 상세 페이지에 연결된 미디어 표시
- MYBOX 링크에 `nofollow noopener noreferrer` 적용
- 암호는 카카오톡 팀 채널에서 확인한다는 안내
- 종료 또는 만료된 링크 숨김

### 8단계: 콘텐츠·보안·접근성 검증

- Notion 원본과 사이트 내용 비교
- 개인정보와 비공개 데이터 검사
- 내부 및 외부 링크 검사
- 모바일, 태블릿, 데스크톱 확인
- 키보드 탐색, 색상 대비, 이미지 대체 텍스트 확인
- 회칙 PDF와 Notion 원본 일치 확인

### 5~8단계 검증 기록

- Notion 커넥터로 확인한 결과 투어 8건과 FAQ 20건 모두 비공개이며 사진·영상은 0건입니다.
- Node.js 24에서 타입 검사와 공개 조건 회귀 테스트를 통과했습니다. 토큰이 없으면 정적 빌드가 중단됩니다.
- 분리된 테스트용 Notion 응답으로 정적 페이지 12개를 생성했습니다. Chrome에서 375·768·1440px 너비와 내부 링크를 확인했습니다. 모바일의 키보드 본문 이동과 axe 접근성 검사를 통과했습니다.
- 회칙 PDF의 버전 표기 오류를 발견해 공식 회칙 0.1.1로 다시 생성했습니다. 두 페이지의 본문을 원본과 대조하고 한글과 페이지 경계를 확인했습니다. 승인 전 PDF는 정적 산출물에서 제외합니다.
- 실제 읽기 토큰이 설정된 환경에서 빌드한 후 현재 공개 승인 상태와 산출물을 대조해야 합니다. 공개 승인된 MYBOX 자료가 생기면 실제 링크와 암호 보호도 확인합니다.

### 9단계: GitHub Actions 수동 게시와 GitHub Pages 배포

- PR에서 검사와 빌드
- 기본 브랜치에 `workflow_dispatch`를 선언한 게시 워크플로 추가
- 저장소 쓰기 권한이 있는 담당자가 GitHub의 Actions 탭에서 게시 워크플로와 기본 브랜치를 선택하고 **Run workflow** 실행
- 게시 시점에 공개 승인된 Notion 콘텐츠를 조회해 검증·빌드한 뒤 배포
- Notion 편집 후 수동 게시 전까지 기존 사이트가 유지되는지 확인
- GitHub Actions Secrets 등록
- 실패 시 기존 배포 유지

### 10단계: 공식 홈페이지 전환

- 운영진 검토
- Notion 변경 반영 테스트
- MYBOX 암호 보호 테스트
- 기존 공유처 링크 교체
- 기존 ChatGPT Site를 일정 기간 유지
- 안정화 후 기존 사이트 종료 여부 결정

### Phase 2 운영자 관리와 게시 화면

기존 1~10단계는 Phase 1입니다. 기본 홈페이지 출시 후 다음 순서로 운영 기능을 추가합니다.

1. **운영자 지정과 해제** — 최초 관리 책임자를 지정합니다. 책임자는 로그인 계정을 확인해 운영자 권한을 부여하거나 회수할 수 있습니다. 운영자는 게시할 수 있고, 운영자 명단 변경은 책임자에게만 허용합니다. 마지막 책임자의 권한을 회수하려면 먼저 후임을 지정합니다.
2. **관리 화면** — 로그인하면 현재 게시 버전과 마지막 성공 시각, 최근 게시 결과를 보여줍니다. 책임자에게는 운영자 목록과 권한 부여·회수 기능을 제공합니다. 콘텐츠 편집은 계속 Notion에서 진행합니다.
3. **게시 화면** — 운영자가 최신 Notion 공개 자료를 반영한다는 안내를 확인하고 게시를 요청합니다. 진행 중 중복 요청을 방지하고, 완료되면 홈페이지 링크를, 실패하면 원인 요약과 재시도 동작을 제공합니다.
4. **권한과 기록 검증** — 서버가 게시와 명단 변경 권한을 각각 확인합니다. 저장소 쓰기 권한이 없는 운영자도 관리 화면에서 게시할 수 있는지 확인합니다. 로그아웃 상태, 권한 회수 직후, 운영자의 명단 변경 시도를 검증합니다. 게시와 권한 변경 이력에는 실행자, 시각, 결과를 남깁니다.

## 12. 새 세션 시작 체크리스트

새 에이전트는 다음 순서로 시작합니다.

```sh
pwd
git status -sb
git log --oneline --decorate -5
git remote -v
rg '^#{1,6} ' AGENTS.md README.md docs/project-handoff.md
```

그다음 다음 사항을 확인합니다.

- 현재 브랜치가 이 문서와 일치하는지
- 두 기존 브랜치가 `main`에 병합됐는지
- 작업 트리에 사용자 변경사항이 있는지
- Notion 페이지와 데이터베이스가 여전히 존재하는지
- 실제 Notion 빌드 검증과 9단계가 다음 작업인지, 사용자가 우선순위를 바꿨는지

작업 시작 전 사용자에게 항상 다음 형식으로 상태를 알립니다.

1. 전체 10단계와 각 단계 상태
2. 현재 작업할 단계의 번호와 제목
3. 해당 단계의 세부 작업
4. 완료 조건과 다음 단계

## 13. 기본 검사 명령

현재 문서 중심 상태에서는 다음 검사를 사용합니다.

```sh
rg '^#{1,6} ' README.md AGENTS.md docs
rg 'Version|개정|v[0-9]' docs/archive
find public -type f -maxdepth 3
git diff --check
```

Astro가 추가된 뒤에는 `npm run check`와 `npm run build`를 필수 검사에 추가하고 README와 AGENTS에 실제 명령을 기록합니다.

## 2026. 11. 25 운영 방식 변경

사진·영상은 별도 데이터베이스로 관리하지 않고 각 투어 상세 본문의 암호가 설정된 MYBOX 공유 폴더 링크로 안내합니다. 위 초기 설계와 이관 기록의 사진·영상 데이터베이스 설명은 당시 상태를 기록한 내용입니다. 현재 스키마는 `docs/notion-schema.md`를 따릅니다.
