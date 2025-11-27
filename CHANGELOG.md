# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-27

### Added

#### Core Protocol (`@mxp-protocol/core`)
- `Message` class with factory methods (`call`, `response`, `error`, `ping`, `pong`)
- `MessageType` enum (Call, Response, Error, Stream*, Agent*, Ping, Pong)
- `MessageFlags` enum (Encrypted, Compressed, RequiresAck, etc.)
- Binary codec (`encode`, `decode`) - wire-compatible with Rust implementation
- Header encoding/decoding (64-byte fixed header)
- Trace ID and Message ID generation
- XXHash64-based checksums

#### A2A Compatibility (`@mxp-protocol/core/a2a`)
- `Message` with `Part` support (text, file, data)
- `Task` with status tracking and `Artifact` outputs
- `TaskState` lifecycle (Submitted → Working → Completed/Failed)
- `AgentCard` for agent discovery (/.well-known/agent-card.json)
- `AgentSkill` with tags and examples
- `toMxp`/`fromMxp` conversion functions
- Streaming helpers (`toMxpStreamOpen`, `toMxpStreamChunk`, `toMxpStreamClose`)
- `JsonRpcRequest`/`JsonRpcResponse` for HTTP gateway mode
- Standard A2A error codes

#### WebRTC Transport (`@mxp-protocol/core/transport`)
- `WebRTCTransport` - multi-peer connection manager
- `Peer` - single peer connection with DataChannel
- Signaling providers:
  - `WebSocketSignaling` - for cross-device connections
  - `BroadcastChannelSignaling` - same-origin (browser tabs)
  - `ManualSignaling` - debug/copy-paste mode
  - `InMemorySignalingHub` - for testing
- Connection state tracking
- Reliable and unreliable channel modes
- Automatic ping/pong heartbeat
- NAT traversal via STUN/TURN

#### Examples
- `chat.ts` - Simple A2A chat
- `streaming.ts` - LLM token streaming
- `agent-card.ts` - Agent discovery
- `webrtc-chat.ts` - P2P chat (Node.js)
- `webrtc-browser.html` - P2P chat (Browser demo)

#### Documentation
- Architecture diagrams
- Mermaid sequence diagrams
- Integration patterns
- Full API reference

[0.1.0]: https://github.com/yafatek/mxp-js/releases/tag/v0.1.0

