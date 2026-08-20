import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

# ============================================================
# Types
# ============================================================

CategoryType = Literal["tractor", "combine", "implement", "attachment"]
StatusType = Literal["active", "closed", "pending"]


# ============================================================
# Models
# ============================================================


class Listing(BaseModel):
    """Wire JSON matches the TypeScript server (camelCase keys)."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: str
    title: str
    description: str
    category: CategoryType
    starting_price: float
    current_bid: float
    current_bidder: Optional[str]
    status: StatusType
    ends_at: str
    image_url: str


class PaginatedListings(BaseModel):
    """Wrapper for paginated results."""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
    
    items: list[Listing]
    total: int
    has_more: bool


class BidRequest(BaseModel):
    bidder: str
    amount: float


class CreateListingRequest(BaseModel):
    title: str


# ============================================================
# In-memory store — seeded from data/listings.json
# ============================================================

_data_file = Path(__file__).parent / "data" / "listings.json"
listings: list[Listing] = [
    Listing(**item) for item in json.loads(_data_file.read_text())
]

# ============================================================
# App
# ============================================================

app = FastAPI(title="Interview Auctions")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/api/listings",
    response_model=PaginatedListings,
    response_model_by_alias=True,
)
def get_listings(
    page: int = Query(1, ge=1),
    size: int = Query(4, ge=1, le=50),
    category: Optional[CategoryType] = None,
    status: Optional[StatusType] = None,
):
    filtered_listings = listings

    # Apply filters
    if category:
        filtered_listings = [l for l in filtered_listings if l.category == category]
    if status:
        filtered_listings = [l for l in filtered_listings if l.status == status]

    # Sort ascending by ends_at (ending/ended soonest first)
    filtered_listings.sort(key=lambda l: l.ends_at)

    # Calculate pagination boundaries
    total = len(filtered_listings)
    start = (page - 1) * size
    end = start + size
    items = filtered_listings[start:end]

    return PaginatedListings(
        items=items,
        total=total,
        has_more=end < total
    )


@app.post(
    "/api/listings",
    response_model=Listing,
    status_code=201,
    response_model_by_alias=True,
)
def create_listing(body: CreateListingRequest):
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    listing = Listing(
        id=str(uuid.uuid4()),
        title=body.title.strip(),
        description="",
        category="implement",
        starting_price=0,
        current_bid=0,
        current_bidder=None,
        status="active",
        ends_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        image_url="",
    )
    listings.append(listing)
    return listing


@app.get(
    "/api/listings/{listing_id}",
    response_model=Listing,
    response_model_by_alias=True,
)
def get_listing(listing_id: str):
    listing = next((l for l in listings if l.id == listing_id), None)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@app.post(
    "/api/listings/{listing_id}/bids",
    response_model=Listing,
    status_code=201,
    response_model_by_alias=True,
)
def place_bid(listing_id: str, bid: BidRequest):
    listing = next((l for l in listings if l.id == listing_id), None)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.status != "active":
        raise HTTPException(
            status_code=400, detail="This listing is not currently active"
        )

    if not bid.bidder or not bid.bidder.strip():
        raise HTTPException(status_code=400, detail="Bidder name is required")

    if bid.amount <= 0:
        raise HTTPException(
            status_code=400, detail="Bid amount must be a positive number"
        )

    if bid.amount <= listing.current_bid:
        raise HTTPException(
            status_code=400,
            detail=f"Bid must be greater than the current bid of ${listing.current_bid:,.0f}",
        )

    listing.current_bid = bid.amount
    listing.current_bidder = bid.bidder.strip()

    return listing
