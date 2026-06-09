#!/usr/bin/env python3

import json
import imaplib
import mimetypes
import ssl
import sys
import traceback
import uuid
from pathlib import Path
from email.message import EmailMessage
from email.header import Header


def normalize_body(text: str) -> str:
    body = (text or "").replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\r\n")
    if not body.endswith("\r\n"):
        body += "\r\n"
    return body


def load_attachment(attachment):
    raw_path = str(attachment.get("path") or attachment.get("filePath") or attachment.get("localPath") or "").strip()
    if not raw_path:
        return None, "missing path"

    path = Path(raw_path)
    if not path.exists() or not path.is_file():
        return None, f"missing file: {raw_path}"

    data = path.read_bytes()
    mime_type = str(attachment.get("mimeType") or attachment.get("contentType") or "").strip()
    if not mime_type:
        mime_type, _ = mimetypes.guess_type(str(path))
    mime_type = mime_type or "application/octet-stream"
    if "/" in mime_type:
        maintype, subtype = mime_type.split("/", 1)
    else:
        maintype, subtype = "application", "octet-stream"

    return {
        "name": str(attachment.get("name") or attachment.get("fileName") or path.name),
        "path": str(path),
        "maintype": maintype,
        "subtype": subtype,
        "data": data,
    }, ""


def build_message(payload):
    profile = payload["profile"]
    draft = payload["draft"]

    to_header = ", ".join([item.strip() for item in draft.get("to", []) if str(item).strip()])
    cc_header = ", ".join([item.strip() for item in draft.get("cc", []) if str(item).strip()])
    subject = Header(str(draft.get("subject", "")), "utf-8").encode()
    message_id = str(draft.get("messageId") or f"<{uuid.uuid4().hex}@joathiva.local>")
    body = normalize_body(str(draft.get("bodyDraft", "")))
    attachments = []
    attachment_warnings = []
    for item in draft.get("attachments", []) or []:
        attachment, warning = load_attachment(item)
        if attachment:
            attachments.append(attachment)
        elif warning:
            attachment_warnings.append(warning)

    message = EmailMessage()
    message["From"] = profile["username"]
    if to_header:
        message["To"] = to_header
    if cc_header:
        message["Cc"] = cc_header
    message["Subject"] = subject
    message["Message-ID"] = message_id
    message["X-Joathi-Assistant-Draft-Id"] = str(draft.get("id", ""))
    message["X-Joathi-Source-Email-External-Id"] = str(draft.get("sourceEmailExternalId", ""))

    if draft.get("sourceIntakeId"):
        message["X-Joathi-Source-Intake-Id"] = str(draft.get("sourceIntakeId"))
    if draft.get("customerId"):
        message["X-Joathi-Customer-Id"] = str(draft.get("customerId"))
    if draft.get("operationId"):
        message["X-Joathi-Operation-Id"] = str(draft.get("operationId"))
    if draft.get("taskId"):
        message["X-Joathi-Task-Id"] = str(draft.get("taskId"))
    if draft.get("activityId"):
        message["X-Joathi-Activity-Id"] = str(draft.get("activityId"))

    message.set_content(body)

    if attachments:
        text_part = message
        message = EmailMessage()
        for key in ("From", "To", "Cc", "Subject", "Message-ID", "X-Joathi-Assistant-Draft-Id", "X-Joathi-Source-Email-External-Id", "X-Joathi-Source-Intake-Id", "X-Joathi-Customer-Id", "X-Joathi-Operation-Id", "X-Joathi-Task-Id", "X-Joathi-Activity-Id"):
            if key in text_part:
                message[key] = text_part[key]
        message.set_content(body)
        for attachment in attachments:
            message.add_attachment(
                attachment["data"],
                maintype=attachment["maintype"],
                subtype=attachment["subtype"],
                filename=attachment["name"],
            )

    return message.as_bytes(), message_id, attachments, attachment_warnings


def connect_client(profile):
    host = profile["host"]
    port = int(profile["port"])
    protocol = str(profile.get("protocol") or "").strip().lower()
    context = ssl.create_default_context()

    if protocol in {"imaps", "ssl", "ssl-imap"} or port == 993:
        return imaplib.IMAP4_SSL(host, port, ssl_context=context), "ssl"

    client = imaplib.IMAP4(host, port)
    try:
        client.starttls(ssl_context=context)
        return client, "starttls"
    except Exception:
        return client, "plain"


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "exported": False, "reason": "missing payload path"}))
        return 1

    payload_path = sys.argv[1]
    with open(payload_path, "r", encoding="utf-8-sig") as handle:
        payload = json.load(handle)

    profile = payload["profile"]
    draft = payload["draft"]
    folder = payload.get("folder") or profile.get("draftFolder") or "Drafts"

    client = None
    try:
        client, transport = connect_client(profile)
        client.login(profile["username"], profile["password"])

        message_bytes, message_id, attachments, attachment_warnings = build_message(payload)
        append_result = client.append(folder, None, None, message_bytes)
        if not append_result or append_result[0] != "OK":
            raise RuntimeError(f"append failed: {append_result!r}")

        search_uids = []
        try:
            typ, data = client.select(folder, readonly=True)
            if typ == "OK":
                typ, data = client.uid("SEARCH", None, "HEADER", "X-Joathi-Assistant-Draft-Id", draft.get("id", ""))
                if typ == "OK" and data and data[0]:
                    search_uids = data[0].decode().split()
                if not search_uids:
                    typ, data = client.uid("SEARCH", None, "HEADER", "Message-ID", message_id)
                    if typ == "OK" and data and data[0]:
                        search_uids = data[0].decode().split()
        except Exception:
            search_uids = []

        uid = search_uids[0] if search_uids else ""
        result = {
            "ok": True,
            "exported": True,
            "providerKind": "imap",
            "draftId": message_id,
            "messageId": message_id,
            "mailboxUid": uid,
            "folder": folder,
            "verified": bool(uid),
            "verificationUid": uid,
            "verificationSummary": {"folder": folder, "uid": uid},
            "reason": "",
            "attachmentCount": len(attachments),
            "attachmentWarnings": attachment_warnings,
            "metadata": {
                "host": profile["host"],
                "port": int(profile["port"]),
                "username": profile["username"],
                "folder": folder,
                "messageId": message_id,
                "verificationUid": uid,
                "verified": bool(uid),
                "transport": transport,
                "attachmentCount": len(attachments),
            },
        }
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        result = {
            "ok": False,
            "exported": False,
            "providerKind": "imap",
            "draftId": "",
            "messageId": "",
            "mailboxUid": "",
            "folder": folder,
            "verified": False,
            "verificationUid": "",
            "verificationSummary": {},
            "reason": str(exc),
            "attachmentCount": 0,
            "attachmentWarnings": [],
            "trace": traceback.format_exc(),
            "metadata": {
                "host": profile["host"],
                "port": int(profile["port"]),
                "username": profile["username"],
                "folder": folder,
                "transport": "unknown",
            },
        }
        print(json.dumps(result, ensure_ascii=False))
        return 1
    finally:
        try:
            if client:
                client.logout()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
