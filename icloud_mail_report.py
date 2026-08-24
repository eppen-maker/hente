#!/usr/bin/env python3
"""Rangerer avsenderne som sender mest reklame til en iCloud-postkasse.

Leser KUN meldingshoder over IMAP - aldri innhold, aldri vedlegg - teller opp
per avsender og sorterer etter hvor ofte de sender. Bruker BODY.PEEK, så
ingenting blir markert som lest.

Passordet er et app-spesifikt passord fra account.apple.com. Det leses fra
macOS Keychain eller en miljovariabel, og skrives aldri til disk.
"""

from __future__ import annotations

import argparse
import email.utils
import imaplib
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.header import decode_header, make_header
from email.parser import BytesHeaderParser

IMAP_HOST = "imap.mail.me.com"
IMAP_PORT = 993
KEYCHAIN_SERVICE = "icloud-mail-agent"
FETCH_BATCH = 200

WANTED_HEADERS = (
    "From",
    "Date",
    "Subject",
    "List-Unsubscribe",
    "List-Id",
    "Precedence",
    "Auto-Submitted",
)

# Lokaldeler som nesten alltid betyr utsending fra et system, ikke et menneske.
BULK_LOCALPART = re.compile(
    r"^(no-?reply|donotreply|ikke-?svar|newsletter|nyhetsbrev|news|marketing|"
    r"markedsforing|kampanje|tilbud|offer|offers|deal|deals|promo|mailer|"
    r"mailing|reply|notification|notifications|updates|hello|info)\b",
    re.IGNORECASE,
)


class MailError(RuntimeError):
    """Feil vi kan vise til brukeren uten stacktrace."""


# --------------------------------------------------------------------------
# Innlogging
# --------------------------------------------------------------------------


def read_password(user: str, use_keychain: bool) -> str:
    """Henter app-spesifikt passord fra Keychain, ellers fra miljovariabel."""
    env = os.environ.get("ICLOUD_APP_PASSWORD")
    if env:
        return env.strip()

    if use_keychain:
        try:
            out = subprocess.run(
                ["security", "find-generic-password",
                 "-a", user, "-s", KEYCHAIN_SERVICE, "-w"],
                capture_output=True, text=True, check=True,
            )
            return out.stdout.strip()
        except FileNotFoundError:
            pass  # ikke macOS
        except subprocess.CalledProcessError:
            raise MailError(
                f"Fant ikke passord i Keychain for {user}.\n"
                f"Legg det inn med:\n"
                f'  security add-generic-password -a "{user}" '
                f'-s "{KEYCHAIN_SERVICE}" -w'
            )

    raise MailError(
        "Mangler app-spesifikt passord. Sett ICLOUD_APP_PASSWORD, eller legg "
        "det i Keychain (se --help)."
    )


def connect(user: str, password: str, folder: str) -> imaplib.IMAP4_SSL:
    conn = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    try:
        conn.login(user, password)
    except imaplib.IMAP4.error as exc:
        raise MailError(
            f"Innlogging avvist ({exc}). Sjekk at du bruker et app-spesifikt "
            f"passord, ikke Apple ID-passordet ditt. Har kontoen din et gammelt "
            f"@me.com-brukernavn, prov brukernavnet uten domenet."
        ) from exc

    typ, _ = conn.select(folder, readonly=True)
    if typ != "OK":
        conn.logout()
        raise MailError(f"Fant ikke mappen {folder!r}.")
    return conn


# --------------------------------------------------------------------------
# Henting og parsing
# --------------------------------------------------------------------------


def fetch_headers(conn: imaplib.IMAP4_SSL, since: datetime) -> list[dict]:
    """Henter hoder for alle meldinger mottatt etter `since`."""
    datestr = since.strftime("%d-%b-%Y")
    typ, data = conn.uid("SEARCH", None, "SINCE", datestr)
    if typ != "OK":
        raise MailError("IMAP-sok feilet.")

    uids = data[0].split() if data and data[0] else []
    fields = " ".join(WANTED_HEADERS)
    spec = f"(BODY.PEEK[HEADER.FIELDS ({fields})])"

    messages = []
    for i in range(0, len(uids), FETCH_BATCH):
        batch = b",".join(uids[i:i + FETCH_BATCH])
        typ, data = conn.uid("FETCH", batch.decode(), spec)
        if typ != "OK":
            raise MailError("IMAP-henting feilet.")
        for item in data:
            if isinstance(item, tuple) and len(item) > 1:
                messages.append(parse_headers(item[1]))
    return [m for m in messages if m]


