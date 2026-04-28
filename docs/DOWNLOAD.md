# VULTD Wallet — Download & Install

**Experimental — signet only until audited.**

## Pre-built Binaries

Download the latest release from the [vultd-releases page](https://github.com/S6dative/vultd-releases/releases/latest).

| Platform | File | Notes |
|----------|------|-------|
| Linux    | `VULTD-*.AppImage` | `chmod +x` then run |
| macOS    | `VULTD-*.dmg` | Drag to Applications |
| Windows  | Build from source | See below |

### Verify SHA-256

```bash
sha256sum -c VULTD-*.AppImage.sha256
```

## Build from Source

Requires Node.js 20+.

```bash
git clone https://github.com/S6dative/VULTD-GUI
cd VULTD-GUI
npm install

# Development
npm run dev:electron

# Production build
npm run electron:build        # current platform
npm run package:linux         # Linux AppImage
npm run package:win           # Windows dir
npm run package:mac           # macOS DMG
```

## Configuration

VULTD connects to a local `vusd` CLI backend. For signet operation:

1. Install `vusd` CLI from [vusd-protocol](https://github.com/S6dative/vusd-protocol)
2. Initialize keystore: `vusd keystore init`
3. Set environment variables:
   ```bash
   export VUSD_OWNER_SEED_HEX=<64 hex chars>
   export VUSD_SIGNING_KEY_HEX=<64 hex chars>
   export VUSD_CHANGE_ADDRESS=tb1p...
   export BITCOIND_RPC_URL=http://127.0.0.1:38332
   ```
4. Start VULTD — it will connect automatically.

## Requirements

- bitcoind + lnd running on signet
- Tor (for AnonTransport in signet mode)
- Node.js 20+ (if building from source)
