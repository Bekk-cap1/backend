# Diagrams

## Trip / Request / Booking states
```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PUBLISHED
  PUBLISHED --> STARTED
  STARTED --> COMPLETED
  DRAFT --> CANCELED
  PUBLISHED --> CANCELED
  STARTED --> CANCELED

  state "TripRequest" as TR {
    [*] --> PENDING
    PENDING --> ACCEPTED
    PENDING --> REJECTED
    PENDING --> CANCELED
    PENDING --> EXPIRED
  }

  state "Booking" as BK {
    [*] --> CONFIRMED
    CONFIRMED --> PAID
    CONFIRMED --> COMPLETED
    PAID --> COMPLETED
    CONFIRMED --> CANCELED
    PAID --> CANCELED
  }
```

## Negotiation flow (turn-based)
```mermaid
sequenceDiagram
  participant Passenger
  participant Driver
  participant Session
  participant Offer

  Passenger->>Session: request created -> session(active, nextTurn=driver)
  Driver->>Offer: create offer #1
  Offer-->>Session: lastOfferId, nextTurn=passenger, driverMovesLeft--
  Passenger->>Offer: create offer #2
  Offer-->>Session: lastOfferId, nextTurn=driver, passengerMovesLeft--
  Driver->>Offer: create offer #3
  Note over Session: max 3 moves per side
  Passenger->>Offer: accept latest offer
  Offer-->>Session: state=accepted
```

## Outbox flow
```mermaid
flowchart TD
  A[Domain transaction] --> B[OutboxEvent insert]
  B --> C[Outbox dispatcher]
  C --> D[Queue job (BullMQ)]
  D --> E[Worker handler]
  E --> F[Notification/Audit/Side effects]
```