def _decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value))).strip()
    except Exception:
        return value.strip()


def parse_headers(raw: bytes) -> dict | None:
    """Gjor en rå hodeblokk om til feltene vi rangerer på."""
    msg = BytesHeaderParser().parsebytes(raw)

    name, addr = email.utils.parseaddr(_decode(msg.get("From")))
    addr = addr.lower().strip()
    if "@" not in addr:
        return None

    when = None
    if msg.get("Date"):
        try:
            when = email.utils.parsedate_to_datetime(msg["Date"])
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            when = None

    return {
        "address": addr,
        "domain": addr.rsplit("@", 1)[1],
        "name": name or "",
        "subject": _decode(msg.get("Subject")),
        "date": when,
        "unsubscribe": pick_unsubscribe(msg.get("List-Unsubscribe")),
        "has_list_unsubscribe": bool(msg.get("List-Unsubscribe")),
        "list_id": _decode(msg.get("List-Id")),
        "precedence": (msg.get("Precedence") or "").strip().lower(),
        "auto_submitted": (msg.get("Auto-Submitted") or "").strip().lower(),
    }


def pick_unsubscribe(value: str | None) -> str:
    """Plukker avmeldingslenka - foretrekker https framfor mailto."""
    if not value:
        return ""
    links = re.findall(r"<([^>]+)>", value) or [value.strip()]
    for link in links:
        if link.lower().startswith("http"):
            return link
    return links[0]


# --------------------------------------------------------------------------
# Klassifisering og opptelling
# --------------------------------------------------------------------------


def marketing_reasons(msg: dict) -> list[str]:
    """Hvorfor vi tror dette er masseutsending. Tom liste = vanlig e-post."""
    reasons = []
    if msg["has_list_unsubscribe"]:
        reasons.append("avmeldingslenke")
    if msg["list_id"]:
        reasons.append("mailingliste")
    if msg["precedence"] in {"bulk", "list", "junk"}:
        reasons.append(f"precedence:{msg['precedence']}")
    if msg["auto_submitted"] and msg["auto_submitted"] != "no":
        reasons.append("auto-generert")
    if BULK_LOCALPART.match(msg["address"].split("@", 1)[0]):
        reasons.append("systemavsender")
    return reasons


def aggregate(messages: list[dict], key: str, days: int) -> list[dict]:
    """Grupperer meldinger per avsender og regner ut frekvens."""
    groups: dict[str, list[dict]] = defaultdict(list)
    for msg in messages:
        groups[msg[key]].append(msg)

    weeks = max(days / 7, 1 / 7)
    stats = []
    for sender, group in groups.items():
        reasons: set[str] = set()
        for msg in group:
            reasons.update(marketing_reasons(msg))

        dated = sorted(m["date"] for m in group if m["date"])
        unsub = next((m["unsubscribe"] for m in group if m["unsubscribe"]), "")
        name = next((m["name"] for m in group if m["name"]), "")

        stats.append({
            "sender": sender,
            "name": name,
            "count": len(group),
            "per_week": round(len(group) / weeks, 1),
            "marketing": bool(reasons),
            "reasons": sorted(reasons),
            "unsubscribe": unsub,
            "first_seen": dated[0].date().isoformat() if dated else "",
            "last_seen": dated[-1].date().isoformat() if dated else "",
            "latest_subject": max(
                group, key=lambda m: m["date"] or datetime.min.replace(
                    tzinfo=timezone.utc))["subject"],
        })

    stats.sort(key=lambda s: (-s["count"], s["sender"]))
    return stats


