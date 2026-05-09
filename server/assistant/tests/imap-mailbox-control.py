#!/usr/bin/env python3

import argparse
import imaplib
import json
import pathlib
import random
import ssl
import string
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser


ROOT = pathlib.Path(__file__).resolve().parents[3]
MAILBOX_PROFILES = ROOT / "server" / "data" / "mailbox-profiles.json"
RECON_FIXTURE = ROOT / "server" / "assistant" / "fixtures" / "reconciliation-clean.fixture.json"
NOOP_FIXTURE = ROOT / "server" / "assistant" / "fixtures" / "no-operation-clean.fixture.json"
SCENARIO_FIXTURE = ROOT / "server" / "assistant" / "fixtures" / "imap-real-3case.fixture.json"


def load_profile(profile_id: str | None):
    payload = json.loads(MAILBOX_PROFILES.read_text(encoding="utf-8-sig"))
    if not payload:
        raise RuntimeError("mailbox-profiles.json is empty")

    if profile_id:
        wanted = profile_id.strip().lower()
        for profile in payload:
          if str(profile.get("id", "")).strip().lower() == wanted:
            return profile

    return payload[0]


def connect(profile):
    host = profile["host"]
    port = int(profile["port"])
    protocol = str(profile.get("protocol") or "").strip().lower()
    ctx = ssl.create_default_context()

    if protocol in {"imaps", "ssl", "ssl-imap"} or port == 993:
        client = imaplib.IMAP4_SSL(host, port, ssl_context=ctx)
        return client, "ssl"

    client = imaplib.IMAP4(host, port)
    transport = "plain"
    try:
        client.starttls(ssl_context=ctx)
        transport = "starttls"
    except Exception:
        pass
    return client, transport


def build_email(message, folder_name, message_id):
    email_msg = EmailMessage()
    email_msg["From"] = message["from"]
    email_msg["To"] = "sistemas@joathilogistica.com"
    email_msg["Subject"] = message.get("subject", "")
    email_msg["Date"] = message["date"]
    email_msg["Message-ID"] = message_id
    email_msg["X-Joathi-Test-Folder"] = folder_name
    email_msg["X-Joathi-Test-Case"] = message.get("externalId", "")
    email_msg.set_content(message["bodyText"])
    return email_msg.as_bytes()


def extract_body_text(message_bytes):
    parsed = BytesParser(policy=policy.default).parsebytes(message_bytes)

    try:
        body_part = parsed.get_body(preferencelist=("plain",))
        if body_part is not None:
            content = body_part.get_content()
            if content:
                return content
    except Exception:
        pass

    try:
        if parsed.is_multipart():
            pieces = []
            for part in parsed.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        content = part.get_content()
                    except Exception:
                        content = ""
                    if content:
                        pieces.append(content)
            if pieces:
                return "\n".join(pieces)
        return parsed.get_content()
    except Exception:
        return ""


def unique_folder(prefix: str) -> str:
    stamp = ssl.RAND_bytes(4).hex()
    rand = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"{prefix}.{stamp}.{rand}"


def load_seed_scenario(scenario_file: str | None = None):
    if scenario_file:
        scenario_path = pathlib.Path(scenario_file)
        if not scenario_path.is_absolute():
            scenario_path = (ROOT / scenario_path).resolve()
        if not scenario_path.exists():
            raise RuntimeError(f"Scenario fixture not found: {scenario_path}")
        return json.loads(scenario_path.read_text(encoding="utf-8-sig"))

    recon = json.loads(RECON_FIXTURE.read_text(encoding="utf-8-sig"))
    noop = json.loads(NOOP_FIXTURE.read_text(encoding="utf-8-sig"))
    return {
        "scenarioId": "imap-controlled-regression-default",
        "messages": [
            recon["messages"][0],
            recon["messages"][1],
            noop["messages"][0],
        ],
    }


def seed(profile_id: str, folder_prefix: str, scenario_file: str | None = None):
    profile = load_profile(profile_id)
    scenario = load_seed_scenario(scenario_file)
    messages = scenario.get("messages", [])
    if not messages:
        raise RuntimeError("Scenario fixture does not contain messages")
    folder_name = unique_folder(folder_prefix)

    client, transport = connect(profile)
    client.login(profile["username"], profile["password"])
    try:
        try:
            client.create(folder_name)
        except Exception:
            pass

        for idx, message in enumerate(messages, start=1):
            message_id = f"<joathi-real-{folder_name.lower().replace('.', '-')}-{idx}-{ssl.RAND_bytes(8).hex()}@joathiva.local>"
            client.append(folder_name, None, None, build_email(message, folder_name, message_id))

        client.select(folder_name, readonly=True)
        typ, data = client.uid("SEARCH", None, "ALL")
        uids = []
        if typ == "OK" and data and data[0]:
            uids = data[0].decode().split()

        rows = []
        for message, uid in zip(messages, uids[-3:]):
            typ, msgdata = client.uid("FETCH", uid, "(RFC822)")
            raw = b""
            if typ == "OK":
                for item in msgdata:
                    if isinstance(item, tuple) and item[1]:
                        raw += item[1]

            preview = extract_body_text(raw)
            rows.append({
                "uid": uid,
                "caseId": message.get("externalId", ""),
                "from": message.get("from", ""),
                "subject": message.get("subject", ""),
                "date": message.get("date", ""),
                "bodyText": preview if preview else message.get("bodyText", ""),
                "preview": (preview[:400] if preview else message.get("bodyText", "")[:400]),
            })

        return {
            "ok": True,
            "scenarioId": scenario.get("scenarioId", ""),
            "profileId": profile["id"],
            "folder": folder_name,
            "transport": transport,
            "messageCount": len(rows),
            "messages": rows,
        }
    finally:
        try:
            client.logout()
        except Exception:
            pass


def cleanup(profile_id: str, folder_name: str):
    profile = load_profile(profile_id)
    client, transport = connect(profile)
    client.login(profile["username"], profile["password"])
    try:
        try:
            client.select(folder_name, readonly=False)
        except Exception:
            pass
        try:
            client.close()
        except Exception:
            pass

        try:
            client.delete(folder_name)
            deleted = True
            reason = ""
        except Exception as exc:
            deleted = False
            reason = str(exc)

        return {
            "ok": True,
            "profileId": profile["id"],
            "folder": folder_name,
            "transport": transport,
            "deleted": deleted,
            "reason": reason,
        }
    finally:
        try:
            client.logout()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    seed_parser = sub.add_parser("seed")
    seed_parser.add_argument("--profile-id", default="demo")
    seed_parser.add_argument("--folder-prefix", default="INBOX.JoathiVA.Pilot")
    seed_parser.add_argument("--scenario-file", default="")

    cleanup_parser = sub.add_parser("cleanup")
    cleanup_parser.add_argument("--profile-id", default="demo")
    cleanup_parser.add_argument("--folder", required=True)

    args = parser.parse_args()
    if args.command == "seed":
        result = seed(args.profile_id, args.folder_prefix, args.scenario_file or None)
    else:
        result = cleanup(args.profile_id, args.folder)

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
