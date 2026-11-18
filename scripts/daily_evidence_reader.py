"""Read legacy list and newer object-root daily-evidence JSON safely."""

from collections.abc import Iterator
from typing import Any

RECORD_COLLECTION_KEYS = (
    "records",
    "trials",
    "entries",
    "candidates",
    "candidate_decisions",
    "batch_new_pages",
    "staged_carry_forward_pages",
    "carry_forward_trials",
    "carry_forward_promoted",
    "ready_candidates",
    "held_candidates",
    "deferred_negative_candidates",
    "rejected_candidates",
    "additional_candidate_leads_not_yet_screened",
)


def record_id(row: dict[str, Any]) -> str | None:
    """Return a stable trial/candidate key without assuming every schema uses id."""
    for key in ("id", "trial_id", "candidate_id"):
        value = row.get(key)
        if isinstance(value, (str, int)) and str(value).strip():
            return str(value).strip()
    return None


def iter_trial_records(payload: Any) -> Iterator[dict[str, Any]]:
    """Yield dictionary records from legacy arrays or versioned object envelopes.

    Object metadata such as source_passes, next_actions, and free-text notes is
    deliberately ignored. Only known record collections are traversed.
    """
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                yield item
        return

    if isinstance(payload, dict):
        if record_id(payload):
            yield payload
        for key in RECORD_COLLECTION_KEYS:
            collection = payload.get(key)
            if isinstance(collection, list):
                for item in collection:
                    if isinstance(item, dict):
                        yield item
        return

    raise TypeError(f"Unsupported daily-evidence root type: {type(payload).__name__}")
