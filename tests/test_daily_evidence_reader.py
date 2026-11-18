import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from daily_evidence_reader import iter_trial_records, record_id


class DailyEvidenceReaderTests(unittest.TestCase):
    def test_legacy_array_of_trial_records(self):
        rows = [{"id": "a"}, {"id": "b"}, "legacy note", None]
        self.assertEqual([record_id(x) for x in iter_trial_records(rows)], ["a", "b"])

    def test_object_root_reads_known_collections_and_ignores_metadata_strings(self):
        payload = {
            "run_id": "run-1",
            "source_passes": ["breast", "GU"],
            "candidates": [{"id": "trial-a"}, "not a record"],
            "additional_candidate_leads_not_yet_screened": [{"candidate_id": "trial-b"}],
            "next_actions": ["screen more trials"],
        }
        self.assertEqual(
            [record_id(x) for x in iter_trial_records(payload)],
            ["trial-a", "trial-b"],
        )

    def test_multiple_newer_collections_are_supported(self):
        payload = {
            "candidate_decisions": [{"candidate_id": "c1"}],
            "batch_new_pages": [{"id": "t1"}],
            "staged_carry_forward_pages": [{"trial_id": "t2"}],
            "held_candidates": [{"id": "h1"}],
        }
        self.assertEqual(
            [record_id(x) for x in iter_trial_records(payload)],
            ["c1", "t1", "t2", "h1"],
        )

    def test_single_record_object(self):
        self.assertEqual([record_id(x) for x in iter_trial_records({"id": "single"})], ["single"])

    def test_unsupported_root_fails_clearly(self):
        with self.assertRaises(TypeError):
            list(iter_trial_records("not-json-records"))


if __name__ == "__main__":
    unittest.main()
