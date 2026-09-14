# Chat

_Started 2026-09-14 10:59 UTC_

---

## User

Continuing from "AI 피부관리 직구몰 플랫폼".

## Assistant

We've been building Skinverse, an AI-powered Korean skincare direct-purchase platform targeting foreign customers (Japan, China, Thailand, global). The platform analyzes users' skin via AI photo analysis, recommends personalized products based on results, suggests weather/humidity-adaptive routines, and rewards completion of daily missions with points.

Decisions made:
- Mobile web interactive prototype with 9 core screens (home, AI analysis with photo capture, product recommendations, weather-based routines, missions & points, product detail/cart, checkout with PayPal sandbox, shipping, mypage)
- 4-language support: English, Korean, Chinese, Thai — switchable via header icon or mypage settings
- Points system: earned on purchase, usable as discount, tiered levels with streak bonuses, redeemable for product samples
- Real-time weather routine logic: city selection triggers humidity/UV-based AM/PM skincare advice
- DHL & EMS shipping options, PayPal sandbox payment integration

Current state:
- Consumer platform (Skinverse.dc.html) fully functional with all screens, translations, navigation, and Tweaks for demo scenarios
- Admin dashboard (Skinverse Admin.dc.html) built: KPI overview, order management with auto-shipment tracking, product inventory control, user/points/mission configuration, CS queue handling
- Both platforms linked via "스토어 보기" bridge in admin
- Header mypage button replaced YT icon with language-appropriate label

Next steps:
- Review both platforms for any UX refinements or missing flows
- Consider real weather API integration (currently static demo data)
- Define admin user roles/permissions if needed

Files: Skinverse.dc.html, Skinverse Admin.dc.html, image-slot.js, support.js

