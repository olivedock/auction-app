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

### Paginate Auction Lots with a bonus of adding filters
- Some considerations
  - Filtering must be done on the server side or else we can't be sure to display the proper number of listings on a page
  - For time consideration we should allow filtering by any category or status, not just those that are used in actual current listings
  - For time consideration we should only allow filtering by category or status (not things like price, ending time, etc.)
  - Sorting needs to be predictable/deterministic
  - If a user is on page 3 (for example) and then filters by "tractor", we should probably reset to page 1
- Decisions
  - For the sake of time, didn't remove the previous/next buttons if there are no previous or next pages
  - Client set page size to 4 to test multiple pages with a limited dataset of listings. This would need to be higher for a better UX
  - Handling the addition of a new listing:
    - Was previously just appending to local react state, which would add an extra item to the current page
    - Instead, let's remove filters and request the last page (where the new listing is likely to be if we sort by ends_at)
      - May not be correct if we can manually choose ending time or if many other auctions are created around the same time by other users, but we will not deal with this case for this exercise due to time constraints