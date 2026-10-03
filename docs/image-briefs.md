# Skinverse 이미지 제작 브리프 (B2 · 랩 + 사진)

앱에 들어갈 사진은 **네 종류**입니다. 파일을 아래 경로에 두면 그 자리에 바로 들어가고,
없는 동안에는 회색 자리표시자가 같은 크기로 서 있습니다 — 레이아웃은 사진 유무와
상관없이 똑같습니다.

| 슬롯 | 쓰이는 곳 | 파일 경로 | 화면 크기 | 비율 | 납품 크기(3배) |
|---|---|---|---|---|---|
| ① 히어로 | 홈 첫 화면 | `public/banner/hero.webp` | 390 × 318 | 1.23 : 1 | **1170 × 954** |
| ② 에디토리얼 | 홈 · 성분 분석 배너 | `public/banner/ingredients.webp` | 390 × 228 | 1.71 : 1 | **1170 × 684** |
| ③ 가로 스트립 | (현재 미사용 · 혜택 공지용 예비) | `public/banner/promo.webp` | 390 × 112 | 3.48 : 1 | **1170 × 336** |
| ④ 상품 · 저널 | 상품 그리드, 스토리 카드 | `public/stories/<id>.webp` 등 | — | **4 : 5 세로** | **1050 × 1313** |

---

## 모든 사진에 공통으로 적용되는 규칙

1. **아래 40%는 글자가 덮습니다.** ①②는 사진 위에 흰 글자가 올라가고, 그 글자를 읽히게
   하려고 아래쪽에 어두운 그라데이션이 자동으로 깔립니다. **중요한 피사체는 위쪽 60%에**
   두세요. 모델 얼굴이 아래쪽에 있으면 그라데이션에 묻힙니다.
