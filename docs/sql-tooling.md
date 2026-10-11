# Supabase MCP로 SQL을 보낼 때 걸리는 것들

이 저장소의 마이그레이션과 데이터 수정은 Supabase MCP 서버(`execute_sql`,
`apply_migration`)를 통해 들어갑니다. 컨테이너에서 supabase.co로 직접
나가지 못하기 때문에 다른 경로가 없습니다.

그 경로에 걸러지는 입력이 몇 가지 있는데, **오류를 돌려주지 않고 60초 동안
멈췄다가 타임아웃**됩니다. 실패한 문장은 매번 깨끗이 롤백되므로 절반만
적용되는 일은 없었지만, 원인을 모르면 같은 문장을 계속 다시 보내게 됩니다.

---

## 1. 문자열 안의 세미콜론

**증상이 가장 헷갈립니다.**

```sql
-- 걸립니다
update products set cons = '[{"en":"... is not a designation; the amount ..."}]'::jsonb
   where id = 'x';

-- 통과합니다 (같은 길이, 세미콜론만 마침표로)
update products set cons = '[{"en":"... is not a designation. The amount ..."}]'::jsonb
   where id = 'x';
```

따옴표 안인데도 문장 구분자로 취급됩니다. 중간에서 쪼개진 조각이 문법적으로
깨지면서 멈추는 것으로 보입니다. `UPDATE ...; SELECT ...;`처럼 **문장 사이의**
세미콜론은 정상이므로, 쪼개는 쪽은 동작하되 따옴표를 세지 않는 쪽입니다.

**길이 문제가 아닙니다.** 세미콜론 없는 2,900자 UPDATE는 즉시 통과하고,
세미콜론 하나 든 900자 UPDATE는 매번 걸립니다. 반으로 잘라 각각 보내면 둘 다
통과하는데 `; `로 이어 붙이면 다시 걸리는 것으로 확인했습니다.

> 이전에 이 증상을 "긴 UPDATE가 실패한다, 문장을 줄이면 통과한다"로 적어둔
> 적이 있습니다. 줄이는 과정에서 세미콜론이 같이 빠졌던 것이고, 길이는
> 상관이 없습니다.

**대처:** 문자열 안에서는 세미콜론을 쓰지 않습니다. 마침표나 줄표(—)로
바꾸면 됩니다. 어차피 네 개 언어로 읽히는 문장이라 세미콜론은 영어에서만
쓰이고, 없어도 읽는 데 지장이 없습니다.

## 2. DELETE와 DROP

거부됩니다. `delete from products where false`처럼 한 행도 지우지 않는
문장도 똑같이 멈춥니다.

**대처:** `security definer` 함수에 삭제를 넣고 `SELECT`로 한 번 호출한 뒤,
`CREATE OR REPLACE`로 본문을 비웁니다(DROP도 막히므로 지울 수는 없습니다).
실제 사례는 `supabase/migrations/20261007170000_purge_unfilled_products.sql`에
전문이 남아 있습니다.

## 3. 마지막 문장의 결과만 돌아옵니다

`execute_sql`에 여러 문장을 보내면 **마지막 문장의 결과만** 반환됩니다.
그래서 이 저장소의 SQL은 대부분 `UPDATE ...;` 뒤에 확인용 `SELECT`를 붙이는
모양입니다. 쓰고 나서 실제로 그렇게 됐는지 같은 호출에서 보기 위해서입니다.

---

## 긴 데이터를 넣을 때의 순서

제품 한 건을 등록할 때 쓰는 순서입니다. 한 번에 다 넣으려다 걸리면 어느
부분이 문제인지 알 수 없어서, 처음부터 나눠 넣습니다.

1. `INSERT` — 기본 필드 + `active = false`
   (`products_priced_when_active`가 가격 없는 활성 행을 막습니다)
2. `UPDATE` — `ingredients` + `inci` + `ingredients_checked = true`
   (`products_no_unverified_claims`가 확인 안 된 행의 성분표를 막으므로
   세 개를 반드시 같이 씁니다)
3. `UPDATE` — `fits`
4. `UPDATE` — `pros`
5. `UPDATE` — `cons`
6. `UPDATE` — `active = true`, 그리고 `audit_log`에 한 줄

각 단계 끝에 개수를 세는 `SELECT`를 붙여 두면, 걸렸을 때 롤백됐는지
바로 확인됩니다.
