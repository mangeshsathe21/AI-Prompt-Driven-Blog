"""
GreenTalk — Custom Pagination Classes
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """
    Default pagination: 12 items per page.
    Supports ?page=N and ?page_size=N (max 100).
    Response includes count, next, previous, and results.
    """
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            "count":    self.page.paginator.count,
            "next":     self.get_next_link(),
            "previous": self.get_previous_link(),
            "total_pages": self.page.paginator.num_pages,
            "current_page": self.page.number,
            "results":  data,
        })


class LargeResultsPagination(PageNumberPagination):
    """For admin list views that may need more items (e.g., audit logs)."""
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200
