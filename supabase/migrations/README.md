# 마이그레이션

이 디렉터리는 Supabase 프로젝트에 **이미 적용된** 스키마를 그대로 옮겨 놓은 것입니다.
파일 이름은 Supabase가 기록한 `version_name` 형식이고, 내용은
`supabase_migrations.schema_migrations`에 저장된 SQL과 글자 단위로 일치합니다.

여기 있는 이유는 하나입니다 — **스키마가 코드 리뷰와 복구의 대상이 되도록.**
DB에만 있던 동안에는 권한이 언제 어떻게 바뀌었는지 diff로 볼 방법이 없었고,
프로젝트가 사라지면 재현할 방법도 없었습니다.

## 한 군데만 DB와 다릅니다

`..140036_admin_role_and_policies`와 `..140916_split_master_and_admin_roles`의
**운영자 시드 이메일 두 개는 `example.com`으로 가려 놓았습니다.** 나머지 26개 파일은
DB 기록과 글자 단위로 같지만 이 둘은 아닙니다.

이 저장소는 공개되어 있고, 이 설계에서는 **운영자의 이메일 주소가 곧 관리자 신원**입니다
(`is_admin()`이 `auth.jwt()->>'email'`을 `admin_users`와 대조합니다). 주소를 공개하면
공격자가 "어느 계정을 노릴 것인가"라는 질문에 스스로 답할 필요가 없어집니다.
비밀번호가 여전히 필요하니 그 자체로 뚫리는 건 아니지만, 굳이 알려줄 이유도 없습니다.

실제 주소는 DB의 `admin_users` 테이블에 있습니다.

## 새 마이그레이션을 추가할 때

파일을 여기에 만드는 것만으로는 아무 일도 일어나지 않습니다. 적용은 별도입니다:

```bash
supabase link --project-ref pfovxylewqthuhecfgvx
supabase db push
```

반대로, 대시보드나 MCP로 DB를 직접 고쳤다면 그 변경은 여기 없습니다.
`supabase db pull`로 내려받아 커밋해 주세요.

## 읽는 순서

시간순이 곧 이야기 순서입니다. 특히 이 셋은 앞의 것을 고치는 내용이라
함께 읽어야 뜻이 통합니다:

| 먼저 | 그다음 | 무엇이 틀렸었나 |
| --- | --- | --- |
| `..141449_server_side_points` | `..142231_lock_points_column_properly` | `revoke update (points)`가 테이블 전체 권한에서는 컬럼을 깎아내지 못함 |
| `..141449_server_side_points` | `..141530_claim_mission_explicit_row_count` | `FOUND` 대신 `row_count`를 명시적으로 읽도록 |
| `..151227_analysis_usage_quota` | `..015443_quota_local_midnight...` | 할당량이 UTC 자정에 초기화되던 문제 |

`..170313_fn_hits_debug`와 `..180324_drop_fn_hits_debug_table`은 한 쌍입니다 —
임시 디버그 테이블을 만들고 다시 지웁니다. 지운 이유는 그 테이블이 읽는 사람도
없이 요청 메타데이터를 쌓고 있었기 때문입니다.