2. **좌우 20px 안쪽에는 중요한 것을 두지 마세요.** 기기 폭에 따라 살짝 잘립니다.
3. **색은 앱 팔레트 안에서.** 앱 전체가 흰 바탕(#FCFCFA) + 짙은 초록(#1F4A3D) +
   무채색입니다. 사진에 채도 높은 빨강·파랑·노랑이 크게 들어가면 혼자 튑니다.
   **피부톤, 흰색, 유리, 미색, 아주 연한 초록** 범위를 유지하세요.
4. **파일은 WebP, 장당 200KB 이하.** 3배 크기로 만들고 저장할 때 품질 80 정도로 줄이면
   대개 이 안에 들어옵니다.
5. **사진의 네 변은 앱이 페이지 바탕색으로 부드럽게 흐립니다.** 가장자리에 중요한 것을
   두지 마세요 — 위아래 16%, 좌우 11%가 흐려집니다.
6. **글자를 사진 안에 넣지 마세요.** 문구는 앱이 그립니다. 사진 속 한글/영문 텍스트는
   4개 언어(ko/en/zh/th) 중 하나에서만 맞게 되므로 반드시 빼야 합니다.

---

## ① 히어로 — `public/banner/hero.webp` (1170 × 954)

홈을 여는 사진입니다. 제목과 버튼이 사진 위에 올라갑니다.
**아래 40%에는 피사체를 두지 마세요** — 글자가 덮습니다.

### 프롬프트 A### 프롬프트 A### 프롬프트 A — 인물 (권장)

```
Editorial beauty photograph of a Korean woman in her late twenties, bare
clean skin with no visible makeup, head and shoulders, turned three-quarters
away from camera and looking down and to the left. She occupies the upper
two-thirds of the frame with her head near the top edge. Soft diffused
north-facing window light from the left, gentle falloff, no hard shadows,
no specular highlights on the skin. Background is a plain seamless wall in
warm off-white, very slightly out of focus. Muted desaturated palette of
skin tone, bone white and pale grey. Shot on a 85mm lens at f/2.0, shallow
but not blurred. Calm, quiet, clinical-but-warm mood. No text, no logos,
no jewellery, no props. Vertical-ish 1170x954 crop, lower third of the
frame intentionally empty and uncluttered.
```

### 프롬프트 B — 제품 연출 (인물 없이 가고 싶을 때)

```
Still life photograph of a single unbranded frosted glass skincare dropper
bottle standing on a pale limestone surface, positioned in the upper left
third of the frame. Soft directional daylight from the upper left casting
one long soft shadow to the lower right. Background is a smooth warm
off-white plaster wall. Palette strictly limited to bone white, warm grey,
pale sand and a trace of deep green reflection in the glass. Minimalist
Japanese-Korean apothecary aesthetic. Shot on a 100mm macro at f/5.6, sharp
and still. The lower 40 percent of the frame is empty surface with nothing
on it. No text, no labels, no branding, no flowers.
```

### 프롬프트 C — 질감 클로즈업

```
Extreme close-up macro photograph of a clear skincare serum droplet spreading
on smooth bare skin, filling the upper portion of the frame. Soft wraparound
light, no harsh reflections. Shallow depth of field so the edges fall away
gently. Palette is skin tone and translucent clear with a cool highlight.
Fine skin texture visible and natural — pores and fine hairs are present and
not retouched away. The lower part of the frame softens into unfocused warm
shadow. 1170x954. No text, no product, no hands in frame.
```

---

## ② 에디토리얼 — `public/banner/ingredients.webp` (1170 × 684)

성분 분석 기능으로 들어가는 배너입니다. "성분을 읽습니다 / 전성분을 식약처 등록 정보와
대조하고, 어린이 제한 성분을 확인합니다"가 아래에 올라갑니다.
**어두운 쪽 그라데이션**이 깔리므로 밝은 사진이어도 괜찮습니다.

### 프롬프트 A — 라벨을 읽는 손 (권장 · 기능이 바로 전달됨)

```
Close-up editorial photograph of two hands holding an unbranded white
cosmetic tube and turning it to read the back. Shot from slightly above and
behind, so the hands and the tube sit in the upper two-thirds of the frame.
The tube's back panel is plain white with no readable text. Soft diffused
daylight, cool neutral white balance. Background is a pale grey-green
surface, softly out of focus. Palette of white, pale sage green and skin
tone only. Natural unmanicured hands. 100mm lens, f/4, calm documentary
feel. 1170x684 horizontal. No text anywhere, no visible brand, no nail
polish.
```

### 프롬프트 B — 실험실 톤

```
Minimalist laboratory still life: a row of three small clear glass vials on
a brushed stainless surface, shot straight on from slightly above, placed
across the upper half of a wide horizontal frame. Cool even light from a
large softbox overhead, soft reflections on the metal. Palette of steel
grey, clear glass, and a single deep green liquid in the centre vial.
Clean, precise, scientific but not cold. 1170x684. Lower half of the frame
is empty reflective surface. No text, no labels, no hands.
```

---

## ②-2 하늘 — `public/banner/sky-*.webp` (1170 × 780, 비율 1.5:1)

루틴 화면의 "오늘의 판단 기준" 블록 뒤에 깔립니다. **현재 위치의 실제 날씨에 따라
자동으로 바뀝니다** — 기상청(Open-Meteo)이 주는 WMO 코드를 읽어서 네 가지 중 하나를
고릅니다. 네 장 다 있어야 하고, 하나라도 없으면 그 날씨일 때만 단색으로 떨어집니다.

| 파일 | 언제 뜨나 |
|---|---|
| `sky-clear.webp` | 맑음 (코드 0–1) |
| `sky-cloud.webp` | 구름·흐림·안개 (2, 3, 45, 48) |
| `sky-rain.webp` | 이슬비·비·소나기·뇌우 (51–67, 80–82, 95–99) |
| `sky-snow.webp` | 눈·진눈깨비 (71–77, 85, 86) |

> **네 장을 반드시 같은 자리에서 찍은 것처럼 만드세요.** 같은 화각, 같은 구도, 날씨만
> 다르게. 날씨가 바뀔 때 장면 자체가 바뀌면 화면이 덜컹거립니다.
>
> **글자가 전면에 올라갑니다.** 아래 60%는 하늘이나 흐린 배경만 두고 구조물·전선·
> 글자를 넣지 마세요. 글자는 검은색으로 올라가므로 **전체적으로 밝아야** 합니다.

```
A wide photograph of the sky, 1170x780, shot straight upward at a shallow
angle from a quiet residential street in Seoul, with the top edge of a plain
pale building just entering the lower left corner and nothing else in frame.
[날씨: a cloudless pale blue sky with soft morning haze / a soft overcast sky
of flat pale grey cloud, no texture / a rain-grey sky with fine rain visible
as soft streaks against pale cloud / a pale winter sky with light snow
falling, flakes soft and out of focus]. Muted, desaturated, high key —
the whole frame is light. Soft natural daylight, no sun flare, no strong
colour. The lower 60 percent of the frame is open sky with nothing in it.
No text, no birds, no wires, no aircraft, no buildings beyond that one corner.
```

> 대괄호 안만 바꾸고 나머지는 글자 하나 건드리지 마세요 — 그래야 네 장이 한 장소로
> 읽힙니다.

---

## ③ 가로 스트립 — `public/banner/promo.webp` (1170 × 336)

혜택·공지용 예비 슬롯입니다. **지금 앱에서는 쓰고 있지 않습니다** — 홈의 그 자리에는
사진 없는 검은 띠(오늘의 미션)가 들어가 있습니다. 나중에 프로모션을 띄울 때 씁니다.

> 글자가 **왼쪽에** 들어가므로, 사진의 **왼쪽 45%는 단색이나 아주 흐린 배경**으로
> 비워 두세요. 사진 없이 단색만으로도 성립하는 자리입니다.

```
Wide horizontal banner photograph, 1170x336. The left 45 percent is an
empty smooth surface of deep charcoal-green with a soft gradient, completely
free of any object. On the right side, a loose arrangement of two unbranded
white skincare jars seen from above at a slight angle, lit with soft
directional light from the right. Palette strictly deep green, charcoal,
and warm white. Moody, low-key, generous negative space on the left.
No text, no labels, no branding.
```

---

## ④ 상품 · 저널 — 4 : 5 세로 (1050 × 1313)

상품 그리드와 스토리 카드가 쓰는 세로 사진입니다. 정사각형보다 화보처럼 읽힙니다.

> **이게 가장 중요합니다 — 배경 톤을 전부 똑같이 맞추세요.** 제품마다 배경색이 다르면
> 격자가 지저분해집니다. 한 번 배경을 정하면 전 제품에 같은 배경을 씁니다.
> 현재 앱의 자리표시자는 `#E3E6E4` / `#E9E6E1` / `#E4E5E8` 세 가지 아주 연한 무채색을
> 돌려 쓰고 있습니다. 실제 사진 배경도 이 정도 밝기(아주 연한 회색빛)로 가면 됩니다.

### 상품 컷

```
Product photograph of a single unbranded [제품 형태: frosted glass serum
bottle / white ceramic cream jar / matte white sunscreen tube] standing
centred in a vertical 4:5 frame, 1050x1313. Seamless background in very
pale warm grey (#E9E6E1), edge to edge, with no visible horizon line. Soft
large-source light from the upper left, one gentle soft shadow falling to
the lower right. The product occupies the middle 60 percent of the frame
height with generous empty space above and below. Palette limited to the
background grey, white, and the product's own material. Sharp, still,
catalogue-clean. 100mm macro, f/8. No text, no labels, no branding, no
props, no reflections of a studio.
```

> 제품별로 바꿀 것은 **대괄호 안의 제품 형태 하나뿐**입니다. 배경색·조명·구도는 글자
> 하나 바꾸지 말고 그대로 두세요. 그게 격자를 정돈하는 방법입니다.

### 저널(스토리) 컷

```
Editorial lifestyle photograph in a vertical 4:5 frame, 1050x1313, on the
theme of [주제: an evening skincare routine / a dry winter morning / sun
protection]. A quiet domestic scene with soft natural window light, muted
and desaturated, palette of warm white, pale grey and skin tone. Shallow
depth of field. Documentary rather than posed — no eye contact with the
camera, no smiling-at-lens stock photography feel. Background is simple and
uncluttered. No text, no visible brands, no logos.
```

---

## 넣는 방법

1. 받은 파일을 WebP로 바꿉니다. (`cwebp -q 80 input.png -o hero.webp`)
2. `public/banner/` 폴더에 위 표의 이름 그대로 넣습니다. 폴더가 없으면 만드세요.
3. 끝입니다. 코드는 건드릴 필요가 없습니다 — 파일이 있으면 사진이, 없으면 자리표시자가
   나옵니다. 파일 이름이 틀리거나 깨져도 앱은 자리표시자로 돌아가지 깨지지 않습니다.
