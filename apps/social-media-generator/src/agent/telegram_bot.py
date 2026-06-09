"""Telegram bot for human-in-the-loop review of generated social media drafts.

Flow:
  1. Run `uv run agent generate` as usual — graph pauses at human_review_node.
  2. Run `uv run telegram-bot` — bot detects pending interrupted threads,
     sends each draft to TELEGRAM_CHAT_ID with inline keyboard.
  3. Tap ✅ Approve / 🔁 Regenerate / ✏️ Edit in Telegram.
  4. Graph resumes and saves output.

For edit: tap ✏️ Edit, then reply with the edited post text.

Environment variables required:
  TELEGRAM_BOT_TOKEN  — from @BotFather
  TELEGRAM_CHAT_ID    — your personal chat ID (or group/channel ID)
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.store.memory import InMemoryStore
from langgraph.types import Command
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from agent.config import SEGMENTS
from agent.graph import build_graph
from agent.history import seed_store_from_disk

load_dotenv()

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"
DB_PATH = OUTPUT_DIR / "checkpoints.db"

_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
_CHAT_ID = int(os.environ["TELEGRAM_CHAT_ID"])

_MAX_MSG_LEN = 4000

_pending_edits: dict[int, str] = {}


def _make_thread_id(segment: str) -> str:
    """Stable thread ID per segment per day — must match cli.py."""
    from datetime import date

    return f"{segment}-{date.today().isoformat()}"


def _build_graph(checkpointer: SqliteSaver, store: InMemoryStore):
    return build_graph().compile(
        checkpointer=checkpointer,
        store=store,
        name="DigiArt Post Generator",
    )


def _seed_store(store: InMemoryStore) -> None:
    for segment in SEGMENTS:
        seed_store_from_disk(store, segment)


def _keyboard(thread_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Approve", callback_data=f"approve:{thread_id}"),
            InlineKeyboardButton("🔁 Regenerate", callback_data=f"regen:{thread_id}"),
            InlineKeyboardButton("✏️ Edit", callback_data=f"edit:{thread_id}"),
        ]
    ])


def _format_draft(payload: dict) -> str:
    segment = payload.get("segment", "?")
    theme = payload.get("theme", "?")
    draft = payload.get("draft", "")
    text = (
        f"<b>Segment:</b> {segment}\n"
        f"<b>Theme:</b> {theme}\n\n"
        f"{draft}"
    )
    return text[:_MAX_MSG_LEN]


async def notify_pending(app: Application) -> None:
    """Send all pending interrupted drafts to Telegram."""
    if not DB_PATH.exists():
        await app.bot.send_message(
            _CHAT_ID,
            "No checkpoints found. Run <code>uv run agent generate</code> first.",
            parse_mode=ParseMode.HTML,
        )
        return

    with SqliteSaver.from_conn_string(str(DB_PATH)) as checkpointer:
        store = InMemoryStore()
        _seed_store(store)
        graph = _build_graph(checkpointer, store)

        sent = 0
        for segment in SEGMENTS:
            thread_id = _make_thread_id(segment)
            config = {"configurable": {"thread_id": thread_id}}
            state = graph.get_state(config)
            if not (state and state.tasks):
                continue
            for task in state.tasks:
                if not (hasattr(task, "interrupts") and task.interrupts):
                    continue
                for intr in task.interrupts:
                    payload = intr.value
                    await app.bot.send_message(
                        _CHAT_ID,
                        _format_draft(payload),
                        parse_mode=ParseMode.HTML,
                        reply_markup=_keyboard(thread_id),
                    )
                    sent += 1

    if sent == 0:
        await app.bot.send_message(_CHAT_ID, "No pending drafts to review.")


async def _resume_thread(
    thread_id: str,
    resume_value: dict,
) -> dict | None:
    """Resume a paused graph thread and return the new interrupt payload if any."""
    with SqliteSaver.from_conn_string(str(DB_PATH)) as checkpointer:
        store = InMemoryStore()
        _seed_store(store)
        graph = _build_graph(checkpointer, store)
        config = {"configurable": {"thread_id": thread_id}}
        result = graph.invoke(Command(resume=resume_value), config)

    if "__interrupt__" in result:
        return result["__interrupt__"][0].value
    return None


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline keyboard button taps."""
    query = update.callback_query
    await query.answer()

    data: str = query.data
    action, thread_id = data.split(":", 1)

    if action == "approve":
        await query.edit_message_text(
            f"⏳ Approving <code>{thread_id}</code>…",
            parse_mode=ParseMode.HTML,
        )
        new_payload = await asyncio.to_thread(
            lambda: _resume_thread_sync(thread_id, {"action": "approve"})
        )
        if new_payload:
            await context.bot.send_message(
                _CHAT_ID,
                "♻️ Regenerated draft:\n\n" + _format_draft(new_payload),
                parse_mode=ParseMode.HTML,
                reply_markup=_keyboard(thread_id),
            )
        else:
            await query.edit_message_text(
                f"✅ Approved and saved — <code>{thread_id}</code>",
                parse_mode=ParseMode.HTML,
            )

    elif action == "regen":
        await query.edit_message_text(
            f"⏳ Regenerating <code>{thread_id}</code>…",
            parse_mode=ParseMode.HTML,
        )
        new_payload = await asyncio.to_thread(
            lambda: _resume_thread_sync(thread_id, {"action": "regenerate"})
        )
        if new_payload:
            await context.bot.send_message(
                _CHAT_ID,
                "♻️ New draft:\n\n" + _format_draft(new_payload),
                parse_mode=ParseMode.HTML,
                reply_markup=_keyboard(thread_id),
            )
        else:
            await query.edit_message_text(
                f"✅ Done — <code>{thread_id}</code>",
                parse_mode=ParseMode.HTML,
            )

    elif action == "edit":
        _pending_edits[_CHAT_ID] = thread_id
        await query.edit_message_text(
            f"✏️ Reply with your edited post for <code>{thread_id}</code>.",
            parse_mode=ParseMode.HTML,
        )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle free-text replies used for the edit flow."""
    chat_id = update.effective_chat.id
    thread_id = _pending_edits.pop(chat_id, None)
    if thread_id is None:
        return

    text = update.message.text or ""
    await update.message.reply_text(
        f"⏳ Saving edited post for <code>{thread_id}</code>…",
        parse_mode=ParseMode.HTML,
    )
    new_payload = await asyncio.to_thread(
        lambda: _resume_thread_sync(thread_id, {"action": "edit", "text": text})
    )
    if new_payload:
        await context.bot.send_message(
            _CHAT_ID,
            "♻️ Regenerated after edit:\n\n" + _format_draft(new_payload),
            parse_mode=ParseMode.HTML,
            reply_markup=_keyboard(thread_id),
        )
    else:
        await update.message.reply_text(
            f"✅ Edited post saved — <code>{thread_id}</code>",
            parse_mode=ParseMode.HTML,
        )


def _resume_thread_sync(thread_id: str, resume_value: dict) -> dict | None:
    """Run _resume_thread synchronously (called via asyncio.to_thread)."""
    with SqliteSaver.from_conn_string(str(DB_PATH)) as checkpointer:
        store = InMemoryStore()
        _seed_store(store)
        graph = _build_graph(checkpointer, store)
        config = {"configurable": {"thread_id": thread_id}}
        result = graph.invoke(Command(resume=resume_value), config)

    if "__interrupt__" in result:
        return result["__interrupt__"][0].value
    return None


def main() -> None:
    """Start the Telegram bot."""
    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
        level=logging.INFO,
    )

    app = Application.builder().token(_BOT_TOKEN).build()
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    async def _on_startup(application: Application) -> None:
        await notify_pending(application)

    app.post_init = _on_startup

    logger.info("Starting Telegram HITL bot (polling)…")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
