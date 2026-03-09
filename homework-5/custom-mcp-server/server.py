from pathlib import Path
from fastmcp import FastMCP

mcp = FastMCP("lorem-mcp", "0.1.0")

LOREM_FILE = Path(__file__).parent / "lorem-ipsum.md"


def get_words(word_count: int = 30) -> str:
    """Read lorem-ipsum.md and return exactly word_count words."""
    content = LOREM_FILE.read_text()
    words = content.split()
    return " ".join(words[:word_count])


@mcp.resource("lorem://content/default")
def lorem_default() -> str:
    """Static resource: returns 30 words of lorem ipsum (discoverable in resource list)."""
    return get_words(30)


@mcp.resource("lorem://content/{word_count}")
def lorem_resource(word_count: str) -> str:
    """Resource template: returns word-limited lorem ipsum content."""
    return get_words(int(word_count))


@mcp.tool
def read(word_count: int = 30) -> str:
    """Tool: returns word-limited lorem ipsum content.

    Args:
        word_count: Number of words to return (default: 30)
    """
    return get_words(word_count)


if __name__ == "__main__":
    mcp.run()
