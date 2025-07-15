# ActivityPub 인스턴스 구현 TODO

## 1. 액터(Actor) 구현

- [x] 액터 기본 속성 구현
  - [x] `id`: 액터의 고유 전역 식별자 (URI)
  - [x] `type`: 액터 객체의 타입 (예: "Person")
  - [x] `inbox`: 액터가 수신한 모든 메시지를 포함하는 OrderedCollection
  - [x] `outbox`: 액터가 생성한 모든 메시지를 포함하는 OrderedCollection
- [x] 선택적 속성 구현
  - [x] `following`: 이 액터가 팔로우하는 액터들의 컬렉션 링크
  - [x] `followers`: 이 액터를 팔로우하는 액터들의 컬렉션 링크

## 2. 클라이언트-서버 상호작용 (Client to Server Interactions)

### 2.1 발신함(Outbox)에 활동(Activity) 전송 (POST)

- [ ] 발신함 POST 엔드포인트 구현
  - [ ] Content-Type 헤더 검증 (`application/ld+json` 또는 `application/activity+json`)
  - [ ] 인증 처리 (Authorization 헤더)
  - [ ] Activity ID 생성 (클라이언트가 제출한 ID 무시)
  - [ ] 비-Activity 객체를 Create Activity로 감싸기
  - [ ] `to`, `bto`, `cc`, `bcc`, `audience` 속성 복사
  - [ ] `bto`, `bcc` 속성 제거 (전송 전)
  - [ ] 새로운 Activity를 outbox 컬렉션에 추가
  - [ ] 201 Created 응답 및 Location 헤더 설정

### 2.2 발신함(Outbox) 또는 수신함(Inbox)에서 메시지 읽기 (GET)

- [ ] 발신함 GET 엔드포인트 구현
  - [ ] Accept 헤더 검증
  - [ ] 권한에 따른 Activity 필터링
  - [ ] 인증 없이 요청 시 공개 게시물만 반환
- [ ] 수신함 GET 엔드포인트 구현
  - [ ] 권한에 따른 Activity 필터링
  - [ ] Activity 중복 제거
  - [ ] 403 Forbidden 또는 404 Not Found 응답 처리

### 2.3 클라이언트-서버 특정 활동(Activity) 부수 효과

- [ ] `Create` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] 객체 생성 및 attributedTo 필드 설정
- [ ] `Update` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] 부분 업데이트 구현 (null 값은 필드 제거)
- [ ] `Delete` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] Tombstone으로 대체 또는 완전 삭제
  - [ ] 410 Gone 또는 404 Not Found 응답
- [ ] `Follow` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] Accept Activity 수신 시 following 컬렉션에 추가
- [ ] `Add` Activity 처리
  - [ ] object 및 target 속성 필수 검증
  - [ ] 대상 컬렉션에 객체 추가
- [ ] `Remove` Activity 처리
  - [ ] object 및 target 속성 필수 검증
  - [ ] 대상 컬렉션에서 객체 제거
- [ ] `Like` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] liked 컬렉션에 객체 추가
- [ ] `Block` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] 차단된 사용자 상호작용 방지
- [ ] `Undo` Activity 처리
  - [ ] object 속성 필수 검증
  - [ ] 이전 Activity 부수 효과 취소

## 3. 서버-서버 상호작용 (Server to Server Interactions)

### 3.1 수신함(Inbox)에 활동(Activity) 전송 (POST - 배달/Delivery)

- [x] 수신함 POST 엔드포인트 구현 (기본 구조)
- [ ] 배달 시스템 구현
  - [ ] Content-Type 헤더 검증
  - [ ] 대상 액터 결정 (`to`, `bto`, `cc`, `bcc`, `audience` 필드)
  - [ ] 대상 액터의 inbox 속성 검색
  - [ ] Collection/OrderedCollection 역참조
  - [ ] 중복 제거 및 자기 자신 제외
  - [ ] inbox OrderedCollection에 항목 추가
  - [ ] 비동기 배달 처리
  - [ ] 네트워크 오류 시 재시도
  - [ ] 405 Method Not Allowed 응답 (비-연동 서버)
