ActivityPub 인스턴스를 위한 서버를 구현할 때, ActivityPub 프로토콜은 크게 두 가지 API 레이어를 제공합니다: 클라이언트-서버 프로토콜(Social API)과 서버-서버 프로토콜(Federation Protocol). 서버 구현 시 이 두 가지 중 하나만 구현하거나 둘 다 구현할 수 있습니다.

핵심은 "액터(Actor)"라는 개념입니다. 사용자는 서버의 계정을 통해 "액터"로 표현되며, 모든 액터는 **수신함(inbox)**과 **발신함(outbox)**이라는 URL 엔드포인트를 가지고 있습니다. 이 엔드포인트들이 메시지 송수신에 사용됩니다.

아래는 각 API 레이어별 주요 경로, 동작, 입력값 및 출력값에 대한 상세 내용입니다.

---

### **1. 액터(Actor) 정의 및 주요 속성**

ActivityPub에서 액터는 ActivityStreams 액터 타입 중 하나일 수 있지만, 필수는 아닙니다 (예: Profile 객체가 액터로 사용될 수 있음). 액터는 ActivityPub의 다른 객체처럼 검색됩니다.
모든 액터는 다음 속성을 **반드시** 가져야 합니다:

- `id`: 액터의 고유 전역 식별자 (URI).
- `type`: 액터 객체의 타입 (예: "Person").
- **`inbox`**: 액터가 수신한 모든 메시지를 포함하는 [ActivityStreams] `OrderedCollection`에 대한 참조입니다.
- **`outbox`**: 액터가 생성한 모든 메시지를 포함하는 [ActivityStreams] `OrderedCollection`입니다.

구현 시 다음 속성을 **제공해야 합니다(SHOULD)**:

- `following`: 이 액터가 팔로우하는 액터들의 [ActivityStreams] 컬렉션 링크.
- `followers`: 이 액터를 팔로우하는 액터들의 [ActivityStreams] 컬렉션 링크.

---

### **2. 클라이언트-서버 상호작용 (Client to Server Interactions)**

이 프로토콜은 클라이언트가 사용자 대신 작업을 수행할 수 있도록 합니다. 예를 들어, 모바일 앱이 사용자의 소셜 스트림과 상호작용할 때 사용됩니다. 클라이언트는 액터의 프로필에서 `outbox` URL을 찾아 활동(Activity)을 POST하여 상호작용합니다.

#### **2.1. 발신함(Outbox)에 활동(Activity) 전송 (POST)**

- **API 경로**: 액터의 `outbox` URL (예: `https://social.example/alyssa/outbox/`).
- **HTTP 메서드**: **`POST`**.
- **입력값**:
  - **요청 헤더**: `Content-Type: application/ld+json; profile="https://www.w3.org/ns/activitystreams"`. (`application/activity+json`도 동등하게 해석될 수 있음).
  - **요청 본문**: 단일 Activity 객체 (임베디드 객체 포함 가능) 또는 단일 비-Activity 객체.
  - **인증**: `Authorization` 헤더를 통해 `outbox` 소유 사용자의 자격 증명으로 **반드시** 인증되어야 합니다.
- **서버 동작**:
  - 클라이언트가 `id` 속성 값을 제출하더라도 서버는 이를 무시하고 Activity에 대한 새로운 `id`를 **반드시** 생성합니다.
  - 비-Activity 객체가 제출된 경우, 서버는 이를 `Create` Activity로 감싸야 합니다.
  - 객체에 지정된 `to`, `bto`, `cc`, `bcc`, `audience` 속성은 새로운 `Create` Activity로 **반드시** 복사되어야 합니다.
  - 서버는 전송 전에 `bto` 및/또는 `bcc` 속성을 제거해야 하지만, 원래 주소 지정을 활용하여 수신자를 결정해야 합니다.
  - 새로운 Activity를 `outbox` 컬렉션에 추가해야 합니다.
  - Activity 유형에 따라 추가적인 부수 효과를 수행해야 합니다 (아래 `2.3` 참조).
  - 클라이언트-서버 지원을 구현하지 않은 서버는 `405 Method Not Allowed` 응답을 반환해야 합니다.
- **출력값**:
  - **HTTP 상태 코드**: `201 Created`.
  - **응답 헤더**: `Location` 헤더에 새로 생성된 Activity의 `id` 포함 (임시(transient) Activity가 아닌 경우).

#### **2.2. 발신함(Outbox) 또는 수신함(Inbox)에서 메시지 읽기 (GET)**

