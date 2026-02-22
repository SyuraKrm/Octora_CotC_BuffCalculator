from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
from core.build_data import build_data_main, detect_new_character_ids


JST = timezone(timedelta(hours=9))
WEEK_START_SHIFT = timedelta(days=3, hours=17)
STATE_FILE = Path("data/weekly_state.json")

def get_week_key(dt_utc: datetime) -> tuple[int, int]:
    """
    木曜17:00 JST を週の開始とする週キー
    """
    # UTC → JST
    dt_jst = dt_utc.astimezone(JST)

    # 17:00 JST を 0時扱いにする
    shifted = dt_jst - WEEK_START_SHIFT

    iso = shifted.isocalendar()
    return iso.year, iso.week

def load_last_success():
    if not STATE_FILE.exists():
        return None

    with STATE_FILE.open() as f:
        data = json.load(f)

    return datetime.fromisoformat(
        data["last_success_utc"].replace("Z", "+00:00")
    )

def save_success(dt: datetime):
    STATE_FILE.parent.mkdir(exist_ok=True)
    with STATE_FILE.open("w") as f:
        json.dump(
            {"last_success_utc": dt.strftime("%Y-%m-%dT%H:%M:%SZ")},
            f,
            indent=2,
        )

def main():
    now = datetime.now(timezone.utc)
    now_week = get_week_key(now)

    last = load_last_success()
    weekly_trigger = False

    if not last:
        weekly_trigger = True
    else:
        weekly_trigger = get_week_key(last) != now_week

    new_ids = detect_new_character_ids()
    latest_trigger = bool(new_ids)

    if not (weekly_trigger or latest_trigger):
        print("Skip: no weekly trigger and no new characters.")
        return

    print("Run job.")
    build_data_main()

    save_success(now)
    print("Weekly job completed.")


if __name__ == "__main__":
    main()
