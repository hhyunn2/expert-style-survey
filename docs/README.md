# 전문가 스타일 편집 설문 GitHub Pages

이 폴더는 GitHub Pages에서 바로 배포할 수 있는 정적 설문 사이트입니다.

## 배포 URL

GitHub 계정: `hhyunn2`

권장 저장소 이름이 `expert-style-survey`라면 배포 주소는 아래처럼 됩니다.

```text
https://hhyunn2.github.io/expert-style-survey/
```

사용자/조직 사이트 저장소인 `hhyunn2.github.io`에 올리면 주소는 아래처럼 됩니다.

```text
https://hhyunn2.github.io/
```

## 파일 구성

- `index.html`: 설문 화면
- `styles.css`: 화면 스타일
- `app.js`: 이미지 쌍 생성, 임시 저장, JSON 백업, 온라인 전송
- `config.js`: GitHub 사용자명, 이미지 기본값, 온라인 저장 엔드포인트 설정
- `assets/default-image.svg`: 임시 이미지 자리
- `backend/google-apps-script.gs`: Google Sheets 저장용 Apps Script 예시

## GitHub Pages 설정

1. GitHub에서 새 저장소를 만듭니다.
2. 이 `docs/` 폴더를 저장소에 올립니다.
3. 저장소 `Settings` > `Pages`로 이동합니다.
4. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
5. Branch는 `main`, folder는 `/docs`로 설정합니다.

GitHub 공식 문서:

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 이미지 교체

현재 모든 이미지 슬롯은 `assets/default-image.svg`를 사용합니다.

실제 이미지를 넣을 때는 이미지 파일을 `assets/`에 추가한 뒤 `app.js`의 `pairs` 구조를 확장하거나,
각 이미지 슬롯의 hidden value와 `img src`를 직접 바꾸면 됩니다.

## 추천 응답 저장 방식

가장 추천하는 방식은 `Google Apps Script + Google Sheets`입니다.

- GitHub Pages는 정적 호스팅이라 서버 코드를 직접 실행하지 않습니다.
- Apps Script 웹 앱을 설문 전송 엔드포인트로 만들면 응답을 Google Sheets에 자동 저장할 수 있습니다.
- `NOTIFICATION_EMAIL`을 설정하면 새 응답이 올 때 이메일 알림도 받을 수 있습니다.
- 응답 수가 많지 않은 전문가 인터뷰 설문에는 설정 비용과 유지보수 부담이 낮습니다.

공식 문서:

- Apps Script 웹 앱: https://developers.google.com/apps-script/guides/web
- Apps Script 할당량: https://developedrs.google.com/apps-script/guides/services/quotas

## Google Sheets 연결 순서

1. Google Sheets에서 새 스프레드시트를 만듭니다.
2. 주소의 `/d/`와 `/edit` 사이에 있는 값을 복사합니다. 이것이 `SPREADSHEET_ID`입니다.
3. Apps Script에서 새 프로젝트를 만들고 `backend/google-apps-script.gs` 내용을 붙여넣습니다.
4. `SPREADSHEET_ID`를 실제 값으로 바꿉니다.
5. 이메일 알림을 원하면 `NOTIFICATION_EMAIL`에 본인 이메일을 넣습니다.
6. `Deploy` > `New deployment` > `Web app`을 선택합니다.
7. `Execute as`는 `Me`, `Who has access`는 `Anyone`으로 설정합니다.
8. 배포 후 나온 Web app URL을 `config.js`의 `submitEndpoint`에 넣습니다.

```js
window.SURVEY_CONFIG = {
  githubUser: "hhyunn2",
  submitEndpoint: "https://script.google.com/macros/s/....../exec",
  noCors: true,
  defaultImage: "assets/default-image.svg",
  storageKey: "expert-style-survey-draft"
};
```

## 대안

- Formspree: 가입 후 엔드포인트를 form action 또는 fetch 대상으로 쓰면 빠르게 이메일/대시보드 수집이 가능합니다. 커스텀 설문 UI를 유지하기 쉽지만 무료/유료 플랜 제한을 확인해야 합니다. https://help.formspree.io/hc/en-us/articles/27638977431699-Building-an-HTML-Form
- Netlify Forms: GitHub Pages 대신 Netlify로 배포해도 된다면 정적 HTML 폼 수집이 쉽습니다. https://docs.netlify.com/forms/setup/
- Supabase/Firebase: 로그인, 권한, 대량 응답, 별도 분석 DB가 필요하면 좋지만 지금 설문에는 설정 부담이 큽니다.

## 개인정보 주의

이 설문은 직무/경력 등 개인을 간접 식별할 수 있는 답변을 받을 수 있습니다. 공개 저장소에 실제 응답이나 Google Sheet ID가 아닌 민감한 토큰을 넣지 말고, 수집 목적과 보관 기간을 응답자에게 별도로 고지하는 편이 좋습니다.