- **API 경로**: 액터의 `outbox` 또는 `inbox` URL (예: `https://social.example/alyssa/inbox/`, `https://social.example/alyssa/outbox/`).
- **HTTP 메서드**: **`GET`**.
- **입력값**:
  - **요청 헤더**: `Accept: application/ld+json; profile="https://www.w3.org/ns/activitystreams"` **반드시** 지정. (`application/activity+json`도 권장).
- **서버 동작**:
  - **`outbox` GET**: 요청자의 권한에 따라 사용자가 게시한 Activity를 필터링하여 반환합니다. 인증 없이 요청하면 모든 공개 게시물을 반환해야 합니다.
  - **`inbox` GET**: 액터가 수신한 모든 Activity를 반환합니다. 요청자의 권한에 따라 내용을 필터링해야 합니다. 서버는 `inbox`에서 반환되는 Activity의 중복을 **반드시** 제거해야 합니다.
  - 서버는 HTTP 콘텐츠 협상 및 자체 인증 규칙을 구현할 수 있습니다.
  - 권한 확인에 실패한 요청은 `403 Forbidden` 또는 객체의 존재 자체가 기밀인 경우 `404 Not Found`로 응답해야 합니다.
- **출력값**: 요청된 ActivityStreams 객체 표현.

#### **2.3. 클라이언트-서버 상호작용을 위한 특정 활동(Activity)의 부수 효과 (POST to Outbox 시)**

클라이언트가 `outbox`에 Activity를 제출할 때, 서버는 다음 Activity 유형에 따라 부수 효과를 수행해야 합니다:

- **`Create` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: `object` 속성에 포함된 객체가 생성됩니다. Activity의 액터는 객체의 `attributedTo` 필드에 복사되어야 합니다.
- **`Update` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: 객체가 새 구조를 반영하도록 수정되어야 합니다. 클라이언트-서버 상호작용에서는 부분 업데이트로 작동하며, `null` 값은 필드 제거를 의미합니다.
- **`Delete` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: 서버는 객체를 `Tombstone`으로 대체할 수 있습니다. 삭제된 객체가 요청되면 서버는 `410 Gone` (Tombstone 포함) 또는 `404 Not Found`로 응답해야 합니다.
- **`Follow` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: 나중에 `Accept` Activity를 수신하여 `Follow` Activity를 `object`로 참조하는 경우에만 서버는 `object` (팔로우하는 액터)를 해당 액터의 `following` 컬렉션에 추가해야 합니다.
- **`Add` Activity**:
  - `object` 및 `target` 속성 **필수**.
  - **부수 효과**: 서버는 `object`를 `target` 속성에 지정된 컬렉션에 추가해야 합니다 (권한이 있고 허용되는 경우).
- **`Remove` Activity**:
  - `object` 및 `target` 속성 **필수**.
  - **부수 효과**: 서버는 `object`를 `target` 속성에 지정된 컬렉션에서 제거해야 합니다 (권한이 있고 허용되는 경우).
- **`Like` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: 서버는 `object`를 액터의 `liked` 컬렉션에 추가해야 합니다.
- **`Block` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: 서버는 차단된 사용자(`object` 속성)가 Block Activity를 게시한 액터가 게시한 객체와 상호작용하지 못하도록 방지해야 합니다. 서버는 Block Activity를 `object`에 전달해서는 안 됩니다.
- **`Undo` Activity**:
  - `object` 속성 **필수**.
  - **부수 효과**: 이전 Activity의 부수 효과를 취소합니다 (예: `Like` 취소 시 좋아요 카운트 감소).
  - **예외**: `Create` Activity는 `Delete`를, `Add` Activity는 `Remove`를 사용해야 합니다.

---

### **3. 서버-서버 상호작용 (Server to Server Interactions)**

이 프로토콜은 액터 간 활동을 다른 서버로 분산시켜 동일한 소셜 그래프로 연결하는 데 사용됩니다. 서버는 액터의 `inbox` 엔드포인트에 Activity를 POST하여 다른 서버와 통신하고 정보를 전파합니다.

#### **3.1. 수신함(Inbox)에 활동(Activity) 전송 (POST - 배달/Delivery)**

- **API 경로**: 대상 액터의 `inbox` URL (예: `https://chatty.example/ben/inbox/`).
- **HTTP 메서드**: **`POST`**.
- **입력값**:
  - **요청 헤더**: `Content-Type: application/ld+json; profile="https://www.w3.org/ns/activitystreams"`. (`application/activity+json`도 동등하게 해석될 수 있음).
  - **요청 본문**: Activity 객체 (임시(transient)가 아닌 경우 `id`를 **반드시** 가져야 함).