- [ ] 발신함 배달 요구사항
  - [ ] outbox Activity 수신 시 대상 배달
- [ ] 수신함으로부터의 전달(Forwarding)
  - [ ] 조건 검증 후 다른 수신자에게 전달
- [ ] 공유 수신함 배달(Shared Inbox Delivery)
  - [ ] sharedInbox 메커니즘 구현 (선택적)

### 3.2 서버-서버 특정 활동(Activity) 부수 효과

- [x] `Create` Activity 처리 (기본 핸들러)
  - [ ] inbox에 표시 및 로컬 표현 저장
- [ ] `Update` Activity 처리
  - [ ] 동일 ID 객체 완전 교체
  - [ ] 객체 수정 권한 확인
- [ ] `Delete` Activity 처리
  - [ ] 동일 ID 객체 제거
  - [ ] Tombstone 객체로 대체 (선택적)
- [x] `Follow` Activity 처리 (기본 핸들러)
  - [ ] Accept/Reject Activity 생성 및 전달
  - [ ] Accept 수신 시 Followers Collection에 추가
- [x] `Accept` Activity 처리 (기본 핸들러)
  - [ ] Follow Activity 확인 후 Following Collection에 추가
- [ ] `Reject` Activity 처리
  - [ ] Follow 요청 거부 처리
- [ ] `Add` Activity 처리
  - [ ] 권한 확인 후 대상 컬렉션에 추가
- [ ] `Remove` Activity 처리
  - [ ] 권한 확인 후 대상 컬렉션에서 제거
- [ ] `Like` Activity 처리
  - [ ] likes 컬렉션에 추가 및 좋아요 수 증가
- [ ] `Announce` Activity 처리 (공유)
  - [ ] shares 컬렉션에 추가 및 공유 수 증가
- [x] `Undo` Activity 처리 (기본 핸들러)
  - [ ] 이전 Activity 부수 효과 취소

## 4. 객체 검색 (Object Retrieval)

- [ ] 객체 검색 엔드포인트 구현
  - [ ] Accept 헤더 검증
  - [ ] HTTP 콘텐츠 협상
  - [ ] 인증 및 권한 부여
  - [ ] 403 Forbidden 또는 404 Not Found 응답
  - [ ] ActivityStreams 객체 반환

## 5. 보안 고려사항

- [ ] 인증 및 권한 부여
  - [ ] 클라이언트-서버 인증 메커니즘
  - [ ] 서버-서버 인증 메커니즘
- [ ] 검증
  - [ ] 클라이언트 제출 콘텐츠 검증
  - [ ] 다른 서버 수신 콘텐츠 검증
- [ ] 보안 제한
  - [ ] 로컬호스트 URI 접근 제한
  - [ ] 안전한 URI 스킴만 허용
  - [ ] 재귀적 객체 깊이 제한
- [ ] 공격 방어
  - [ ] 스팸 필터 적용
  - [ ] 연동 서비스 거부 공격 방어
  - [ ] 클라이언트-서버 비율 제한
  - [ ] 컬렉션 페이지 크기 제한
  - [ ] 콘텐츠 위생 처리 (XSS 방지)
  - [ ] bto 및 bcc 속성 표시 안 함

## 6. 추가 기능

- [ ] 키 쌍 관리
  - [x] 액터별 키 쌍 생성 및 관리
- [ ] 노트(Note) 객체 처리
  - [x] Note 객체 디스패처 구현 (기본 구조)
- [ ] 컬렉션 관리
  - [x] Followers 컬렉션 디스패처 및 카운터
  - [x] Following 컬렉션 디스패처 및 카운터
- [ ] 페이지네이션
  - [ ] 컬렉션 페이지네이션 구현
- [ ] 웹핑거(WebFinger) 지원
  - [ ] .well-known/webfinger 엔드포인트
- [ ] NodeInfo 지원
  - [ ] .well-known/nodeinfo 엔드포인트
