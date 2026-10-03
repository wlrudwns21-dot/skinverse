# Skinverse 사이트 이미지 목록 (제품 사진 제외)

제품·배너 사진은 `docs/image-briefs.md`에 따로 있습니다. 이 문서는 **사이트 자체가
굴러가려면 있어야 하는 이미지**입니다.

`index.html`을 열어 확인한 현재 상태:

```
favicon            없음   → 브라우저 탭에 기본 지구본
apple-touch-icon   없음   → iOS "홈 화면에 추가" 시 화면 캡처 썸네일
PWA 아이콘·manifest 없음   → 안드로이드 설치 불가
og:image           없음   → 카카오톡·인스타·페북에 링크 공유하면 썸네일 없음
meta description   없음   → 검색 결과에 본문 아무 데나 잘려 나감
theme-color        없음   → 모바일 주소창이 흰색 기본
```

**지금 `www.universe-skin.com`을 카카오톡에 붙이면 사진도 설명도 없는 민낯 링크가
나갑니다.** 커머스 사이트에서 이게 가장 손해 보는 자리입니다.

---

## 우선순위

| | 무엇 | 왜 지금 | 형식 |
|---|---|---|---|
| ~~1~~ | ~~OG 이미지~~ | **완료 — `public/og-image.jpg`** | 사진/그래픽 |
| **1** | 파비콘 세트 | 탭·북마크·홈 화면 | 로고마크 |
| **2** | 로고마크(심볼) | 파비콘·앱 아이콘의 원본 | SVG |
| **2** | 워드마크 SVG | 지금은 웹폰트 의존 | SVG |
| ~~3~~ | ~~로그인/회원가입 상단~~ | **완료 — `public/banner/auth.webp`** | 사진 |
| ~~3~~ | ~~주문 완료 화면~~ | **완료 — `public/banner/order-done.webp`** | 사진 |
| **4** | 빈 장바구니·빈 주문 | 있으면 좋음 | **만들지 마세요 — 아래 참고** |

---

## 1. 로고마크(심볼) — 모든 아이콘의 원본

파비콘·앱 아이콘·OG 이미지가 전부 여기서 나옵니다. **이것부터 정해야** 나머지가
일관됩니다. 현재 브랜드 표기는 Marcellus 글꼴의 `SKINVERSE` 글자뿐이고, 심볼이
없습니다.

16px에서도 뭔지 알아볼 수 있어야 하므로 **형태는 하나, 획은 굵게, 디테일은 없이**가
원칙입니다. 스플래시 화면이 이미 "피부를 읽는 스캔 링이 이름으로 수렴한다"는 모티프를
쓰고 있으니(`src/components/Splash.tsx`), 심볼도 그 쪽이 자연스럽습니다.

```
Minimal geometric logo mark for a skincare laboratory brand. A single
perfect circle rendered as a thin ring, with one horizontal line sweeping
across its lower third like a scan line, the line extending slightly past
the ring on both sides. Pure flat vector, two elements only, no gradient,
no shadow, no text. Deep forest green (#1F4A3D) on a transparent
background. Even stroke weight throughout, roughly 8 percent of the ring
diameter. Must stay legible at 16 pixels. Centred in a square canvas with
12 percent padding on all sides.
```

> 대안 모티프 — `circle` 대신 `a simple leaf outline` / `a water droplet
> outline` / `two overlapping circles forming a lens`. 셋 다 같은 프롬프트
> 틀에 끼워 넣고 비교해 보세요.

**납품**: `logo-mark.svg` (벡터) + `logo-mark-1024.png`. 벡터가 없으면 1024px PNG로도
되지만, 벡터가 있어야 어디서든 안 깨집니다.

---

## 2. 파비콘 세트 — 로고마크에서 기계적으로 생성

직접 만들 필요 없습니다. 위 `logo-mark.svg` 하나를 [realfavicongenerator.net]에
넣으면 아래가 전부 나옵니다. 받은 파일을 `public/` 바로 아래에 두세요.

```
public/favicon.ico              32 × 32 (16·32 멀티)
public/favicon.svg              벡터, 최신 브라우저가 이걸 우선 씁니다
public/apple-touch-icon.png     180 × 180, 투명 금지 — 배경 #FCFCFA 채워서
public/icon-192.png             192 × 192
public/icon-512.png             512 × 512
public/icon-512-maskable.png    512 × 512, 안전영역 안쪽 80%에 심볼
public/site.webmanifest
```

> **maskable 주의**: 안드로이드가 아이콘을 원형·물방울 등으로 잘라냅니다. 가장자리
> 10%는 잘려 나간다고 보고, 심볼을 가운데 80% 안에 두세요. 일반 512와 maskable 512는
> **여백이 다른 별개 파일**입니다.

> **apple-touch-icon 주의**: iOS는 투명 배경을 검정으로 채웁니다. 반드시 `#FCFCFA`
> 배경을 깔아서 내보내세요.

