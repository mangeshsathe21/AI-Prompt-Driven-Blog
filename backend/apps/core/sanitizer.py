"""
GreenTalk — HTML Sanitizer
===========================
Uses nh3 (Rust-backed, MIT license) to strip dangerous HTML from
rich-text fields (post content, comment content) before storage.

SECURITY: This is the server-side XSS defence. Even if the frontend
sends malicious HTML, it is stripped here before hitting the database
or being served to other users.

nh3 is preferred over bleach (bleach is unmaintained as of 2023).
"""

import nh3

# ---------------------------------------------------------------------------
# Allowed HTML tags for blog post content (rich text editor output)
# ---------------------------------------------------------------------------
POST_ALLOWED_TAGS = {
    "a", "abbr", "b", "blockquote", "br", "caption", "code",
    "col", "colgroup", "dd", "del", "details", "div", "dl",
    "dt", "em", "figcaption", "figure", "h1", "h2", "h3",
    "h4", "h5", "h6", "hr", "i", "img", "ins", "kbd", "li",
    "mark", "ol", "p", "pre", "q", "s", "small", "span",
    "strong", "sub", "summary", "sup", "table", "tbody",
    "td", "th", "thead", "tfoot", "tr", "u", "ul",
}

# Attributes permitted per tag for posts
POST_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target", "rel"},
    "img": {"src", "alt", "title", "width", "height"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan", "scope"},
    "col": {"span"},
    "colgroup": {"span"},
    "blockquote": {"cite"},
    "del": {"datetime"},
    "ins": {"datetime"},
    "q": {"cite"},
}

# ---------------------------------------------------------------------------
# Allowed HTML tags for comments (simpler — no images, no tables)
# ---------------------------------------------------------------------------
COMMENT_ALLOWED_TAGS = {
    "a", "b", "blockquote", "br", "code", "em", "i",
    "li", "ol", "p", "pre", "s", "strong", "u", "ul",
}

COMMENT_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "rel"},
}


def sanitize_post_content(html: str) -> str:
    """
    Strip dangerous HTML from blog post content.
    Preserves formatting tags defined in POST_ALLOWED_TAGS.

    SECURITY NOTE: Always call this before saving post.content to the DB.
    """
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=POST_ALLOWED_TAGS,
        attributes=POST_ALLOWED_ATTRIBUTES,
        link_rel="noopener noreferrer",  # forces safe rel on all links
        strip_comments=True,
    )


def sanitize_comment_content(html: str) -> str:
    """
    Strip dangerous HTML from comment content.
    More restrictive than post sanitization — no images or tables.

    SECURITY NOTE: Always call this before saving comment.content to the DB.
    """
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=COMMENT_ALLOWED_TAGS,
        attributes=COMMENT_ALLOWED_ATTRIBUTES,
        link_rel="noopener noreferrer",
        strip_comments=True,
    )


def strip_all_html(text: str) -> str:
    """
    Remove ALL HTML tags — for plain-text fields (excerpts, notifications).
    """
    if not text:
        return ""
    return nh3.clean(text, tags=set(), attributes={}, strip_comments=True)