- **서버 동작 (배달)**:
  - 활동의 대상(타겟 액터)을 `ActivityStreams`의 `to`, `bto`, `cc`, `bcc`, `audience` 필드를 확인하여 결정합니다.
  - 대상 액터의 JSON-LD 표현을 검색하여 `inbox` 속성을 찾습니다.
  - 수신자가 `Collection` 또는 `OrderedCollection`인 경우, 서버는 컬렉션을 역참조하여 각 항목의 `inbox`를 찾아야 합니다.
  - 최종 수신자 목록의 중복을 **반드시** 제거하고, 해당 활동의 액터와 동일한 액터는 목록에서 제외해야 합니다.
  - `POST` 요청은 수신 서버에 의해 `inbox OrderedCollection`의 항목으로 추가됩니다.
  - 배달은 비동기적으로 수행되어야 하며, 네트워크 오류 시 재시도해야 합니다.
  - 비-연동 서버(`non-federated server`)의 `inbox`로 배달 시도는 `405 Method Not Allowed` 응답을 발생시켜야 합니다.
  - **발신함 배달 요구사항**: `outbox`에 Activity가 수신될 때, 서버는 `to`, `bto`, `cc`, `bcc` 또는 `audience` 필드의 값이 개별 액터 또는 액터가 소유한 컬렉션인 경우 해당 대상에게 배달을 **반드시** 수행해야 합니다.
  - **수신함으로부터의 전달(Forwarding)**: 활동이 처음 수신되었고, `to`, `cc`, `audience` 값에 서버가 소유한 `Collection`이 포함되어 있으며, `inReplyTo`, `object`, `target`, `tag` 값이 서버가 소유한 객체인 경우, 서버는 해당 활동을 다른 수신자에게 **반드시** 전달해야 합니다.
  - **공유 수신함 배달(Shared Inbox Delivery)**: 선택적 메커니즘. 동일한 `sharedInbox`를 공유하는 팔로워들에게 개별 메시지 대신 `sharedInbox`로 객체를 배달하여 메시지 수를 줄일 수 있습니다. 공개적으로 주소 지정된 활동은 네트워크의 알려진 모든 `sharedInbox` 엔드포인트로 배달될 수 있습니다.
- **출력값**: 주로 성공/실패를 나타내는 HTTP 상태 코드.

#### **3.2. 서버-서버 상호작용을 위한 특정 활동(Activity)의 부수 효과 (POST to Inbox 시)**

다른 서버로부터 `inbox`에 Activity가 수신될 때, 수신 서버는 다음 Activity 유형에 따라 부수 효과를 수행해야 합니다:

- **`Create` Activity**:
  - **부수 효과**: Activity는 액터의 `inbox`에 나타나야 하며, 서버는 이 Activity와 동반 객체의 로컬 표현을 저장할 가능성이 높습니다.
- **`Update` Activity**:
  - **부수 효과**: 수신 서버는 동일 `id`를 가진 객체의 사본을 `Update` Activity에 제공된 사본으로 **반드시** 업데이트해야 합니다. 클라이언트-서버와 달리 **완전한 교체**입니다. 서버는 업데이트가 객체 수정을 위해 승인되었는지 **반드시** 확인해야 합니다.
- **`Delete` Activity**:
  - **부수 효과**: 수신 서버는 동일 `id`를 가진 객체의 표현을 제거해야 합니다. `Tombstone` 객체로 대체할 수 있습니다.
- **`Follow` Activity**:
  - **부수 효과**: 서버는 `Follow`를 `object`로 하는 `Accept` 또는 `Reject` Activity를 생성하여 `Follow` Activity의 액터에게 전달해야 합니다. `Accept` 수신 시 팔로우하는 액터를 `Followers Collection`에 추가해야 합니다. `Reject` 수신 시 `Followers Collection`에 추가해서는 안 됩니다.
- **`Accept` Activity**:
  - **부수 효과**: `inbox`에 수신된 `Accept`의 `object`가 이전에 수신자가 보낸 `Follow` Activity인 경우, 서버는 해당 액터를 수신자의 `Following Collection`에 추가해야 합니다.
- **`Reject` Activity**:
  - **부수 효과**: `inbox`에 수신된 `Reject`의 `object`가 이전에 수신자가 보낸 `Follow` Activity인 경우, 수신자는 `Follow` 요청을 승인하지 않았음을 의미합니다. 서버는 해당 액터를 수신자의 `Following Collection`에 추가해서는 **안 됩니다**.
