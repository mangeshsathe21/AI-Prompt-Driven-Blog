"""
GreenTalk — Audit Log Middleware
==================================
Lightweight middleware that tags each request with the resolved user
so audit log entries can always capture the actor.

Does NOT log every request — only logs actions explicitly via log_action().
"""

import logging

logger = logging.getLogger(__name__)


class AuditLogMiddleware:
    """
    Attaches request to thread-local for use in non-view contexts
    (e.g., signals, model save hooks).
    Currently a lightweight pass-through — extend if needed.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response
