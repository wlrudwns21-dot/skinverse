# 제품 이미지를 저장소 밖으로

## 왜

저장소 41MB 중 40MB가 상세페이지 타일 526장입니다. 제품 하나 등록할 때마다
2~3MB씩 늘어납니다.

Vercel은 배포할 때마다 깃허브에서 저장소 전체를 받아갑니다. 이미 한 번
실패했습니다:

```
Production deployment failed — commit 8658e6c
GitHub fetch error - status: 403
"You have exceeded a secondary rate limit."
```

그 배포가 실패한 탓에 그 이후 등록한 제품 이미지가 서버에 올라가지 않은
상태로 운영됐습니다.

**압축은 답이 아니었습니다.** 타일을 품질 82에서 68로 다시 인코딩하면
21~35% 줄어드는데, 작은 글씨가 빽빽한 마케팅 페이지라 그 절감을 가독성으로
지불하게 됩니다. 40MB가 29MB 되자고 할 일이 아닙니다.

## 어떻게 되어 있나

경로는 그대로 둡니다. DB의 `products.image`는 여전히
`/products/<id>/main.webp`이고, 타일도 그대로
`/products/<id>/detail/<lang>/<n>.webp`로 계산됩니다. **앞에 붙는 것만**
바뀝니다.

```
VITE_MEDIA_BASE 없음  →  /products/...                     (이 사이트에서)
VITE_MEDIA_BASE 설정  →  <base>/products/...               (버킷에서)
```

`src/lib/media.ts`가 그 한 줄을 담당합니다. 비워두면 지금까지와 똑같이
동작하므로, 설정 안 한 체크아웃·`vite dev`·프리뷰 빌드가 전부 그대로
돌아갑니다. 되돌리는 것도 환경변수 하나를 지우면 됩니다.

## 버킷

`product-media`, 공개, 파일당 5MB 제한, webp/png/jpeg만.

**공개로 둔 이유** — 쇼핑몰입니다. 같은 이미지를 제품 페이지 여는 누구에게나
이미 보여주고 있으니 서명 URL은 아무것도 보호하지 못하면서 타일마다 왕복을
한 번씩 더 만듭니다. 비공개로 둘 것이 여기 들어가는 일은 없습니다 — 얼굴
사진은 처리 후 폐기되고 스토리지에 닿지 않습니다.

**쓰기 권한** — API로는 아무도 못 씁니다. `storage.objects`에 RLS가 켜져
있고 INSERT/UPDATE/DELETE 정책이 하나도 없어서, anon과 authenticated의 쓰기는
전부 거부됩니다. 업로드는 service_role 키를 가진 운영자가 아래 스크립트로만
합니다. 제품 사진을 덮어쓸 수 있는 유일한 자격증명이 브라우저에 가지 않습니다.

## 올리기

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<Dashboard > Project Settings > API> \
node scripts/upload-media.mjs --dry-run      # 먼저 무엇을 올릴지만 봅니다

SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-media.mjs
```

**service_role 키는 명령 한 줄 동안만 셸에 두고 끝냅니다.** `.env.local`에도,
Vercel에도, 커밋에도, 채팅에도 넣지 마세요. 스크립트가 `.env.local`에서 그
키를 발견하면 실행을 거부합니다.

이미 올라간 파일 중 크기가 같은 것은 건너뜁니다. 그래서 다시 돌려도 안전하고,
제품을 추가한 뒤에도 새 파일만 올라갑니다.

## 올린 뒤

1. Vercel 환경변수에 `VITE_MEDIA_BASE`를 넣습니다
   (`https://<project>.supabase.co/storage/v1/object/public/product-media`).
2. 재배포하고 제품 페이지를 엽니다 — 대표사진과 상세 아트워크 둘 다.
   어드민 `상품 관리` 맨 위에 지금 어디서 가져오는지 표시됩니다.
3. **그게 확인된 다음에** `public/products`를 저장소에서 지웁니다.

순서가 중요합니다. 먼저 지우면 버킷이 비어 있는 동안 매장에 사진이 사라집니다.

## 저장소에 남는 것

`public/banner`, `public/stories`, OG 이미지 — 사이트 아트워크입니다. 제품
미디어가 아니고 제품마다 늘지도 않으니 그대로 둡니다.