# --------------------------------------------------------------------------
# Utskrift
# --------------------------------------------------------------------------


def render_table(stats: list[dict], days: int, total: int) -> str:
    if not stats:
        return "Fant ingen masseutsendelser i perioden."

    width = max(len(s["sender"]) for s in stats)
    width = min(max(width, 20), 45)

    lines = [
        f"Reklameavsendere siste {days} dager "
        f"({len(stats)} avsendere, {total} meldinger)",
        "",
        f"{'AVSENDER'.ljust(width)}  {'ANT':>4}  {'PR UKE':>7}  SISTE EMNE",
        f"{'-' * width}  {'-' * 4}  {'-' * 7}  {'-' * 40}",
    ]
    for s in stats:
        sender = s["sender"][:width].ljust(width)
        subject = s["latest_subject"][:40]
        lines.append(f"{sender}  {s['count']:>4}  {s['per_week']:>7}  {subject}")

    lines.append("")
    lines.append("Avmeldingslenker:")
    for s in stats:
        if s["unsubscribe"]:
            lines.append(f"  {s['sender']}\n    {s['unsubscribe']}")
    return "\n".join(lines)


def render_markdown(stats: list[dict], days: int, total: int) -> str:
    lines = [
        f"# Reklameavsendere - siste {days} dager",
        "",
        f"{len(stats)} avsendere, {total} meldinger totalt.",
        "",
        "| Avsender | Antall | Pr uke | Signaler | Avmelding |",
        "| --- | ---: | ---: | --- | --- |",
    ]
    for s in stats:
        unsub = f"[avmeld]({s['unsubscribe']})" if s["unsubscribe"] else "-"
        lines.append(
            f"| {s['sender']} | {s['count']} | {s['per_week']} | "
            f"{', '.join(s['reasons']) or '-'} | {unsub} |"
        )
    return "\n".join(lines)


# --------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Rangerer avsendere som sender ofte til iCloud-innboksen.",
        epilog=(
            "Passord: lagres som app-spesifikt passord fra account.apple.com.\n"
            '  security add-generic-password -a "deg@me.com" '
            f'-s "{KEYCHAIN_SERVICE}" -w\n'
            "eller sett ICLOUD_APP_PASSWORD i miljoet."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--user", default=os.environ.get("ICLOUD_USER"),
                   help="iCloud-adressen din, f.eks. deg@me.com")
    p.add_argument("--days", type=int, default=90,
                   help="hvor langt tilbake vi ser (standard: 90)")
    p.add_argument("--folder", default="INBOX", help="IMAP-mappe")
    p.add_argument("--by", choices=("address", "domain"), default="address",
                   help="grupper per adresse eller per domene")
    p.add_argument("--min-count", type=int, default=2,
                   help="skjul avsendere med faerre meldinger (standard: 2)")
    p.add_argument("--all", action="store_true",
                   help="ta med vanlig e-post, ikke bare masseutsending")
    p.add_argument("--format", choices=("table", "json", "markdown"),
                   default="table")
    p.add_argument("--no-keychain", action="store_true",
                   help="ikke sporr macOS Keychain om passordet")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.user:
        print("Mangler --user (eller ICLOUD_USER).", file=sys.stderr)
        return 2

    since = datetime.now(timezone.utc) - timedelta(days=args.days)

    try:
        password = read_password(args.user, not args.no_keychain)
        conn = connect(args.user, password, args.folder)
        try:
            messages = fetch_headers(conn, since)
        finally:
            conn.close()
            conn.logout()
    except MailError as exc:
        print(f"Feil: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Fikk ikke kontakt med {IMAP_HOST}: {exc}", file=sys.stderr)
        return 1

    stats = aggregate(messages, args.by, args.days)
    if not args.all:
        stats = [s for s in stats if s["marketing"]]
    stats = [s for s in stats if s["count"] >= args.min_count]

    if args.format == "json":
        print(json.dumps(stats, indent=2, ensure_ascii=False))
    elif args.format == "markdown":
        print(render_markdown(stats, args.days, len(messages)))
    else:
        print(render_table(stats, args.days, len(messages)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