---

## 3. OG 이미지 — `public/og-image.png` (1200 × 630)

카카오톡·페이스북·X·슬랙·디스코드에 링크를 붙였을 때 뜨는 썸네일입니다.
**지금 없어서 아무것도 안 뜹니다.**

규칙: 카카오톡은 썸네일을 **가운데에서 정사각형으로 잘라** 보여줍니다. 그러니
**1200×630의 가운데 630×630 안에 모든 것을 넣으세요.** 좌우 285px씩은 잘려 나간다고
보면 됩니다.

### 프롬프트 — 배경 사진

```
Wide editorial photograph for a social share card, 1200x630. A single
unbranded frosted glass dropper bottle and one white ceramic jar arranged
on a pale limestone surface, grouped tightly in the exact centre of the
frame and occupying no more than the middle third of the width. Soft
directional daylight from the upper left, one long gentle shadow. Seamless
warm off-white background, no horizon line. Palette limited to bone white,
warm grey, pale sand and a single trace of deep forest green. The left and
right fifths of the frame are empty background. Calm, clinical, premium
Korean apothecary aesthetic. No text, no labels, no branding, no hands,
no flowers.
```

받은 사진 위에 **워드마크와 한 줄 설명을 얹어서** 최종본을 만듭니다 (가운데
630×630 안에):

```
SKINVERSE
K-BEAUTY · AI SKIN LAB
```

글자는 `#101010`, 사진이 밝으므로 스크림 없이도 읽힙니다.

> 카카오톡용 정사각 버전(`og-image-square.png`, 1200×1200)을 따로 만들면 더
> 깔끔합니다. 같은 사진을 정사각으로 다시 크롭하면 됩니다.

---

## 4. 로그인 / 회원가입 상단 — `public/banner/auth.webp` (1170 × 600, 비율 1.95:1)

가입이 일어나는 화면입니다. 지금은 글자와 입력칸만 있습니다.

```
Soft editorial photograph, 1170x600 horizontal. A close-up of a bare
shoulder and the side of a neck, skin only, no face visible, lit by soft
window light from the left. Warm neutral background out of focus. Palette
of skin tone, bone white and pale grey only. Extremely calm and quiet,
almost abstract. Shallow depth of field. The right half of the frame is
soft out-of-focus background with nothing in it. No text, no jewellery,
no clothing detail, no logos, no face.
```

> 얼굴을 빼는 이유: 가입 화면의 사진은 분위기를 만들 뿐이고, 특정 인물의 얼굴이
> 걸리면 4개 언어 시장 전체에서 그 얼굴이 브랜드가 됩니다. 추상적인 쪽이 안전하고
> 오래갑니다.

---

## 5. 주문 완료 화면 — `public/banner/order-done.webp` (1170 × 480, 비율 2.44:1)

결제가 끝난 직후 "주문 완료 · 서울에서 발송됩니다"가 뜨는 화면입니다.
포장과 발송을 암시하는 사진이 맞습니다.

```
Still life photograph, 1170x480 wide. A plain unbranded cream-coloured
cardboard box, closed, sitting slightly off-centre on a pale concrete
surface, with a length of flat cotton ribbon in sage green lying loosely
beside it. Shot from a low three-quarter angle. Soft diffused daylight,
one gentle shadow. Palette of warm cardboard, bone white, pale concrete
grey and one muted sage green. Quiet, careful, hand-packed feeling — not
industrial. No text, no tape, no labels, no logos, no hands.
```

---

## 5-1. 피부 분석 — **사진을 쓰지 않습니다**

자주 나오는 질문이라 적어 둡니다. 피부 분석 화면에 뜨는 이미지는 **전부 고객 본인의
얼굴**이고, 준비할 사진은 없습니다.

| 단계 | 화면에 뜨는 것 | 출처 |
|---|---|---|
| 촬영 전 | 210 × 270 타원 자리 + 점선 가이드 + 안내 문구 | 비어 있음 (`ImageSlot`) |
| 촬영 중 | 라이브 카메라 + 타원 마스크 | 기기 카메라 (`CameraCapture`) |
| 결과 | 고객 얼굴 위에 항목별 마스크 오버레이 | 고객 사진 + Perfect Corp |

그리고 **얼굴 사진은 저장되지 않습니다.** 코드 전체에 스토리지 업로드 호출이 하나도
없고, Perfect Corp이 돌려주는 마스크 URL도 수명이 짧은 서명 URL이라 화면에만 띄우고
기록에서 복원하지 않습니다. 그러니 "분석 예시 사진"을 만들어 둘 자리도 없습니다.

### 그럼 여기 모델 얼굴 사진을 넣으면 안 되나요

넣지 마세요. 세 가지 이유입니다.

1. 고객이 자기 얼굴을 그 모델과 비교하게 됩니다. 피부 분석은 점수가 나오는
   기능이라 그 비교가 바로 "나는 저것보다 못하다"가 됩니다.
