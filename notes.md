# Notes

## Setup
- Added `flake.nix` file due to requirements of my own setup (NixOS where I don't install coding dependencies globally)
- If using Nix, can enter environment with `nix develop`

## Comments

### Initial
- Got client and server running (using FastAPI for the backend)
- It looks like all auctions have ended, but some (most) are still active

### Bidding Errors
- I submit a bid higher than the current price, but I get an error "Bid must be greater than the current bid of ..."
  - The issue is that we raise an exception when `if bid.amount >= listing.current_bid:` (see `server/python/main.py`). This should be `if bid.amount <= listing.current_bid:`
- After I fixing this issue, I get a new error displayed in the UI when submitting a bid: `Cannot read properties of null (reading 'reset')`
  - It looks like we are trying to evaluate `null.reset()`
  - During `await placeBid ...` wait, `e.currentTarget` is cleared out
  - The bid is still updated because this error occurs after that is updated