- **`Add` Activity**:
  - **부수 효과**: 서버는 `object`를 `target` 속성에 지정된 컬렉션에 추가해야 합니다 (권한이 없고 허용되지 않는 경우 제외).
- **`Remove` Activity**:
  - **부수 효과**: 서버는 `object`를 `target` 속성에 지정된 컬렉션에서 제거해야 합니다 (권한이 없고 허용되지 않는 경우 제외).
- **`Like` Activity**:
  - **부수 효과**: 서버는 수신된 Activity를 `likes` 컬렉션(있는 경우)에 추가하여 객체의 좋아요 수를 증가시켜야 합니다.
- **`Announce` Activity (공유)**:
  - **부수 효과**: 서버는 수신된 Activity를 `shares` 컬렉션(있는 경우)에 추가하여 객체의 공유 수를 증가시켜야 합니다.
- **`Undo` Activity**:
  - **부수 효과**: 이전 Activity의 부수 효과를 취소합니다. 클라이언트-서버 상호작용의 `Undo` Activity와 동일한 범위 및 제한을 가집니다.

---

### **4. 객체 검색 (Object Retrieval)**

- **API 경로**: 객체의 `id` 속성 (URI).
- **HTTP 메서드**: **`GET`**.
- **입력값**:
  - **요청 헤더**: `Accept: application/ld+json; profile="https://www.w3.org/ns/activitystreams"` **반드시** 지정.
- **서버 동작**:
  - 서버는 HTTP 콘텐츠 협상을 사용할 수 있습니다.
  - 서버는 `B.1 Authentication and Authorization`에 지정된 대로 인증을 요구할 수 있습니다.
  - 서버는 권한 확인에 실패한 요청을 적절한 HTTP 오류 코드 또는 `403 Forbidden` (객체의 존재가 비공개인 경우)으로 실패시켜야 합니다.
  - 개인 객체의 존재를 공개하지 않으려면 `404 Not Found`로 응답할 수 있습니다.
- **출력값**: ActivityStreams 객체 표현.

---

### **5. 보안 고려사항 (Security Considerations) (참고)**

서버 구현 시 다음과 같은 보안 측면을 고려해야 합니다 (비규범적 지침):

- **인증 및 권한 부여**: 클라이언트-서버 및 서버-서버 간 인증 메커니즘을 구현해야 합니다.
- **검증**: 클라이언트가 제출한 콘텐츠나 다른 서버에서 수신한 콘텐츠를 신뢰해서는 안 되며, 검증 메커니즘을 사용해야 합니다.
- **로컬호스트 URI 접근**: 프로덕션 환경에서 로컬호스트 URI에 대한 요청을 허용하지 않거나 기본적으로 비활성화해야 합니다.
- **URI 스킴**: `http` 및 `https`와 같은 안전한 URI 스킴만 허용하도록 주의해야 합니다.
- **재귀적 객체**: 서비스 거부 공격을 방지하기 위해 객체 해결 시 재귀 깊이 제한을 설정해야 합니다.
- **스팸**: 수신되는 콘텐츠에 스팸 필터를 적용하는 것이 좋습니다.
- **연동 서비스 거부**: 다른 연동 서버로부터의 서비스 거부 공격에 대한 보호 (예: 비율 제한)를 구현해야 합니다.
- **클라이언트-서버 비율 제한**: 클라이언트 API 제출에 비율 제한을 적용하여 서비스 거부 공격을 방지하고 다른 서버에 과부하를 주지 않도록 해야 합니다.
- **클라이언트-서버 응답 서비스 거부**: 클라이언트가 너무 큰 컬렉션으로 인해 과부하되는 것을 방지하기 위해 컬렉션 페이지의 크기를 제한해야 합니다.
- **콘텐츠 위생 처리(Sanitizing Content)**: 교차 사이트 스크립팅 공격을 방지하기 위해 브라우저에 렌더링되는 모든 Activity 필드를 위생 처리해야 합니다.
- **`bto` 및 `bcc` 속성 표시 안 함**: 이 속성들은 원래 작성자만 알 수 있도록 의도되었으므로, 서버는 표시 시 이 속성들을 생략해야 합니다.

이 정보는 ActivityPub 서버를 구현할 때 필요한 API 경로, 동작, 입력 및 출력에 대한 포괄적인 지침을 제공합니다.