2. ko/en/zh/th 네 시장에 똑같이 나갑니다. 특정 얼굴 하나가 네 시장 전체에서 브랜드가
   됩니다.
3. 정작 전달해야 할 것 — 정면으로, 머리 전체가 들어오게, 안경과 앞머리를 치우고 —
   은 사진보다 **선 도식**이 훨씬 명확합니다. Perfect Corp의 프레이밍 규칙을 못 맞추면
   분석 횟수만 깎이므로, 여기는 분위기가 아니라 정확도의 문제입니다.

### 필요한 건 촬영 가이드 도식이고, 그건 이미지 파일이 아닙니다

`밝고 고른 자연광에서` / `메이크업 없는 맨 피부로` 문구는 이미 있습니다. 여기에 붙을
것은 **얼굴 윤곽 + 타원 가이드 + 좋은 예/나쁜 예**를 그린 선 도식인데, 이건 생성형
이미지로 만들면 안 됩니다 — 선이 흐려지고, 4개 언어 라벨을 못 넣고, 색 토큰을 못
따릅니다. **SVG로 직접 그려서 코드에 넣는 쪽**이 맞습니다. 말씀해 주시면 그리겠습니다.

### 피부 분석의 '얼굴'은 따로 있습니다 — 홈 히어로

고객이 피부 분석을 처음 만나는 곳은 분석 화면이 아니라 **홈 첫 화면의 히어로 배너**
(`/banner/hero.webp`)입니다. "오늘의 피부를 읽어 볼까요 / 측정 시작"이 거기 있습니다.
분석 기능에 사진이 필요하다면 그건 그 히어로 한 장이고, 프롬프트는
`docs/image-briefs.md`의 ① 히어로에 있습니다. **아직 안 만들어진 유일한 배너입니다.**

---

## 6. 빈 상태 — **이미지를 만들지 마세요**

빈 장바구니, 빈 주문 내역, 분석 기록 없음, 문의 없음 — 네 군데입니다.
여기에 일러스트를 넣자는 제안을 자주 받으실 텐데, **이 디자인 방향에서는 넣지 않는
쪽이 맞습니다.**

이유: B2는 사진이 아니면 글자와 선으로만 가는 체계입니다. 여기에만 삽화가 들어오면
그 삽화가 앱에서 유일한 이종 요소가 되고, 네 군데에 각각 다른 그림이 들어가는
순간 "40가지 색"과 똑같은 문제가 다시 생깁니다.

대신 할 일은 **문구를 다음 행동으로 바꾸는 것**입니다. 이건 이미지가 아니라 글이고,
제가 지금 바로 할 수 있습니다 — 원하시면 말씀해 주세요.

---

## 7. 워드마크 SVG — `public/logo-wordmark.svg`

지금 헤더의 `SKINVERSE`는 Marcellus 웹폰트에 의존합니다. 폰트가 늦게 뜨면 다른
글꼴로 잠깐 보였다가 바뀝니다. **이건 생성형 이미지가 아니라 폰트를 윤곽선으로
변환하는 작업**이라, 프롬프트가 아니라 절차입니다:

1. Figma/Illustrator에서 Marcellus로 `SKINVERSE`를 자간 0.15em으로 입력
2. 윤곽선으로 변환 (Outline Stroke / Create Outlines)
3. SVG로 내보내기, `fill` 속성 제거 → 코드에서 `currentColor`로 색을 넘깁니다

---

## 톤 참고 — 이미 있는 사진

새 사진은 `public/stories/` 의 기존 6장과 같은 톤이어야 합니다. 그 사진들이
이미 정답에 가깝습니다: 연한 모래색, 세이지 그린, 부드러운 창문 빛, 채도 낮음,
연출 티 안 나는 다큐멘터리 느낌. 프롬프트를 쓸 때 그 사진들을 참조 이미지로 같이
넣으면 결과가 훨씬 붙습니다.

색 기준값:

```
배경  #FCFCFA      글자  #101010
강조  #1F4A3D      주의  #8A4A18
```

---

## 넣고 나서 해야 할 일

파비콘·OG 이미지는 **파일만 넣는다고 적용되지 않습니다.** `index.html`에 메타
태그를 넣어야 하고, 그건 코드 작업입니다. 파일을 `public/`에 넣어주시면 제가
`index.html`에 아래를 한 번에 추가하겠습니다:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#FCFCFA">
<meta name="description" content="…">
<meta property="og:title" content="…">
<meta property="og:description" content="…">
<meta property="og:image" content="https://www.universe-skin.com/og-image.png">
<meta property="og:url" content="https://www.universe-skin.com">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

> `og:image`는 **반드시 절대 URL**이어야 합니다. `/og-image.png`처럼 상대 경로로
> 쓰면 카카오톡이 못 읽습니다.
