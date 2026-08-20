import { useEffect, useState } from "react";
import { getListings } from "./api/listings";
import CreateListingForm from "./components/CreateListingForm";
import ListingCard from "./components/ListingCard";
import ListingDetail from "./components/ListingDetail";
import type { Listing } from "./types";

// NOTE: PAGE_SIZE is artificially set to 4 to demonstrate pagination mechanics 
// with the limited mock dataset. Would expect this to be higher in production
// for a better UX
const PAGE_SIZE = 4;

export default function App() {
	const [listings, setListings] = useState<Listing[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [category, setCategory] = useState<string>("");
	const [status, setStatus] = useState<string>("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refresh, setRefresh] = useState(0);

	useEffect(() => {
		setLoading(true);
		getListings(page, PAGE_SIZE, category, status)
			.then((data) => {
				setListings(data.items);
				setHasMore(data.hasMore);
				setTotal(data.total);
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : "Failed to load listings")
			)
			.finally(() => setLoading(false));
			// Note: Fine for now, but will probably want a different approach when more
			// filters are added to prevent dependency array from being too large
	}, [page, category, status, refresh]);

	const selectedListing = listings.find((l) => l.id === selectedId) ?? null;

	const handleBidSuccess = (updated: Listing) => {
		setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
	};

	const handleListingCreated = async (listing: Listing) => {
		setShowCreateForm(false);
    
		// 1. Clear filters so the item isn't accidentally hidden
		setCategory("");
		setStatus("");

		// 2. Fetch page 1 without filters just to get the true unfiltered total
		const { total: trueTotal } = await getListings(1, PAGE_SIZE, "", "");
		
		// 3. Calculate the new last page based on the true total
		const lastPage = Math.ceil(trueTotal / PAGE_SIZE) || 1;
    
		// 4. Jump to the last page, select the new item, and FORCE a refresh 
		// in case we were already on the last page and the page number didn't change.

		// NOTE: Navigating to the calculated last page works cleanly for this prototype 
		// because all new items have an identical 7-day duration, meaning they mathematically 
		// sort to the end. In a production environment with variable auction durations, 
		// or under heavy concurrent creation by multiple users, this item might not land 
		// on the literal last page.
		setPage(lastPage);
		setSelectedId(listing.id);
		setRefresh(prev => prev + 1);
	};

	const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setter(e.target.value);
			setPage(1);
			setSelectedId(null);
		};

	return (
		<div className="app">
			<header className="app-header">
				<h1>Interview Auctions</h1>
				<p className="app-header__subtitle">Farm Equipment Marketplace</p>
			</header>
			<div className="app-body">
				<aside className="panel panel--left">
					<div className="panel__heading-row">
						<h2 className="panel__heading">Listings</h2>
						<button
							type="button"
							className="panel__heading-action"
							onClick={() => {
								setShowCreateForm(true);
								setSelectedId(null);
							}}
						>
							+ New
						</button>
					</div>
					<div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
						<select value={category} onChange={handleFilterChange(setCategory)} style={{ padding: "6px", borderRadius: "4px" }}>
							<option value="">All Categories</option>
							<option value="tractor">Tractors</option>
							<option value="combine">Combines</option>
							<option value="implement">Implements</option>
							<option value="attachment">Attachments</option>
						</select>
            
						<select value={status} onChange={handleFilterChange(setStatus)} style={{ padding: "6px", borderRadius: "4px" }}>
							<option value="">All Statuses</option>
							<option value="active">Active</option>
							<option value="closed">Closed</option>
							<option value="pending">Pending</option>
						</select>
					</div>
					{loading && <div className="state-message">Loading listings…</div>}
					{error && (
						<div className="state-message state-message--error">{error}</div>
					)}
					{!loading && !error && (
						<>
							<div className="listing-grid">
								{listings.map((listing) => (
									<ListingCard
										key={listing.id}
										listing={listing}
										isSelected={listing.id === selectedId}
										onClick={() => setSelectedId(listing.id)}
									/>
								))}
							</div>

							{total > 0 && (
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
									<button 
										onClick={() => {
											setPage(p => Math.max(1, p - 1))
											setSelectedId(null);
										}}
										disabled={page === 1}
										className="panel__heading-action"
									>
										Previous
									</button>
									<span style={{ fontSize: "0.85rem", color: "#555" }}>
										Page {page} ({total} total results)
									</span>
									<button 
										onClick={() => {
											setPage(p => p + 1)
											setSelectedId(null);
										}}
										disabled={!hasMore}
										className="panel__heading-action"
									>
										Next
									</button>
								</div>
							)}

							{total === 0 && (
								<div className="state-message">No listings found matching these filters.</div>
							)}
						</>
					)}
				</aside>
				<main className="panel panel--right">
					{showCreateForm ? (
						<CreateListingForm onSuccess={handleListingCreated} />
					) : selectedListing ? (
						<ListingDetail
							listing={selectedListing}
							onBidSuccess={handleBidSuccess}
						/>
					) : (
						<div className="empty-state">
							<p>Select a listing to view details and place a bid.</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
