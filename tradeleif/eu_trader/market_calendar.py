"""Børskalender i ren Python (ingen pandas/DLL-er). XNYS, XOSL, XETR med helligdager og halvdager."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


def _easter(y: int) -> date:
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mo = (h + l - 7 * m + 114) // 31
    return date(y, mo, (h + l - 7 * m + 114) % 31 + 1)


def _nth_weekday(y, m, wd, n):  # n>=1, eller -1 = siste
    if n > 0:
        d = date(y, m, 1)
        d += timedelta(days=(wd - d.weekday()) % 7)
        return d + timedelta(weeks=n - 1)
    d = date(y, m + 1, 1) - timedelta(days=1) if m < 12 else date(y, 12, 31)
    return d - timedelta(days=(d.weekday() - wd) % 7)


def _observed(d: date) -> date:  # US: lørdag -> fredag, søndag -> mandag
    return d - timedelta(days=1) if d.weekday() == 5 else d + timedelta(days=1) if d.weekday() == 6 else d


def _xnys(y):
    e = _easter(y)
    hol = {
        _nth_weekday(y, 1, 0, 3), _nth_weekday(y, 2, 0, 3), e - timedelta(days=2), _nth_weekday(y, 5, 0, -1),
        _nth_weekday(y, 9, 0, 1), _nth_weekday(y, 11, 3, 4),
        _observed(date(y, 7, 4)), _observed(date(y, 12, 25)),
    }
    if y >= 2022:
        hol.add(_observed(date(y, 6, 19)))
    nyd = date(y, 1, 1)
    if nyd.weekday() != 5:  # NYSE flytter ikke nyttårsdag til fredag før
        hol.add(_observed(nyd))
    early = {_nth_weekday(y, 11, 3, 4) + timedelta(days=1)}
    for d in (date(y, 7, 3), date(y, 12, 24)):
        if d.weekday() < 5 and d not in hol:
            early.add(d)
    return hol, early, time(9, 30), time(16, 0), time(13, 0)


def _xosl(y):
    e = _easter(y)
    hol = {date(y, 1, 1), e - timedelta(days=3), e - timedelta(days=2), e + timedelta(days=1), date(y, 5, 1),
           date(y, 5, 17), e + timedelta(days=39), e + timedelta(days=50), date(y, 12, 24), date(y, 12, 25),
           date(y, 12, 26), date(y, 12, 31)}
    return hol, {e - timedelta(days=4)}, time(9, 0), time(16, 20), time(13, 0)  # halvdag dagen før skjærtorsdag


def _xetr(y):
    e = _easter(y)
    hol = {date(y, 1, 1), e - timedelta(days=2), e + timedelta(days=1), date(y, 5, 1), date(y, 12, 24),
           date(y, 12, 25), date(y, 12, 26), date(y, 12, 31)}
    last = date(y, 12, 30)
    while last.weekday() >= 5:
        last -= timedelta(days=1)
    return hol, {last}, time(9, 0), time(17, 30), time(14, 0)  # siste handelsdag før nyttår stenger 14:00


RULES = {"XNYS": (_xnys, "America/New_York"), "XOSL": (_xosl, "Europe/Oslo"), "XETR": (_xetr, "Europe/Berlin")}


class MarketCalendar:
    def __init__(self, code: str):
        if code not in RULES:
            raise ValueError(f"Ukjent kalender {code}. Støttet: {', '.join(RULES)}")
        self.code = code
        self._rule, tzname = RULES[code]
        self.tz = ZoneInfo(tzname)
        self._cache = {}

    def _year(self, y):
        if y not in self._cache:
            self._cache[y] = self._rule(y)
        return self._cache[y]

    def session_for(self, d: date):
        hol, early, o, c, ec = self._year(d.year)
        if d.weekday() >= 5 or d in hol:
            return None
        close = ec if d in early and ec else c
        return (datetime.combine(d, o, self.tz).astimezone(timezone.utc),
                datetime.combine(d, close, self.tz).astimezone(timezone.utc))

    def session(self, now: datetime):
        return self.session_for(now.astimezone(self.tz).date())

    def is_open(self, now: datetime) -> bool:
        s = self.session(now)
        return bool(s and s[0] <= now < s[1])

    def minutes_to_close(self, now: datetime) -> float:
        s = self.session(now)
        return (s[1] - now).total_seconds() / 60 if s else -1

    def next_open(self, now: datetime) -> datetime:
        d = now.astimezone(self.tz).date()
        for i in range(0, 15):
            s = self.session_for(d + timedelta(days=i))
            if s and s[0] > now:
                return s[0]
        raise RuntimeError("Fant ingen åpning de neste 15 dagene")

    def status_text(self, now: datetime) -> str:
        if self.is_open(now):
            return f"{self.code} åpen, stenger om {self.minutes_to_close(now):.0f} min"
        return f"{self.code} stengt, neste åpning {self.next_open(now).astimezone(self.tz):%Y-%m-%d %H:%M %Z}"


def next_slot(now: datetime, interval_min: int, offset_s: int = 20) -> datetime:
    base = now.replace(second=0, microsecond=0)
    m = (base.minute // interval_min + 1) * interval_min
    return base.replace(minute=0) + timedelta(minutes=m, seconds=offset_s)


def slot_id(now: datetime, interval_min: int) -> str:
    n = now.astimezone(timezone.utc)
    return f"{n:%Y%m%d}-{n.hour:02d}{(n.minute // interval_min) * interval_min:02d}"
