# 다이빙투어 홈페이지

다이빙투어 모임의 소개, 투어 일정, 회칙, FAQ와 완료된 투어의 사진·영상 링크를 제공하기 위한 정적 홈페이지 저장소입니다.

기존 문서와 이미지 자산 정리, Notion 콘텐츠 구조 설계와 기존 콘텐츠 이관을 완료했습니다. Astro와 TypeScript 기반의 임시 홈페이지를 실행할 수 있습니다. 다음 단계는 홈페이지 UI와 정적 페이지 구현입니다.

## 콘텐츠와 서비스의 역할

- **Notion**: 홈페이지에 표시할 원데이터의 단일 원본
- **GitHub**: 홈페이지 코드, 디자인 자산, 과거 문서와 변경 이력
- **GitHub Pages**: 정적 홈페이지 배포
- **네이버 MYBOX**: 암호로 보호된 사진·영상 보관
- **카카오톡 팀 채널**: MYBOX 접근 암호 공유

Notion의 기준 페이지는 [다이빙투어모임](https://app.notion.com/p/41cfb09f8fa9804a8154e61409cb5d90)입니다.

## 현재 구조

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── architecture.md
│   ├── notion-schema.md
│   └── archive/
├── src/
│   ├── layouts/
│   ├── pages/
│   └── styles/
├── public/
│   ├── downloads/
│   └── images/community/
└── .gitignore
```

- `docs/archive/`: Notion 이관 전 원문과 초기 초안
- `docs/architecture.md`: 홈페이지의 데이터 흐름과 운영 경계
- `docs/notion-schema.md`: Notion 데이터베이스와 공개 조건
- `public/images/community/`: 공개 가능한 커뮤니티 이미지
- `public/downloads/`: 홈페이지에서 배포할 PDF

## 문서 확인

현재 별도의 빌드 시스템은 없습니다. 문서 변경 후 다음 명령으로 기본 상태를 확인합니다.

```sh
rg '^#{1,6} ' README.md AGENTS.md docs
rg 'Version|개정|v[0-9]' docs/archive
find public -type f -maxdepth 3
```

Node.js 24에서 다음 명령을 사용합니다. 개발 서버의 홈페이지 경로는 `/divetour/`입니다.

```sh
npm ci
npm run dev
```

`npm run check`로 타입을 검사하고 `npm run build`로 정적 파일을 `dist/`에 생성합니다. `npm run preview`로 빌드 결과를 로컬에서 확인합니다.

## 보안 원칙

- Notion API 토큰과 MYBOX 암호를 저장소에 기록하지 않습니다.
- MYBOX 암호는 Notion이나 홈페이지에도 저장하지 않고 카카오톡 팀 채널에서만 공유합니다.
- 홈페이지에는 공개 승인을 받은 콘텐츠와 이미지, 암호가 설정된 MYBOX 공유 URL만 표시합니다.
- 정적 페이지와 Notion의 필터는 접근제어 수단으로 간주하지 않습니다.

## 예정된 구현 순서

1. 기존 문서와 이미지 정리
2. Notion 데이터베이스 스키마 확정
3. 기존 콘텐츠를 Notion으로 이관
4. Astro 홈페이지 구현
5. Notion API 연동과 공개 데이터 검사
6. GitHub Actions에서 수동 게시하고 GitHub Pages에 배포

위 순서는 Phase 1의 기본 홈페이지 출시 범위입니다. Phase 2에서는 홈페이지에 운영자 로그인, 게시 화면, 운영자 관리를 추가합니다. 세부 계획은 [프로젝트 인계 문서](docs/project-handoff.md#phase-2-운영자-관리와-게시-화면)에 있습니다.

1~3단계의 이관 결과와 남은 확인 사항은 `docs/content-migration.md`에서 확인할 수 있습니다.
