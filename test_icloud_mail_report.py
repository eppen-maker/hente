#!/usr/bin/env python3
"""Tester parsing og opptelling mot syntetiske hoder - ingen nettverk."""

import unittest

from icloud_mail_report import (
    aggregate,
    marketing_reasons,
    parse_headers,
    pick_unsubscribe,
    render_markdown,
    render_table,
)


def raw(**headers) -> bytes:
    return ("\r\n".join(f"{k}: {v}" for k, v in headers.items())
            + "\r\n\r\n").encode()


NEWSLETTER = raw(**{
    "From": "Tilbud <tilbud@butikken.no>",
    "Date": "Mon, 10 Aug 2026 09:00:00 +0200",
    "Subject": "Ukens kupp",
    "List-Unsubscribe": "<mailto:stop@butikken.no>, <https://butikken.no/av>",
})

HUMAN = raw(**{
    "From": "Kari Nordmann <kari@eksempel.no>",
    "Date": "Tue, 11 Aug 2026 12:00:00 +0200",
    "Subject": "Middag paa lordag?",
})


class TestParsing(unittest.TestCase):
    def test_extracts_address_and_domain(self):
        msg = parse_headers(NEWSLETTER)
        self.assertEqual(msg["address"], "tilbud@butikken.no")
        self.assertEqual(msg["domain"], "butikken.no")
        self.assertEqual(msg["name"], "Tilbud")

    def test_prefers_https_unsubscribe_over_mailto(self):
        self.assertEqual(parse_headers(NEWSLETTER)["unsubscribe"],
                         "https://butikken.no/av")

    def test_falls_back_to_mailto_when_no_http(self):
        self.assertEqual(pick_unsubscribe("<mailto:stop@x.no>"),
                         "mailto:stop@x.no")

    def test_handles_bare_unsubscribe_value(self):
        self.assertEqual(pick_unsubscribe("https://x.no/av"), "https://x.no/av")

    def test_decodes_encoded_subject(self):
        msg = parse_headers(raw(**{
            "From": "a@b.no",
            "Subject": "=?utf-8?B?VGlsYnVk?=",
        }))
        self.assertEqual(msg["subject"], "Tilbud")

    def test_date_without_timezone_is_made_aware(self):
        msg = parse_headers(raw(**{
            "From": "a@b.no", "Date": "Mon, 10 Aug 2026 09:00:00 -0000"}))
        self.assertIsNotNone(msg["date"].tzinfo)

    def test_unparseable_date_is_none_not_crash(self):
        msg = parse_headers(raw(**{"From": "a@b.no", "Date": "i gaar"}))
        self.assertIsNone(msg["date"])

    def test_message_without_address_is_dropped(self):
        self.assertIsNone(parse_headers(raw(**{"Subject": "ingen avsender"})))


class TestClassification(unittest.TestCase):
    def test_list_unsubscribe_marks_marketing(self):
        self.assertIn("avmeldingslenke", marketing_reasons(parse_headers(NEWSLETTER)))

    def test_ordinary_mail_has_no_signals(self):
        self.assertEqual(marketing_reasons(parse_headers(HUMAN)), [])

    def test_noreply_localpart_is_a_signal(self):
        msg = parse_headers(raw(**{"From": "no-reply@kjede.no"}))
        self.assertIn("systemavsender", marketing_reasons(msg))

    def test_precedence_bulk_is_a_signal(self):
        msg = parse_headers(raw(**{"From": "a@b.no", "Precedence": "bulk"}))
        self.assertIn("precedence:bulk", marketing_reasons(msg))

    def test_localpart_match_requires_word_boundary(self):
        # "newsletter" traff, men "informatikk" skal ikke regnes som "info".
        msg = parse_headers(raw(**{"From": "informatikk@uio.no"}))
        self.assertEqual(marketing_reasons(msg), [])


class TestAggregation(unittest.TestCase):
    def setUp(self):
        self.messages = [parse_headers(NEWSLETTER) for _ in range(6)]
        self.messages.append(parse_headers(HUMAN))

    def test_counts_and_weekly_rate(self):
        stats = aggregate(self.messages, "address", days=42)
        top = stats[0]
        self.assertEqual(top["sender"], "tilbud@butikken.no")
        self.assertEqual(top["count"], 6)
        self.assertEqual(top["per_week"], 1.0)  # 6 meldinger / 6 uker

    def test_sorted_by_count_descending(self):
        counts = [s["count"] for s in aggregate(self.messages, "address", 90)]
        self.assertEqual(counts, sorted(counts, reverse=True))

    def test_marketing_flag_separates_senders(self):
        by_sender = {s["sender"]: s for s in aggregate(self.messages, "address", 90)}
        self.assertTrue(by_sender["tilbud@butikken.no"]["marketing"])
        self.assertFalse(by_sender["kari@eksempel.no"]["marketing"])

    def test_grouping_by_domain_merges_addresses(self):
        mixed = [parse_headers(raw(**{"From": f"{lp}@kjede.no",
                                      "List-Unsubscribe": "<https://kjede.no/av>"}))
                 for lp in ("tilbud", "nyhet", "kampanje")]
        stats = aggregate(mixed, "domain", 30)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0]["count"], 3)

    def test_unsubscribe_link_survives_aggregation(self):
        stats = aggregate(self.messages, "address", 90)
        self.assertEqual(stats[0]["unsubscribe"], "https://butikken.no/av")

    def test_span_uses_dates_present(self):
        stats = aggregate(self.messages, "address", 90)
        self.assertEqual(stats[0]["first_seen"], "2026-08-10")

    def test_messages_without_dates_do_not_crash(self):
        stats = aggregate([parse_headers(raw(**{"From": "a@b.no"}))], "address", 7)
        self.assertEqual(stats[0]["first_seen"], "")

    def test_short_window_does_not_divide_by_zero(self):
        stats = aggregate(self.messages, "address", days=0)
        self.assertGreater(stats[0]["per_week"], 0)


class TestRendering(unittest.TestCase):
    def test_table_lists_sender_and_link(self):
        out = render_table(aggregate(self.msgs(), "address", 30), 30, 6)
        self.assertIn("tilbud@butikken.no", out)
        self.assertIn("https://butikken.no/av", out)

    def test_empty_result_says_so(self):
        self.assertIn("Fant ingen", render_table([], 30, 0))

    def test_markdown_is_a_table(self):
        out = render_markdown(aggregate(self.msgs(), "address", 30), 30, 6)
        self.assertIn("| Avsender |", out)
        self.assertIn("[avmeld](https://butikken.no/av)", out)

    def msgs(self):
        return [parse_headers(NEWSLETTER) for _ in range(6)]


if __name__ == "__main__":
    unittest.main(verbosity=2)
